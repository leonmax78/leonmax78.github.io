"""Refresh verified secret-realm spawns from the 28000 client MPC only."""
import csv
import json
import struct
from collections import Counter
from pathlib import Path
from build_data import write_data_bundle_js, write_runtime_data_js

ROOT = Path(__file__).resolve().parents[1]
def load(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text('utf-8'))
def save(name, value):
    (ROOT / 'data' / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

data = (ROOT / 'outputs/1029-client/DATA1/map/stage300.mpc').read_bytes()
assert data[:4] == b'MAP\0'
start = struct.unpack_from('<I', data, 24)[0] + 2
end = struct.unpack_from('<I', data, 32)[0]
monsters = {int(m['ID']): m for m in load('monsters')}
maps = load('stage_maps')
stage = next(s for s in maps['stages'] if s['stageId'] == 300)
points = []
# Explicit realm IDs exclude script controllers and unverified edge test spawns.
for offset in range(start, end, 38):
    x, y = struct.unpack_from('<2H', data, offset)
    mid = struct.unpack_from('<H', data, offset + 16)[0]
    if not 18144 <= mid <= 18175:
        continue
    m = monsters[mid]
    points.append(dict(kind='monster', id=mid, name=m['Name'], pic=int(m['Pic']),
        level=int(m['Level']), rawX=x, rawY=y, x=round(x/8), y=round(y/8),
        coordX=round(x/16), coordY=round(y/16), source='STAGE300.MPC'))
stage['monsters'] = [p for p in points if p['id'] <= 18171]
stage['chests'] = [p for p in points if p['id'] >= 18172]
assert len(stage['monsters']) == 100 and len({p['id'] for p in stage['monsters']}) == 28
assert len(stage['chests']) == 13
assert all(0 <= p['x'] < stage['width'] and 0 <= p['y'] < stage['height'] for p in points)
save('stage_maps', maps)

csvpath = ROOT / 'raw/一般怪物位置.csv'
with csvpath.open(encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    fields = reader.fieldnames
    rows = [r for r in reader if r['StageID'] != '300']
counts = Counter(p['id'] for p in points)
for mid, count in counts.items():
    p = next(p for p in points if p['id'] == mid)
    m = monsters[mid]
    rows.append(dict(zip(fields, ['300', stage['stageName'], str(mid), m['Name'], m['Pic'],
        m['Level'], m['Type'], '', str(p['rawX']), str(p['rawY']), str(count), 'mpc'])))
with csvpath.open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

locations = load('locations')
for name, value in list(locations.items()):
    locations[name] = '、'.join(p for p in value.split('、') if p != stage['stageName'])
for p in points:
    parts = [v for v in locations.get(p['name'], '').split('、') if v]
    if stage['stageName'] not in parts:
        parts.append(stage['stageName'])
    locations[p['name']] = '、'.join(parts)
save('locations', locations)
write_data_bundle_js(ROOT/'data/locations.bundle.js', 'locations', locations)
write_runtime_data_js(ROOT/'data/runtime-data.js', {name:load(name) for name in ('items','monsters','magic','status','locations')})
print('PASS: stage300: 28 monster types / 100 points, 4 chest types / 13 points; location indexes synchronized')

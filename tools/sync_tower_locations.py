"""Keep displayed locations and future CSV imports aligned with verified tower points."""
import csv
import json
from collections import defaultdict
from pathlib import Path
from build_data import write_data_bundle_js, write_runtime_data_js

ROOT = Path(__file__).resolve().parents[1]
def sync():
    def load(name):
        return json.loads((ROOT/'data'/f'{name}.json').read_text('utf-8'))
    maps = [s for s in load('stage_maps')['stages'] if s.get('mapCategory') == 'tower']
    by_name = defaultdict(set)
    by_stage = defaultdict(set)
    for stage in maps:
        for m in stage['monsters'] + stage.get('chests', []):
            if m.get('floor'):
                by_name[m['name']].add(m['floor'])
                by_stage[(str(stage['stageId']), str(m['id']))].add(m['floor'])
    locations = load('locations')
    for name in set(locations) | set(by_name):
        parts = [p for p in locations.get(name, '').split('、') if p and not p.startswith('終末之塔')]
        parts += [f'終末之塔第{floor}層' for floor in sorted(by_name[name])]
        locations[name] = '、'.join(parts)
    (ROOT/'data/locations.json').write_text(json.dumps(locations, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    write_data_bundle_js(ROOT/'data/locations.bundle.js', 'locations', locations)
    write_runtime_data_js(ROOT/'data/runtime-data.js', {name:load(name) for name in ('items','monsters','magic','status','locations')})
    csvpath = ROOT/'raw/一般怪物位置.csv'
    with csvpath.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        fields, rows = reader.fieldnames, list(reader)
    for row in rows:
        key = row['StageID'], row['怪物ID']
        if key in by_stage:
            row['終末樓層'] = '、'.join(f'{floor}層' for floor in sorted(by_stage[key]))
    with csvpath.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    for name, floors in by_name.items():
        for floor in floors:
            assert f'終末之塔第{floor}層' in locations[name]
    print('PASS: synchronized tower locations for', len([f for f in by_name.values() if f]), 'monster/chest names')

if __name__ == '__main__':
    sync()

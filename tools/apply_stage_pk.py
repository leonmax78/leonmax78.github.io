"""Mark PK maps in data/stage_maps.json (stage.pk = true) from SETTING/STAGE.INI (Flag has STAGE_FLAG_PK),
and for 終末之塔 maps where a logout / disconnect sends you on the next login (stage.relogin), from AppearMap3:
282 = 虛空渦心中央, a tower stage = that stage's first floor entrance (matches 巨門網: 1～30 虛空渦心, 31～60 → 31 樓,
61～100 → 61 樓, 101～130 → 101 樓, 131～ → 131 樓).

The map page shows a PK reminder for these maps (and tags 終末之塔 floors / segments with ⚔PK);
tools/build_training_spots.py sets flag bit 16 for the same maps in the 練功推薦.
Usage: python3 tools/apply_stage_pk.py <STAGE.INI>
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = Path(sys.argv[1]).read_bytes().decode('cp950', 'replace').replace('\r\n', '\n')
pk, appear = set(), {}
for b in re.split(r'\n(?=\[)', text):
    i = re.search(r'^ID\s*=\s*(\d+)', b, re.M); f = re.search(r'^Flag\s*=\s*(.*)$', b, re.M)
    a = re.search(r'^AppearMap3\s*=\s*(\d+)', b, re.M)
    if i and a: appear[int(i.group(1))] = int(a.group(1))
    if i and f and 'STAGE_FLAG_PK' in f.group(1).split(',') + [x.strip() for x in f.group(1).split(',')]:
        pk.add(int(i.group(1)))
path = ROOT / 'data/stage_maps.json'
data = json.loads(path.read_text('utf-8'))
n = 0
first = {s['stageId']: min(a['floor'] for a in s['areas']) for s in data['stages'] if s.get('mapCategory') == 'tower' and s.get('areas')}
for s in data['stages']:
    s.pop('relogin', None)
    if s['stageId'] in first and s['stageId'] in appear:
        to = appear[s['stageId']]
        s['relogin'] = '虛空渦心中央' if to == 282 else f'{first[to]} 樓入口' if to in first else ''
        if not s['relogin']: s.pop('relogin')
    s.pop('pk', None)
    if s['stageId'] in pk:
        s['pk'] = True; n += 1
path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print([(s['stageName'], s['relogin']) for s in data['stages'] if s.get('relogin')])
print(n, 'PK maps:', sorted(s['stageName'] for s in data['stages'] if s.get('pk')))

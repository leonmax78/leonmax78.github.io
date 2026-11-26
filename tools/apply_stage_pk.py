"""Mark PK maps in data/stage_maps.json (stage.pk = true) from SETTING/STAGE.INI (Flag has STAGE_FLAG_PK).

The map page shows a PK reminder for these maps (and tags 終末之塔 floors / segments with ⚔PK);
tools/build_training_spots.py sets flag bit 16 for the same maps in the 練功推薦.
Usage: python3 tools/apply_stage_pk.py <STAGE.INI>
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = Path(sys.argv[1]).read_bytes().decode('cp950', 'replace').replace('\r\n', '\n')
pk = set()
for b in re.split(r'\n(?=\[)', text):
    i = re.search(r'^ID\s*=\s*(\d+)', b, re.M); f = re.search(r'^Flag\s*=\s*(.*)$', b, re.M)
    if i and f and 'STAGE_FLAG_PK' in f.group(1).split(',') + [x.strip() for x in f.group(1).split(',')]:
        pk.add(int(i.group(1)))
path = ROOT / 'data/stage_maps.json'
data = json.loads(path.read_text('utf-8'))
n = 0
for s in data['stages']:
    s.pop('pk', None)
    if s['stageId'] in pk:
        s['pk'] = True; n += 1
path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(n, 'PK maps:', sorted(s['stageName'] for s in data['stages'] if s.get('pk')))

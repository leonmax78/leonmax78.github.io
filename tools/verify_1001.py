"""Guard unrelated maps, collection records and the released crossover drops."""
import json
import subprocess
from pathlib import Path
from build_data import parse_drop,read_text,parse_ini_records

ROOT=Path(__file__).resolve().parents[1]
def load(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def old(path):return subprocess.check_output(['git','show',f'HEAD:{path}'],cwd=ROOT)

before=json.loads(old('data/stage_maps.json'))
after=load('data/stage_maps.json')
assert [s for s in before['stages'] if s['stageId']!=15]==[s for s in after['stages'] if s['stageId']!=15]
pingxi=next(s for s in after['stages'] if s['stageId']==15)
assert len(pingxi['monsters'])==23 and len(pingxi['npcs'])==25
assert not any(m.get('activity') for m in pingxi['monsters'])
for path in ('assets/test-media/stage-maps/stage015.png','assets/test-media/stage-maps-webp/stage015.webp'):
    assert (ROOT/path).read_bytes()==subprocess.check_output(['git','show',f'e04e2513^:{path}'],cwd=ROOT)
# Preserve original formatting when no curated collection data changed.
path='data/collectbook_sources.json'
assert load(path)==json.loads(old(path))
(ROOT/path).write_bytes(old(path))
monsters={r['ID']:r for r in load('data/monsters.json')}
reverse=load('data/drop_reverse.json')
source={r['ID']:r for r in parse_ini_records(read_text(Path.home()/'Desktop/1001/SETTING/MONSTER_C.INI')) if r.get('ID')}
for mid in ('18134','18135','18174','18175'):
    assert monsters[mid]['DropItem']==source[mid]['DropItem']
    drops=parse_drop(monsters[mid]['DropItem'])
    assert len(drops)==20
    for d in drops:
        found=[r for r in reverse[d['item_id']] if str(r['monsterId'])==mid]
        assert len(found)==1 and abs(float(found[0]['rate'])-d['rate'])<1e-8
    actual={item for item,rows in reverse.items() if any(str(r['monsterId'])==mid for r in rows)}
    assert actual=={d['item_id'] for d in drops}
assert monsters['18174']['DropItem'].split(',')[36:40]==['32873','155500','32874','155500']
assert len([s for s in load('data/soul.json') if s['Name']!='？？？'])==67
assert load('data/jiangshen.json')==json.loads(old('data/jiangshen.json'))
print('PASS: Pingxi restored; all other maps unchanged; 4 bags and reverse drops verified; souls/heroes/collection preserved')

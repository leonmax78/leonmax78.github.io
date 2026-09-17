"""Keep existing point presentation when the MPC coordinates did not change."""
import json
import struct
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
old=json.loads(subprocess.check_output(['git','show','dcc87956:data/stage_maps.json'],cwd=ROOT))
path=ROOT/'data/stage_maps.json'
new=json.loads(path.read_text(encoding='utf-8'))
def key(m):return (m['id'],m.get('rawX'),m.get('rawY'))
for stage in new['stages']:
    if stage['stageId'] not in [7,8,12,13,42,158]:continue
    previous=next(s for s in old['stages'] if s['stageId']==stage['stageId'])
    b=(Path.home()/f"Desktop/0917/MAP/STAGE{stage['stageId']:03}.MPC").read_bytes()
    start=struct.unpack_from('<I',b,24)[0]+2;end=struct.unpack_from('<I',b,32)[0]
    signatures={(struct.unpack_from('<H',b,o+16)[0],*struct.unpack_from('<HH',b,o)) for o in range(start,min(end,len(b)-37),38)}
    for kind in ('monsters','npcs'):
        originals={key(m):m for m in previous[kind]}
        stage[kind]=[originals.get(key(m),m) for m in stage[kind]]
        present={key(m) for m in stage[kind]}
        for m in previous[kind]:
            if key(m) not in present and key(m) in signatures:
                stage[kind].append(m)
path.write_text(json.dumps(new,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

"""Expose all four event lights as map NPC markers."""
import json
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/0924'
data=(SOURCE/'MAP/STAGE394.MPC').read_bytes()
start=struct.unpack_from('<I',data,24)[0]
end=struct.unpack_from('<I',data,32)[0]
records=[struct.unpack_from('<19H',data,o) for o in range(start,end,38)]
points=[r for r in records if r[0]==10025]
assert len(points)==4
path=ROOT/'data/stage_maps.json'
maps=json.loads(path.read_text(encoding='utf-8'))
stage=next(s for s in maps['stages'] if s['stageId']==394)
stage['npcs']=[n for n in stage['npcs'] if n.get('role')!='trap']
for i,r in enumerate(sorted(points,key=lambda r:r[1]),1):
    x,y=r[1:3]
    stage['npcs'].append({'kind':'npc','id':f'trap394-{i}','name':f'陷阱位置 {i}',
        'pic':10025,'role':'trap','shop':'','level':'','rawX':x,'rawY':y,
        'x':round(x/8),'y':round(y/8),'coordX':round(x/16),'coordY':round(y/16),
        'source':'STAGE394.MPC Sequence 10025'})
maps['version']='stage-map-0925-four-traps'
path.write_text(json.dumps(maps,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('PASS: four MPC-derived trap markers')

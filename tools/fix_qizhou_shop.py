"""Use the shop opened by Qizhou NPC 6265's dialogue, not its fallback shop."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'data/stage_maps.json'
data=json.loads(path.read_text(encoding='utf-8'))
stage=next(s for s in data['stages'] if s['stageId']==6)
npcs=[n for n in stage['npcs'] if n['id']==6265]
assert len(npcs)==1 and npcs[0]['shop'] in ('14','710')
npcs[0]['shop']='710'
shop=next(s for s in json.loads((ROOT/'data/shop_all.json').read_text(encoding='utf-8'))['shops'] if s['shopId']==710)
assert len([i for i in shop['items'] if i['sellPrice'] is not None])==30
assert next(i for i in shop['items'] if i['itemId']==20095)['sellPrice']==1000
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('PASS Qizhou NPC 6265 -> shop 710: 30 goods including teleport talisman')

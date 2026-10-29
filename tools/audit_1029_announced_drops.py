"""Cross-check announcement coverage without changing unannounced drop tables."""
import ast
import json
import subprocess
import build_data as b
import update_1029 as u

root=u.ROOT
tree=ast.parse((root/'tools/update_1029.py').read_text('utf-8'))
fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='announced_drops')
groups=ast.literal_eval(next(n.value for n in fn.body if isinstance(n,ast.Assign) and n.targets[0].id=='groups'))
normalize=lambda s:s.translate(str.maketrans('','','．‧· '))
monsters=u.load('monsters'); items=u.load('items'); reverse=u.load('drop_reverse')
actual={r['ID']:r for r in u.records('MONSTER_C.INI')}
removed_node=next(n.value for n in fn.body if isinstance(n,ast.Assign) and n.targets[0].id=='removed')
removed=dict(x.split(':') for x in ast.literal_eval(removed_node.args[0].generators[0].iter))
issues=[]; additions=[]; removals=[]
for grade,group in enumerate(groups,1):
 for name in group.split('、'):
  matches=[m for m in monsters if normalize(m['Name'])==normalize(name)]
  if not matches:issues.append('Missing source '+name)
  for m in matches:
   iid=str(32958+grade); entries=[r for r in reverse.get(iid,[]) if str(r['monsterId'])==m['ID']]
   if not entries:issues.append('Missing gem bag '+m['ID'])
   additions.append({'id':m['ID'],'name':m['Name'],'grade':grade,'rate':entries[0]['rate'] if entries else None})
for name,item_name in removed.items():
 ids={i['ID'] for i in items if i['Name']==item_name}
 for m in monsters:
  if normalize(m['Name'])!=normalize(name):continue
  for iid in ids:
   assert not any(str(r['monsterId'])==m['ID'] for r in reverse.get(iid,[])),(name,item_name)
  removals.append({'id':m['ID'],'name':m['Name'],'removed':item_name})
tower_ids=['15721','15757','15787','15857','15947','16100','16276','16495','16533','16843','16942','17157','17248','17545','17620','17923','17980','18188']
tower=[]
for mid in tower_ids:
 m=next(m for m in monsters if m['ID']==mid)
 drops=b.parse_drop(b.drop_value(actual[mid]))
 gems=[d for d in drops if 32401<=int(d['item_id'])<=32450]
 assert len(gems)==1,mid
 for d in gems:
  entry=next(r for r in reverse[d['item_id']] if str(r['monsterId'])==mid)
  assert abs(entry['rate']-d['rate'])<1e-10
 tower.append({'id':mid,'name':m['Name'],'gem':gems[0]['item_id'],'rate':gems[0]['rate']})
boss_names='蛇魔女王、神龍將、無頭將軍俑、蒼狼族大汗、幻雷妖煞、西域邪神、天邪魎王、破壞神濕婆、六滅邪王、八歧大蛇、傾天絕邪、拉‧荷魯斯、星宇諸滅者、三界壞滅尊、赤城武烈君、咒君拉美西斯、燭懨獄鰲龍'.split('、')
type_conflicts=[{'id':m['ID'],'name':m['Name'],'type':m.get('Type')} for m in monsters if m['Name'] in boss_names and m.get('Type')!='0x00002000']
old=json.loads(subprocess.check_output(['git','show','1b2e11f2:data/monsters.json'],cwd=root))
assert next(m for m in monsters if m['ID']=='9569')['DropItem']==next(m for m in old if m['ID']=='9569')['DropItem']
for mid in ['17142','17305']:
 assert not any(str(r['monsterId'])==mid for r in reverse['30658'])
assert any(str(r['monsterId'])=='17304' and abs(r['rate']-.007)<1e-10 for r in reverse['30658'])
assert not issues,issues
report={'additions':additions,'removals':removals,'tower':tower,'typeConflicts':type_conflicts,'unchangedBeast':'9569','jadeBoxes':{'17142':'removed','17305':'removed','17304':'unannounced; client retains 0.007%'}}
(root/'reports/audit_1029_announced_drops.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'additionRows':len(additions),'removedRows':len(removals),'towerBosses':len(tower),'pendingRates':sum(x['rate'] is None for x in additions),'typeConflicts':type_conflicts},ensure_ascii=False))

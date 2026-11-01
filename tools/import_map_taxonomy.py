"""Import owner-approved workbook classifications without changing map/drop data."""
import json
import sys
from pathlib import Path
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
book=openpyxl.load_workbook(sys.argv[1],data_only=True,read_only=True)
index=json.loads((ROOT/'data/stage_map_index.json').read_text('utf-8'))['stages']
names={s['stageId']:s['stageName'] for s in index}
general=['中原地圖','深淵','龍川事變','六宇浮上','神州20 II','神州20','赤膽征長疆','武俠神域','天罪','唯我頂天','勝者為王','俠者無敵','問頂仙途','十字聖戰','波斯聖域','五派頂峰','無間煉獄','梵天劫','決戰東瀛','西域傳奇','地火神兵','蒼狼劫','古墓秘境','東海龍宮','桃花仙境','修羅境']
collabs=['霹靂','侍魂','幻三','東離','幻三鳳凰','活俠','絕代']
stages={}
for row in book.worksheets[0].iter_rows(min_row=7,values_only=True):
    sid,name,section,group,status,override_section,override_group,*_=row
    if sid is None:continue
    assert sid in names and names[sid]==name and str(sid) not in stages,(sid,name)
    if override_section=='隱藏':stages[str(sid)]={'hidden':True};continue
    section=override_section or section;group=override_group or group
    entry={'section':section,'group':group}
    if group.endswith('聯動'):
        series=group.removesuffix('聯動').replace('幻三鳳凰誓','幻三鳳凰')
        assert series in collabs,series
        entry.update(group='聯動',series=series)
    assert section in ('一般地圖','特殊地圖'),entry
    assert entry['group'] in general+['七寶','通寶花園','聯動','終末之塔','虛空大秘境'],entry
    stages[str(sid)]=entry
assert set(map(int,stages))==set(names)
# Owner's subsequent correction supersedes the workbook's hidden flag.
stages['154']={'section':'一般地圖','group':'地火神兵'}
stages['155']={'section':'一般地圖','group':'地火神兵'}
assert not any(v.get('hidden') for v in stages.values())
data={'version':1,'approvedSource':'地圖分類填寫表.xlsx','sections':['一般地圖','特殊地圖'],
      'groups':{'一般地圖':general,'特殊地圖':['七寶','通寶花園','聯動','終末之塔','虛空大秘境']},'series':collabs,'stages':stages}
(ROOT/'data/map-taxonomy.js').write_text('window.SZO_MAP_TAXONOMY = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Imported',len(stages),'maps; maps154/155 belong to 地火神兵; collaboration order:',','.join(collabs))

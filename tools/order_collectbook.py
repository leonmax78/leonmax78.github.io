"""Reconcile curated entries to official LIST order without sorting by ID or level."""
import copy
import json
import re
import subprocess
import sys
from pathlib import Path
from build_data import parse_ini_records, read_text

ROOT=Path(__file__).resolve().parents[1]
TYPES=dict(zip(
 ['SWORD','BLADE','HIDDEN_WEAPON','WHISK','STAFF','SPEAR','ROD','HAMMER','AXE','SHIELD','HELMET','ARMOR','BRACER','ORNAMENT','BOOT','UNDER_BOOT'],
 ['劍','刀','暗器','拂塵','杖','槍','棍','錘','斧','盾','帽子','衣服','護腕','飾品','鞋子','仙器']))
def norm(name):return re.sub(r'\s+','',str(name))

def order_collectbook(data):
    records=parse_ini_records(read_text(ROOT/'raw/latest_setting/COLLECTBOOKITEM.INI'))
    items={str(r['ID']):r for r in json.loads((ROOT/'data/items.json').read_text(encoding='utf-8'))}
    monsters={str(r['ID']):r for r in json.loads((ROOT/'data/monsters.json').read_text(encoding='utf-8'))}
    old={k:data[k] for k in ('weapon','artifact','recipe','beast')}
    out={k:[] for k in old};used=set();created=[];beast_group=0
    for position,record in enumerate(records):
        mid=record['ID'];beast=record.get('Type')=='1';source=(monsters if beast else items)[mid]
        if beast and record['Index']=='1':beast_group+=1
        typ=source.get('Type');kind='beast' if beast else 'recipe' if typ=='PRESCRIPTION' else 'weapon' if typ in TYPES else 'artifact'
        key='monsterId' if beast else 'itemId'
        candidates=[(i,r) for i,r in enumerate(old[kind]) if str(r.get(key))==mid]
        if not candidates:
            candidates=[(i,r) for i,r in enumerate(old[kind]) if norm(r['name'])==norm(source['Name'])]
        if not candidates and beast and source['Name'] in ('士兵俑','力士俑'):
            candidates=[(i,r) for i,r in enumerate(old[kind]) if r['name'].startswith(source['Name'])]
        if candidates:
            index,original=candidates[0];row=copy.deepcopy(original)
            for i,r in candidates:
                used.add((kind,i))
                for field in ('taskNames','shops','excelSources','locations','skills','reverseDrops'):
                    for value in r.get(field,[]):
                        if value not in row.setdefault(field,[]):row[field].append(value)
                row['taskFlag']=row.get('taskFlag',False) or r.get('taskFlag',False)
                row['shopFlag']=row.get('shopFlag',False) or r.get('shopFlag',False)
        else:
            row={'name':source['Name'],'kind':kind,'category':TYPES.get(typ,'配方' if kind=='recipe' else '法器'),
                 'taskFlag':False,'taskNames':[],'shopFlag':False,'shops':[],'excelSources':[],
                 'reverseDrops':[],'reverseDropCount':0}
            if beast:row.update(category=['兩儀','兩儀','三才','四象','五行','六合','七星','八卦','九如','十錦'][beast_group-1],strength='',skills=[],locations=[])
            created.append({'id':mid,'name':source['Name'],'kind':kind})
        row[key]=mid
        row['name']=source['Name']
        allkey='allMonsterIds' if beast else 'allItemIds'
        row[allkey]=list(dict.fromkeys([mid,*row.get(allkey,[])]))
        row.update(collectIndex=record['Index'],collectOrder=position,score=record['Cost'])
        row['searchText']=' '.join([row.get('searchText',''),mid,source['Name']])
        out[kind].append(row)
    for kind in out:data[kind]=out[kind]
    data['meta']['officialScoreTotal']=sum(int(r['Cost']) for r in records)
    data['meta']['orderPolicy']='COLLECTBOOKITEM.INI LIST file order; 96 entries per page within selected category.'
    report={'created':created,'unmatchedPreviousRows':[{'kind':k,'row':r} for k in old for i,r in enumerate(old[k]) if (k,i) not in used]}
    return report

if __name__=='__main__':
    path=ROOT/'data/collectbook_sources.json'
    data=json.loads(subprocess.check_output(['git','show','HEAD:data/collectbook_sources.json'],cwd=ROOT)) if '--from-head' in sys.argv else json.loads(path.read_text(encoding='utf-8'))
    report=order_collectbook(data)
    from collectbook_task_sources import apply_task_sources
    apply_task_sources(data)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'reports/collectbook_order_reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print({k:len(data[k]) for k in ('weapon','artifact','recipe','beast')})
    print('Newly matched official rows:',len(report['created']),'Archived unmatched rows:',len(report['unmatchedPreviousRows']))

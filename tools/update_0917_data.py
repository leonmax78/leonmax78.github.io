"""Incremental 0917 import; retain curated collection sources and map overrides."""
import csv
import json
import shutil
from collections import Counter
from pathlib import Path

import build_data

ROOT = Path(__file__).resolve().parents[1]
SETTING = Path.home() / 'Desktop/0917/SETTING'
CATEGORIES = dict(zip(
    ['SWORD','BLADE','HIDDEN_WEAPON','WHISK','STAFF','SPEAR','ROD','HAMMER','AXE','SHIELD','HELMET','ARMOR','BRACER','ORNAMENT','BOOT','UNDER_BOOT','PRESCRIPTION'],
    ['劍','刀','暗器','拂塵','杖','槍','棍','錘','斧','盾','帽子','衣服','護腕','飾品','鞋子','仙器','配方']))


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def main():
    for name, dest in [('ITEM.INI','ITEM.INI'),('MONSTER_C.INI','new/MONSTER_C.INI'),
                       ('COLLECTBOOKITEM.INI','latest_setting/COLLECTBOOKITEM.INI'),
                       ('COLLECTBOOKBONUS.INI','COLLECTBOOKBONUS.INI')]:
        target = ROOT / 'raw' / dest
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SETTING / name, target)
    maps = load(ROOT / 'data/stage_maps.json')
    monster_ini = {r['ID']:r for r in build_data.parse_ini_records(build_data.read_text(SETTING/'MONSTER_C.INI')) if 'ID' in r}
    path = ROOT / 'raw/一般怪物位置.csv'
    with path.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f); fields=reader.fieldnames; rows=list(reader)
    # Add only the two verified event monsters, not invisible timer/controller objects.
    rows=[r for r in rows if r['怪物ID'] not in ('18193','18194')]
    for stage in maps['stages']:
        for mid in ('18193','18194'):
            points=[m for m in stage['monsters'] if str(m['id'])==mid]
            if not points: continue
            m=monster_ini[mid]; point=points[0]
            rows.append(dict(zip(fields,[str(stage['stageId']),stage['stageName'],mid,m['Name'],m['Pic'],m['Level'],m['Type'],'',str(point['rawX']),str(point['rawY']),str(len(points)),'mpc'])))
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
    build_data.main()
    items={r['ID']:r for r in load(ROOT/'data/items.json')}
    monsters={r['ID']:r for r in load(ROOT/'data/monsters.json')}
    reverse=load(ROOT/'data/drop_reverse.json')
    locations=load(ROOT/'data/locations.json')
    official=build_data.parse_ini_records(build_data.read_text(SETTING/'COLLECTBOOKITEM.INI'))
    previous=build_data.parse_ini_records(build_data.read_text(SETTING.parent.parent/'0910/SETTING/COLLECTBOOKITEM.INI'))
    previous_ids={r['ID'] for r in previous}
    data=load(ROOT/'data/collectbook_sources.json')
    counts=Counter(); added=[]
    for r in official:
        mid=r['ID']; beast=r.get('Type')=='1'
        source=(monsters if beast else items).get(mid)
        if not source: raise ValueError(f'Missing source record {mid}')
        kind='beast' if beast else 'recipe' if source.get('Type')=='PRESCRIPTION' else 'artifact' if source.get('Type')=='TALISMAN' else 'weapon'
        key='monsterId' if beast else 'itemId'
        old=next((x for x in data[kind] if str(x.get(key))==mid),None)
        if old:
            old['score']=r['Cost'];old['collectIndex']=r['Index']
            if mid not in previous_ids:
                counts[kind]+=1;added.append(old)
            continue
        # Older curated rows are not recreated or replaced from an outdated workbook.
        if mid in previous_ids: continue
        cat='十錦' if beast else CATEGORIES.get(source.get('Type'),'法器')
        row={'name':source['Name'],key:mid,'allMonsterIds' if beast else 'allItemIds':[mid],
             'collectIndex':r['Index'],'kind':kind,'category':cat,'score':r['Cost']}
        if beast:
            row.update(strength='10★',skills=[],locations=[])
        else:
            drops=[{'monsterId':str(x['monsterId']),'monster':x['monsterName'],
                    'level':monsters.get(str(x['monsterId']),{}).get('Level',''),
                    'rate':round(x['rate'],6),'locations':locations.get(x['monsterName'],'').split('、') if locations.get(x['monsterName']) else []}
                   for x in reverse.get(mid,[])]
            row.update(taskFlag=False,taskNames=[],shopFlag=False,shops=[],excelSources=[],reverseDrops=drops,reverseDropCount=len(drops))
        row['searchText']=' '.join([source['Name'],mid,cat,r['Cost']]+[x['monster'] for x in row.get('reverseDrops',[])])
        data[kind].append(row);counts[kind]+=1;added.append(row)
    # Keep category order, and place additions at their actual in-game index.
    for kind in ('weapon','recipe','beast'):
        order=list(dict.fromkeys(x['category'] for x in data[kind]))
        data[kind].sort(key=lambda x:(order.index(x['category']),int(x.get('collectIndex') or 99999)))
    data['meta'].update(sourceCollectBook='raw/latest_setting/COLLECTBOOKITEM.INI',updatedAt='2026-09-17',itemRecords=len(items),monsterRecords=len(monsters),officialScoreTotal=sum(int(r['Cost']) for r in official))
    (ROOT/'data/collectbook_sources.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    report={'date':'2026-09-17','addedCounts':dict(counts),'added':added,
            'displayScoreTotal':sum(int(x.get('score') or 0) for k in ('weapon','artifact','recipe','beast') for x in data[k]),
            'officialScoreTotal':sum(int(r['Cost']) for r in official)}
    (ROOT/'reports/weekly_0917_collectbook.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='added'},ensure_ascii=False))


if __name__=='__main__':main()

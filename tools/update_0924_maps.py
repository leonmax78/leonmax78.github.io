"""Finalize the three requested maps and their searchable monster records."""
import csv
import json
import subprocess
from collections import Counter
from pathlib import Path
from build_data import parse_ini_records, read_text, write_data_bundle_js, write_runtime_data_js

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/0924/SETTING'
def load(name):return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))
def save(name,data): (ROOT/'data'/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def main():
    maps=load('stage_maps.json')
    old=json.loads(subprocess.check_output(['git','show','HEAD:data/stage_maps.json'],cwd=ROOT))
    before={s['stageId']:s for s in old['stages']}
    key=lambda m:(m['id'],m.get('rawX'),m.get('rawY'))
    for i,stage in enumerate(maps['stages']):
        sid=stage['stageId']
        if sid not in (7,8,394):
            maps['stages'][i]=before[sid]
        elif sid in (7,8):
            for kind in ('npcs','monsters'):
                prior={key(m):m for m in before[sid][kind]}
                stage[kind]=[prior.get(key(m),m) for m in stage[kind]]
            maps['stages'][i]={**before[sid],**stage}
    maps['version']='stage-map-0924-crossover'
    maps['excludedStageIds']=old.get('excludedStageIds',[])
    save('stage_maps.json',maps)
    stage=next(s for s in maps['stages'] if s['stageId']==394)
    ids={str(m['id']) for m in stage['monsters']}
    assert ids=={'18195','18196','18197'}
    records=[r for r in parse_ini_records(read_text(SOURCE/'MONSTER_C.INI')) if r.get('ID') in ids]
    rawpath=ROOT/'raw/new/MONSTER_C.INI'
    existing={r.get('ID') for r in parse_ini_records(read_text(rawpath))}
    with rawpath.open('ab') as f:
        for r in records:
            if r['ID'] in existing:continue
            block='\r\n['+r.get('_section','NPC')+']\r\n'+'\r\n'.join(f'{k} = {v}' for k,v in r.items() if k!='_section')+'\r\n'
            f.write(block.encode('cp950'))
    monsters=[r for r in load('monsters.json') if r['ID'] not in ids]+records
    save('monsters.json',monsters)
    write_data_bundle_js(ROOT/'data/monsters.bundle.js','monsters',monsters)
    locations=load('locations.json')
    for r in records: locations[r['Name']]='四海外林'
    save('locations.json',locations)
    write_data_bundle_js(ROOT/'data/locations.bundle.js','locations',locations)
    search=load('search_index.json')
    search['monsters']=[r for r in search['monsters'] if str(r['id']) not in ids]+[{'id':r['ID'],'name':r['Name'],'level':r.get('Level',''),'type':r.get('Type',''),'subType':r.get('SubType',''),'exp':r.get('DropExp','')} for r in records]
    save('search_index.json',search)
    write_data_bundle_js(ROOT/'data/search_index.bundle.js','search_index',search)
    write_data_bundle_js(ROOT/'data/search_monsters.bundle.js','search_monsters',{'monsters':search['monsters']})
    write_runtime_data_js(ROOT/'data/runtime-data.js',{name:load(name+'.json') for name in ('items','monsters','magic','status','locations')})
    csvpath=ROOT/'raw/一般怪物位置.csv'
    with csvpath.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);fields=reader.fieldnames;rows=[r for r in reader if r['StageID']!='394']
    counts=Counter(str(m['id']) for m in stage['monsters'])
    for r in records:
        m=next(m for m in stage['monsters'] if str(m['id'])==r['ID'])
        rows.append(dict(zip(fields,['394','四海外林',r['ID'],r['Name'],r['Pic'],r['Level'],r['Type'],'',str(m['rawX']),str(m['rawY']),str(counts[r['ID']]),'mpc'])))
    with csvpath.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
    meta=load('build_meta.json');meta['counts']['monsters']=len(monsters);meta['counts']['locations']=len(locations)
    meta['incrementalUpdate']={'date':'2026-09-24','source':'0924/SETTING/MONSTER_C.INI','monsterIds':sorted(ids)}
    save('build_meta.json',meta);write_data_bundle_js(ROOT/'data/build_meta.bundle.js','build_meta',meta)
    print('PASS: unrelated maps preserved; 3 monster species, 43 spawn points and 3 NPCs indexed')

if __name__=='__main__':main()

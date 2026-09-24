"""Sync the two released crossover bags and their reverse-drop indexes."""
import json
import re
from pathlib import Path
from build_data import (read_text, parse_ini_records, record_to_plain,
                        build_drop_reverse, parse_drop, write_data_bundle_js,
                        write_runtime_data_js)

ROOT=Path(__file__).resolve().parents[1]
IDS={'18134','18135'}
def load(name):return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))
def save(name,data): (ROOT/'data'/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def main():
    source=Path.home()/'Desktop/0924/SETTING/MONSTER_C.INI'
    records=[record_to_plain(r) for r in parse_ini_records(read_text(source)) if r.get('ID') in IDS]
    assert len(records)==2
    for r in records:
        drops=parse_drop(r['DropItem'])
        assert len(drops)==20 and sum(d['weight'] for d in drops)==20000
        assert drops[0]['rate']==0.025
    incoming={r['ID']:r for r in records}
    monsters=[incoming.get(r['ID'],r) for r in load('monsters.json')]
    assert sum(r['ID'] in IDS for r in monsters)==2
    save('monsters.json',monsters)
    write_data_bundle_js(ROOT/'data/monsters.bundle.js','monsters',monsters)
    reverse=load('drop_reverse.json')
    affected={key for key,rows in reverse.items() if any(str(r['monsterId']) in IDS for r in rows)}
    for key in affected:reverse[key]=[r for r in reverse[key] if str(r['monsterId']) not in IDS]
    for key,rows in build_drop_reverse(records).items():
        reverse.setdefault(key,[]).extend(rows);affected.add(key)
    for key in affected:reverse[key].sort(key=lambda r:float(r['rate']),reverse=True)
    save('drop_reverse.json',reverse)
    write_data_bundle_js(ROOT/'data/drop_reverse.bundle.js','drop_reverse',reverse)
    for prefix in {key[:3] for key in affected}:
        save(f'drop_reverse_shards/{prefix}.json',{key:rows for key,rows in reverse.items() if key.startswith(prefix)})
    manifest=load('drop_reverse_shards/manifest.json')
    manifest['shards']=sorted({key[:3] for key in reverse})
    manifest['count']=len(manifest['shards'])
    save('drop_reverse_shards/manifest.json',manifest)
    write_runtime_data_js(ROOT/'data/runtime-data.js',{name:load(name+'.json') for name in ('items','monsters','magic','status','locations')})
    # Preserve the source file byte-for-byte outside the selected INI sections.
    raw=ROOT/'raw/new/MONSTER_C.INI'
    text=raw.read_bytes().decode('cp950')
    blocks=re.split(r'(?=^\[)',text,flags=re.M)
    replaced=set()
    for i,block in enumerate(blocks):
        parsed=parse_ini_records(block)
        if not parsed or parsed[0].get('ID') not in IDS:continue
        r=incoming[parsed[0]['ID']];replaced.add(r['ID'])
        blocks[i]='[NPC]\r\n'+'\r\n'.join(f'{k} = {v}' for k,v in r.items() if k!='_section')+'\r\n\r\n'
    assert replaced==IDS
    raw.write_bytes(''.join(blocks).encode('cp950'))
    items={r['ID']:r for r in load('items.json')}
    assert all(d['item_id'] in items for r in records for d in parse_drop(r['DropItem']))
    print('PASS: two bags, 20 prizes each, 20000 weight each, 0.025% soul drops; reverse indexes synchronized')

if __name__=='__main__':main()

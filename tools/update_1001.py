"""Restore pre-parade Pingxi and rebuild October 1 settings without losing curated sources."""
import csv
import json
import shutil
import subprocess
from pathlib import Path
import build_data

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/1001/SETTING'
BASELINE='e04e2513^'

def load(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
def write(path,data):(ROOT/path).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def historical(path):return subprocess.check_output(['git','show',f'{BASELINE}:{path}'],cwd=ROOT)

def main():
    maps=load('data/stage_maps.json')
    current=next(s for s in maps['stages'] if s['stageId']==15)
    original=next(s for s in json.loads(historical('data/stage_maps.json'))['stages'] if s['stageId']==15)
    events=[m for m in current['monsters'] if m.get('activity')=='虛空群魔大遊行']
    assert len(events)==74
    ids={str(m['id']) for m in events};names={m['name'] for m in events}
    positions=lambda rows:sorted((m['id'],m['rawX'],m['rawY']) for m in rows)
    assert positions(current['npcs'])==positions(original['npcs'])
    assert positions([m for m in current['monsters'] if str(m['id']) not in ids])==positions(original['monsters'])
    maps['stages']=[original if s['stageId']==15 else s for s in maps['stages']]
    write('data/stage_maps.json',maps)
    for path in ['assets/test-media/stage-maps/stage015.png','assets/test-media/stage-maps-webp/stage015.webp']:
        (ROOT/path).write_bytes(historical(path))
    path=ROOT/'raw/一般怪物位置.csv'
    with path.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
    removed=[r for r in rows if r['StageID']=='15' and r['怪物ID'] in ids]
    assert len(removed)==74
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
        writer.writerows(r for r in rows if r not in removed)
    # Save the supplied snapshot for future local builds; latest_setting is gitignored.
    latest=ROOT/'raw/latest_setting';latest.mkdir(exist_ok=True)
    for path in SOURCE.iterdir():
        if path.is_file():shutil.copy2(path,latest/path.name)
    for name,dest in [('ITEM.INI','ITEM.INI'),('MONSTER_C.INI','new/MONSTER_C.INI')]:
        shutil.copy2(SOURCE/name,ROOT/'raw'/dest)
    build_data.main()
    locations=load('data/locations.json')
    assert all('平西關' not in locations.get(name,'').split('、') for name in names)
    # Only remove expired event locations from manually curated collection entries.
    book=load('data/collectbook_sources.json');touched=0
    for kind in ('weapon','artifact','recipe','beast'):
        for row in book[kind]:
            for drop in row.get('reverseDrops',[]):
                if str(drop.get('monsterId')) in ids:
                    before=drop.get('locations',[])
                    drop['locations']=[name for name in before if name!='平西關']
                    touched+=before!=drop['locations']
    if touched:
        (ROOT/'data/collectbook_sources.json').write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report={'stageId':15,'restoredFrom':BASELINE,'removedEventMarkers':len(events),
            'normalMonsterPoints':len(original['monsters']),'npcPoints':len(original['npcs']),
            'collectionSourceLocationsUpdated':touched,'eventMonsterIds':sorted(ids,key=int)}
    write('reports/pingxi_1001_restore.json',report)
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()

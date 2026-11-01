"""Keep collectbook drops aligned with the website's canonical reverse index.

Only generated drop fields/search text change. Workbook order, categories,
NPC/shop corrections and manually reviewed task metadata remain untouched.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sync(root=ROOT, check=False):
    path = root/'data/collectbook_sources.json'
    if not path.exists():
        return []
    read = lambda name: json.loads((root/f'data/{name}.json').read_text('utf-8'))
    data, reverse, locations = read('collectbook_sources'), read('drop_reverse'), read('locations')
    monsters = {str(m['ID']): m for m in read('monsters')}
    changed = []
    for kind in ('weapon', 'artifact', 'recipe'):
        for row in data[kind]:
            drops = []
            for entry in reverse.get(str(row['itemId']), []):
                mid = str(entry['monsterId'])
                monster = monsters.get(mid, {})
                name = monster.get('Name', entry.get('monsterName', ''))
                places = locations.get(name, '')
                places = places if isinstance(places, list) else [s for s in places.split('、') if s]
                rate = entry.get('rate')
                drops.append(dict(monsterId=mid, monster=name, level=str(monster.get('Level', '')),
                                  rate=None if rate is None else round(float(rate), 6), locations=places))
            drops.sort(key=lambda r: (-(r['rate'] or 0), int(r['monsterId'])))
            if row.get('reverseDrops') != drops or row.get('reverseDropCount') != len(drops):
                changed.append(dict(kind=kind, itemId=row['itemId'], name=row['name'],
                                    before=len(row.get('reverseDrops', [])), after=len(drops)))
                row['reverseDrops'] = drops
                row['reverseDropCount'] = len(drops)
                row['searchText'] = ' '.join([row['name'],str(row['itemId']),row.get('category',''),str(row.get('score','')),
                    *row.get('taskNames',[]),*row.get('shops',[]),*row.get('excelSources',[]),
                    *(d['monster'] for d in drops),*(p for d in drops for p in d['locations'])])
    if not check:
        data['meta']['dropSource'] = 'data/drop_reverse.json'
        data['meta']['dropSourceSha256'] = hashlib.sha256((root/'data/drop_reverse.json').read_bytes()).hexdigest()
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', 'utf-8')
    return changed


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    changes=sync(check=args.check)
    print(f'Collectbook drop records requiring sync: {len(changes)}')
    if not args.check:
        (ROOT/'reports/collectbook_drop_sync.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n','utf-8')
    if args.check and changes:
        raise SystemExit(1)

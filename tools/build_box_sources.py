"""Index BONUS items by their actual loot-table ID for reverse lookups."""
import json
from pathlib import Path


def build(root):
    data = root / 'data'
    def load(name):
        return json.loads((data / (name + '.json')).read_text(encoding='utf-8-sig'))
    monsters = {m['ID']: m for m in load('monsters')}
    locations = load('locations')
    index = {}
    for item in load('items'):
        table = item.get('Magic')
        if item.get('Type') != 'BONUS' or table not in monsters:
            continue
        m = monsters[table]
        entry = index.setdefault(table, {'boxes': []})
        entry['boxes'].append([item['ID'], item['Name']])
        if locations.get(m['Name']) or int(m.get('DropExp', 0)) > 0 or int(m.get('Attack', 0)) > 0:
            entry['keepMonster'] = True
    (data / 'box-sources.js').write_text('window.SZO_BOX_SOURCES=' + json.dumps(
        index, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1])

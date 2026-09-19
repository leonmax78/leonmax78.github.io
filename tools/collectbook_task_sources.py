"""Apply owner-confirmed quest sources by stable item ID."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def apply_task_sources(data):
    sources = json.loads((ROOT / 'config/collectbook_task_sources.json').read_text(encoding='utf-8'))
    for kind in ('weapon', 'artifact', 'recipe'):
        for row in data.get(kind, []):
            if str(row.get('itemId')) in {'20979', '21597', '21596'}:
                exchange = '賞金獵人（5個大王石牌換取）'
                row['shopFlag'] = True
                row['shops'] = [exchange]
                if exchange not in row.get('searchText', ''):
                    row['searchText'] = row.get('searchText', '') + ' ' + exchange
            # Nanliao rewards belong to the twentieth-anniversary main quest.
            if str(row.get('itemId')) in {'30553', '30554', '30555', '30556', '30557', '30558'}:
                row['taskNames'] = [name.replace('神州2主線', '神州20主線') for name in row.get('taskNames', [])]
                row['searchText'] = row.get('searchText', '').replace('神州2主線', '神州20主線')
            source = sources.get(str(row.get('itemId')))
            if not source:
                continue
            label = f"{source['location']}－{source['quest']}" if source['location'] else source['quest']
            row['taskFlag'] = True
            row['taskNames'] = list(dict.fromkeys([*row.get('taskNames', []), label]))
            row['taskDetails'] = [source]
            tokens = [label, source['npc']]
            row['searchText'] = ' '.join([row.get('searchText', ''), *[t for t in tokens if t and t not in row.get('searchText', '')]])
    return data

if __name__ == '__main__':
    path = ROOT / 'data/collectbook_sources.json'
    data = apply_task_sources(json.loads(path.read_text(encoding='utf-8')))
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

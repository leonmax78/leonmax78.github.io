"""Apply owner-confirmed quest sources by stable item ID."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def apply_task_sources(data):
    sources = json.loads((ROOT / 'config/collectbook_task_sources.json').read_text(encoding='utf-8'))
    for kind in ('weapon', 'artifact', 'recipe'):
        for row in data.get(kind, []):
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

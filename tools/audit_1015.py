import json
from collections import Counter
from pathlib import Path
import build_data as b

def index(rows):
    counts = Counter()
    result = {}
    for row in rows:
        key = str(row.get('ID', row.get('_section', 'row')))
        counts[key] += 1
        result[f'{key}#{counts[key]}'] = row
    return result

old = Path.home() / 'Desktop/1008/SETTING'
new = Path.home() / 'Desktop/1015/SETTING'
out = {}
for file in sorted(new.glob('*.INI')):
    prior = old / file.name
    if not prior.exists() or file.read_bytes() == prior.read_bytes():
        continue
    a = index(b.parse_ini_records(prior.read_bytes().decode('cp950', errors='replace')))
    c = index(b.parse_ini_records(file.read_bytes().decode('cp950', errors='replace')))
    changes = []
    for key in sorted(a.keys() | c.keys()):
        u, v = a.get(key, {}), c.get(key, {})
        if u != v:
            changes.append({'id': key, 'name': v.get('Name', u.get('Name', '')), 'fields': {f: [u.get(f), v.get(f)] for f in sorted(u.keys() | v.keys()) if u.get(f) != v.get(f)}})
    out[file.name] = changes
path = b.ROOT / 'reports/update_1015_audit.json'
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: len(v) for k, v in out.items()}, ensure_ascii=False))

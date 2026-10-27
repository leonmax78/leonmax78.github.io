"""Fill only absent monster drops from the 28000 installer; preserve live overrides."""
import argparse
import hashlib
import json
from decimal import Decimal
from pathlib import Path
from build_data import (read_text, parse_ini_records, record_to_plain, drop_value,
                        parse_drop, build_drop_reverse, write_data_bundle_js,
                        write_runtime_data_js)

ROOT = Path(__file__).resolve().parents[1]

def load(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf-8'))

def save(name, data):
    (ROOT / 'data' / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    incoming = [record_to_plain(r) for r in parse_ini_records(read_text(args.source))]
    index = {r['ID']: r for r in incoming}
    assert len(index) == len(incoming), 'Duplicate source monster IDs'
    monsters = load('monsters.json')
    items = {r['ID']: r for r in load('items.json')}
    added = []
    for row in monsters:
        source = index.get(row['ID'])
        if drop_value(row) or not source or not drop_value(source):
            continue
        assert row['Name'] == source['Name'], 'ID/name conflict'
        fields = [s.strip() for s in drop_value(source).split(',') if s.strip()]
        assert (len(fields) - 2) % 2 == 0
        assert int(fields[1]) == (len(fields) - 2) // 2, row['ID']
        assert all(Decimal(w).is_finite() and Decimal(w) >= 0 for w in fields[3::2])
        drops = parse_drop(drop_value(source))
        assert drops and all(d['item_id'] in items for d in drops), row['ID']
        row['DropItem'] = source['DropItem']
        added.append(row)
    print(f'Missing drop tables to fill: {len(added)}')
    if not args.apply or not added:
        return
    assert len(added) == 110, 'Unexpected source/baseline; review before writing'
    report = {'source': str(args.source), 'sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'count': len(added), 'policy': 'Only fill absent DropItem; preserve all other fields and existing drops',
              'rows': [{'id': r['ID'], 'name': r['Name'], 'dropItem': r['DropItem']} for r in added]}
    (ROOT / 'reports/abyss-28000-missing-drops.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    save('monsters.json', monsters)
    write_data_bundle_js(ROOT / 'data/monsters.bundle.js', 'monsters', monsters)
    ids = {r['ID'] for r in added}
    reverse = load('drop_reverse.json')
    affected = set()
    for key, rows in reverse.items():
        if any(str(r['monsterId']) in ids for r in rows):
            reverse[key] = [r for r in rows if str(r['monsterId']) not in ids]
            affected.add(key)
    for key, rows in build_drop_reverse(added).items():
        reverse.setdefault(key, []).extend(rows)
        affected.add(key)
    for key in affected:
        reverse[key].sort(key=lambda r: float(r['rate']), reverse=True)
    save('drop_reverse.json', reverse)
    write_data_bundle_js(ROOT / 'data/drop_reverse.bundle.js', 'drop_reverse', reverse)
    for prefix in {key[:3] for key in affected}:
        save(f'drop_reverse_shards/{prefix}.json', {k: v for k, v in reverse.items() if k.startswith(prefix)})
    manifest = load('drop_reverse_shards/manifest.json')
    manifest['shards'] = sorted({key[:3] for key in reverse})
    manifest['count'] = len(manifest['shards'])
    save('drop_reverse_shards/manifest.json', manifest)
    write_runtime_data_js(ROOT / 'data/runtime-data.js', {name: load(name + '.json') for name in ('items', 'monsters', 'magic', 'status', 'locations')})
    # Insert only the missing field, preserving every other source byte and line.
    import re
    for relative in ['raw/new/MONSTER_C.INI', 'raw/latest_setting/MONSTER_C.INI']:
        raw = ROOT / relative
        if not raw.exists():
            continue
        data = raw.read_bytes()
        blocks = re.split(rb'(?=^\[)', data, flags=re.M)
        for i, block in enumerate(blocks):
            match = re.search(rb'^ID\s*=\s*(\d+)', block, flags=re.M)
            if not match or match[1].decode('ascii') not in ids:
                continue
            if re.search(rb'^DropItem\s*=', block, flags=re.M):
                continue
            value = index[match[1].decode('ascii')]['DropItem'].encode('ascii')
            newline = b'\r\n' if b'\r\n' in block else b'\n'
            blocks[i] = block.rstrip(b'\r\n') + newline + b'DropItem = ' + value + newline + newline
        raw.write_bytes(b''.join(blocks))
    print('Updated monster data, runtime bundle, reverse lookup, shards and raw inputs.')

if __name__ == '__main__':
    main()

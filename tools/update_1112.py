"""Import the 2026-11-12 client update (SETTING extracted from the game's update.pak; same files as 拆包與歷史資料/1029深淵/1112).

Baseline is the website data after the 1105 import.
Client-table fields are replaced; website-only fields are kept:
  - monsters without DropItem in the client keep their legacy DropItem
  - 1029 announcement annotations (DropRevision / AnnouncedDrops / RemovedDrops) are kept
The drop reverse index is rebuilt and the 1029 annotations are re-applied
(the same steps reproduce the current data/drop_reverse.json exactly).

Usage: python tools/update_1112.py [--source <SETTING dir>]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import build_data as b

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path.home() / 'Desktop/1029深淵/1112/SETTING'
WEBSITE_ONLY_MONSTER_FIELDS = ('DropRevision', 'AnnouncedDrops', 'RemovedDrops')
ABYSS_GROUPS = (214, 215, 218, 219, 220, 221, 222, 223, 224, 225, 226, 231, 232, 233, 241)
TABLES = [('items', 'ITEM.INI'), ('monsters', 'MONSTER_C.INI'), ('magic', 'MAGIC.INI'), ('status', 'STATUS.INI')]


def load(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text('utf-8'))


def save(name, value, bundle=False):
    b.write_json(ROOT / 'data' / (name + '.json'), value)
    if bundle:
        b.write_data_bundle_js(ROOT / 'data' / (name + '.bundle.js'), name, value)


def records(source, name, sections=False):
    rows = b.parse_ini_records((source / name).read_bytes().decode('cp950'))
    return rows if sections else [b.record_to_plain(r) for r in rows]


def copy_lf(src, dst):
    # raw/ is stored with the client's CP950 bytes but LF line endings (the RPGViewer export uses CRLF).
    dst.write_bytes(src.read_bytes().replace(b'\r\n', b'\n'))


def merge_table(key, incoming, current):
    old = {r['ID']: r for r in current}
    order = [r['ID'] for r in current]
    added, changed, kept_drops = [], [], []
    for row in incoming:
        if key in ('items', 'monsters') and not b.is_real_named_row(row):
            continue
        previous = old.get(row['ID'])
        if key == 'monsters' and previous:
            if not b.parse_drop(b.drop_value(row)) and previous.get('DropItem'):
                row['DropItem'] = previous['DropItem']
                kept_drops.append(row['ID'])
            for field in WEBSITE_ONLY_MONSTER_FIELDS:
                if field in previous:
                    row[field] = previous[field]
        if previous is None:
            added.append({'id': row['ID'], 'name': row.get('Name')})
            order.append(row['ID'])
        elif row != previous:
            changed.append({'id': row['ID'], 'name': row.get('Name'),
                            'fields': {k: [previous.get(k), row.get(k)] for k in sorted(set(row) | set(previous)) if row.get(k) != previous.get(k)}})
        old[row['ID']] = row
    return [old[i] for i in order], {'added': added, 'changed': changed, 'keptLegacyDrops': len(kept_drops)}


def rebuild_drop_reverse(monsters):
    reverse = b.build_drop_reverse(monsters)
    for row in monsters:
        if not row.get('DropRevision'):
            continue
        for iid, entries in reverse.items():
            entries[:] = [e for e in entries if not (str(e['monsterId']) == row['ID'] and iid in row['RemovedDrops'])]
            for entry in entries:
                if str(entry['monsterId']) == row['ID']:
                    entry.update(rate=None, revision=row['DropRevision'])
        for iid in row['AnnouncedDrops']:
            if not any(str(e['monsterId']) == row['ID'] for e in reverse.get(iid, [])):
                reverse.setdefault(iid, []).append({'monsterId': row['ID'], 'monsterName': row['Name'], 'rate': None, 'weight': None, 'revision': row['DropRevision']})
    return reverse


def update_exchange_and_shops(source, item_rows):
    exchange = records(source, 'EXCHANGE.INI')
    save('exchange', exchange)
    # EXCHANGE ids were renumbered this week (35 rows inserted), so the abyss exchange index
    # (tools/finish_1029.py, same groups) is rebuilt to keep its ids in step.
    names_by_id = {r['ID']: r for r in item_rows}
    rows = []
    for row in exchange:
        if int(row.get('Group', 0)) not in ABYSS_GROUPS:
            continue
        parts = lambda kind: [{'id': row[k], 'count': int(row.get(k + 'Count', 1))} for k in row
                              if k.startswith(kind) and k[len(kind):].isdigit() and row[k] != '0']
        rows.append({'id': row['ID'], 'group': int(row['Group']), 'name': row['Name'], 'materials': parts('Material'), 'rewards': parts('Reward')})
    names = {q['id']: names_by_id.get(q['id'], {}).get('Name', q['id']) for r in rows for q in r['materials'] + r['rewards']}
    (ROOT / 'data/abyss-exchanges.js').write_text('window.SZO_ABYSS_EXCHANGES=' + json.dumps({'rows': rows, 'names': names}, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    # Preserve NPC/shop metadata, replacing only the inventory supplied by SHOP.INI.
    shops = load('shop_all')
    index = {str(r['shopId']): r for r in shops['shops']}
    items = {r['ID']: r for r in item_rows}
    for row in records(source, 'SHOP.INI'):
        if not row.get('ID'):
            continue
        entries = {}
        for mode in ('Sell', 'Buy'):
            values = row.get(mode, [])
            if isinstance(values, str):
                values = [values]
            for value in values:
                parts = value.split(',')
                if len(parts) < 2:
                    continue
                iid = parts[0].strip()
                item = items.get(iid)
                if not item:
                    continue
                entry = entries.setdefault(iid, {'itemId': int(iid), 'name': item['Name'], 'icon': item.get('Icon', ''), 'type': item.get('Type', ''),
                                                 'value': int(item.get('Value') or 0), 'sellPercent': None, 'sellPrice': None, 'buyPercent': None, 'buyPrice': None})
                percent = float(parts[1])
                entry[mode.lower() + 'Percent'] = percent
                entry[mode.lower() + 'Price'] = round(entry['value'] * percent / 100)
        index[row['ID']] = {**index.get(row['ID'], {}), 'shopId': int(row['ID']), 'items': list(entries.values())}
    shops['shops'] = list(index.values())
    shops['version'] = 'shop-1112'
    # shop_all.json is kept indented with whole-number percents, as it was before this import.
    def whole(x):
        if isinstance(x, float) and x.is_integer(): return int(x)
        if isinstance(x, list): return [whole(i) for i in x]
        if isinstance(x, dict): return {k: whole(v) for k, v in x.items()}
        return x
    (ROOT / 'data/shop_all.json').write_text(json.dumps(whole(shops), ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()
    source = args.source
    report = {'source': str(source)}
    tables = {}
    for key, filename in TABLES:
        tables[key], report[key] = merge_table(key, records(source, filename), load(key))
        save(key, tables[key], True)

    jewels = records(source, 'JEWEL_C.INI', True)
    gemdata = {'version': '1112', 'gems': {r['ID']: b.record_to_plain(r) for r in jewels if r.get('_section') == 'LIST'},
               'slots': [b.record_to_plain(r) for r in jewels if r.get('_section') == 'SLOT']}
    save('jewels', gemdata)
    (ROOT / 'data/jewels.js').write_text('window.SZO_JEWELS=' + json.dumps(gemdata, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

    reverse = rebuild_drop_reverse(tables['monsters'])
    save('drop_reverse', reverse, True)
    b.write_drop_reverse_shards(reverse)

    search = {'items': [{'id': r['ID'], 'name': r['Name'], 'type': r.get('Type', ''), 'level': r.get('Level', '')} for r in tables['items']],
              'monsters': [{'id': r['ID'], 'name': r['Name'], 'level': r.get('Level', ''), 'type': r.get('Type', ''), 'subType': r.get('SubType', ''), 'exp': r.get('DropExp', '')} for r in tables['monsters']]}
    save('search_index', search, True)
    for kind in ('items', 'monsters'):
        b.write_data_bundle_js(ROOT / f'data/search_{kind}.bundle.js', f'search_{kind}', {kind: search[kind]})
    b.write_runtime_data_js(ROOT / 'data/runtime-data.js', {**tables, 'locations': load('locations')})

    update_exchange_and_shops(source, tables['items'])

    # raw/ keeps the client tables used as the next baseline (UTF-8 copies would hide byte diffs, so copy as-is).
    latest = ROOT / 'raw/latest_setting'
    latest.mkdir(exist_ok=True)
    for path in source.iterdir():
        if path.is_file() and path.suffix.upper() == '.INI':
            copy_lf(path, latest / path.name)
    for name, dest in [('ITEM.INI', 'ITEM.INI'), ('MAGIC.INI', 'MAGIC.INI'), ('STATUS.INI', 'STATUS.INI'),
                       ('MONSTER_C.INI', 'new/MONSTER_C.INI'), ('CHANGEBODYITEM.INI', 'CHANGEBODYITEM.INI')]:
        copy_lf(source / name, ROOT / 'raw' / dest)
    (ROOT / 'raw/JEWEL_C.INI').write_text((source / 'JEWEL_C.INI').read_bytes().decode('cp950').replace('\r\n', '\n'), encoding='utf-8', newline='\n')

    b.write_json(ROOT / 'reports/update_1112_data.json', report)
    print({k: {'added': len(v['added']), 'changed': len(v['changed']), 'keptLegacyDrops': v['keptLegacyDrops']} for k, v in report.items() if isinstance(v, dict)})
    subprocess.run([sys.executable, str(ROOT / 'tools/sync_collectbook_drops.py')], cwd=ROOT, check=True)
    # box contents shown on item pages (錦囊/寶箱) come from the monsters' DropItem
    subprocess.run(['node', str(ROOT / 'tools/build_item_contents.cjs')], cwd=ROOT, check=True)


if __name__ == '__main__':
    main()

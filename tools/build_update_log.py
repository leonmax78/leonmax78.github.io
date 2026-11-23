#!/usr/bin/env python3
"""Build data/updates/: the 改版紀錄 page (js/pages/updates-page.js).

Input
  reports/update_MMDD_data.json   written by the weekly import (tools/update_MMDD.py):
      {items|monsters|magic|status: {added: [...], changed: [{id, name, fields: {Field: [old, new]}}]}}
  tools/data/update_notes.json    hand-written notes per week (exchanges, maps, things the
                                   data diff does not cover): {"2026-11-19": ["…", …]}

Output
  data/updates/index.json         [{d: "2026-11-19", n: {counts}}], newest first
  data/updates/YYYY-MM-DD.json    one week

Each week: notes, items/monsters/magic/status added [[id, name]] and changed
[[id, name, [[field, old, new], ...]]]; monster drop changes are split out as
drops: [[monsterId, monsterName, [[itemId, itemName, oldRate, newRate], ...]]] (rates in %,
null = not dropped), computed with the site's own drop parser (tools/build_data.py).
Picture / icon / sound fields are counted but not listed.

Usage: python3 tools/build_update_log.py [--year=2026]
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_data import parse_drop  # noqa: E402

YEAR = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--year=')), '2026')
HIDE = {'Icon', 'GIcon', 'Pic', 'Sound', 'Sound1', 'Sound2', 'Sound3', 'Sound4', 'Sound5', '_section', 'Log'}
J = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8'))


def names(path, key='Name'):
    try:
        return {str(x.get('ID')): x.get(key) or x.get('Name') or '' for x in J(path)}
    except Exception:
        return {}


item_name = names('data/items.json')
mon_name = names('data/monsters.json')
magic_name = names('data/magic.json')
status_name = names('data/status.json')
NAME = {'items': item_name, 'monsters': mon_name, 'magic': magic_name, 'status': status_name}
notes = J('tools/data/update_notes.json') if (ROOT / 'tools/data/update_notes.json').exists() else {}


def rates(drop):
    return {r['item_id']: round(r['rate'], 6) for r in parse_drop(drop or '')}


def week(path):
    rep = json.loads(path.read_text(encoding='utf-8'))
    mmdd = re.search(r'update_(\d{4})_data', path.name).group(1)
    day = f'{YEAR}-{mmdd[:2]}-{mmdd[2:]}'
    out = {'d': day, 'notes': notes.get(day, [])}
    for sec in ('items', 'monsters', 'magic', 'status'):
        part = rep.get(sec) or {}
        added = []
        for x in part.get('added') or []:
            i = str(x['id'] if isinstance(x, dict) else x)
            added.append([i, (x.get('name') if isinstance(x, dict) else '') or NAME[sec].get(i, '')])
        changed, hidden, drops = [], 0, []
        for x in part.get('changed') or []:
            f = x.get('fields') or {}
            # 舊格式（10/29）只記欄位名稱，沒有新舊值
            f = {k: [None, None] for k in f} if isinstance(f, list) else dict(f)
            if sec == 'monsters' and 'DropItem' in f and f['DropItem'][1] is not None:
                old, new = f.pop('DropItem')
                a, b = rates(old), rates(new)
                diff = [[i, item_name.get(i, ''), a.get(i), b.get(i)] for i in dict.fromkeys(list(a) + list(b))
                        if a.get(i) is None or b.get(i) is None or abs(a[i] - b[i]) > 1e-6]
                if diff: drops.append([str(x['id']), x.get('name') or mon_name.get(str(x['id']), ''), diff])
            shown = [[k, v[0], v[1]] for k, v in f.items() if k not in HIDE]
            hidden += sum(1 for k in f if k in HIDE)
            if shown: changed.append([str(x['id']), x.get('name') or NAME[sec].get(str(x['id']), ''), shown])
        out[sec] = {'added': added, 'changed': changed, 'art': hidden}
        if sec == 'monsters': out[sec]['drops'] = drops
    return out


def main():
    dest = ROOT / 'data/updates'
    dest.mkdir(parents=True, exist_ok=True)
    index = []
    for path in sorted((ROOT / 'reports').glob('update_*_data.json')):
        w = week(path)
        (dest / f"{w['d']}.json").write_text(json.dumps(w, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        n = {'notes': len(w['notes']), 'drops': len(w['monsters']['drops'])}
        for sec in ('items', 'monsters', 'magic', 'status'):
            n[sec + '+'] = len(w[sec]['added']); n[sec + '~'] = len(w[sec]['changed'])
        index.append({'d': w['d'], 'n': n})
        print(w['d'], n)
    index.sort(key=lambda x: x['d'], reverse=True)
    (dest / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Build data/item-trade.js: where an item sells for the most and where it can be dismantled.

Used by the box / bag contents cards on the item page (js/pages/item-page.js).

  sell  data/shop_all.json   (SHOP.INI joined with item values; buyPrice = what the NPC pays)
        raw/latest_setting/NPC.INI  (NPC → Shop)
        data/stage_maps.json (NPC → map + coordinates; NPCs with no known spot are left out)
  dismantle  data/exchanges.json rows with k == '拆解' that take the item

Output: window.SZO_ITEM_TRADE = {itemId: {"s": [price, [[npc, map, npcId, x, y], ...]],
                                          "d": [[npc, map, npcId, x, y, [[id, name, count], ...], [[name, count], ...], 月服/免服], ...]}}
Only items that appear in some box's contents (data/item-contents.js) are written.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

contents = json.loads(re.sub(r'^\s*window\.SZO_ITEM_CONTENTS\s*=\s*|;\s*$', '', open(P('data/item-contents.js'), encoding='utf-8').read()))
wanted = {int(i) for c in contents.values() for i in c.get('ids', [])}

npc_ini = open(P('raw/latest_setting/NPC.INI'), encoding='cp950', errors='replace').read()
shop_npcs = {}
for blk in npc_ini.split('[')[1:]:
    i = re.search(r'^ID\s*=\s*(\d+)', blk, re.M)
    n = re.search(r'^Name\s*=\s*(.+)$', blk, re.M)
    s = re.search(r'^Shop\s*=\s*(\d+)', blk, re.M)
    if i and s: shop_npcs.setdefault(int(s.group(1)), []).append((int(i.group(1)), n.group(1).strip() if n else ''))

spot = {}
for st in json.load(open(P('data/stage_maps.json'), encoding='utf-8'))['stages']:
    for p in st.get('npcs', []):
        spot.setdefault(p['id'], (st['stageName'], p.get('coordX', 0), p.get('coordY', 0)))

buy = {}
for sh in json.load(open(P('data/shop_all.json'), encoding='utf-8'))['shops']:
    for it in sh['items']:
        if it.get('buyPercent') and it.get('buyPrice') and it['itemId'] in wanted:
            buy.setdefault(it['itemId'], []).append((int(it['buyPrice']), sh['shopId']))

out = {}
for iid, offers in buy.items():
    best, where = 0, []
    for price, sid in sorted(offers, reverse=True):
        placed = [(n, nm) for n, nm in shop_npcs.get(sid, []) if n in spot]
        if not placed or price < best: continue
        best = price
        for n, nm in placed:
            row = [nm, spot[n][0], n, spot[n][1], spot[n][2]]
            if not any(r[0] == nm and r[1] == row[1] for r in where): where.append(row)
    if best: out.setdefault(str(iid), {})['s'] = [best, where]

ex = json.load(open(P('data/exchanges.json'), encoding='utf-8'))
for r in ex['rows']:
    if r.get('k') != '拆解': continue
    mats = r.get('m') or []
    # only the item being dismantled (first material); later materials are fees (天鋼之心、機關軸心…)
    for name, cnt, mid in mats[:1]:
        if mid not in wanted or int(cnt) != 1: continue
        npc = ex['npcs'][r['p']] if isinstance(r.get('p'), int) and r['p'] < len(ex['npcs']) else {}
        place = (npc.get('p') or [[0, 0, '', 0, 0]])[0]
        if not place[2]: continue
        rewards = [[rid, rn, rc] for rn, rc, rid in r.get('r') or []]
        others = [[mn, mc] for mn, mc, mi in mats if mi != mid]
        row = [npc.get('n', ''), place[2], place[1], place[3], place[4], rewards, others, r.get('h') or '']
        d = out.setdefault(str(mid), {}).setdefault('d', [])
        if row not in d: d.append(row)

with open(P('data/item-trade.js'), 'w', encoding='utf-8') as f:
    f.write('window.SZO_ITEM_TRADE=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('items', len(out), 'sell', sum('s' in v for v in out.values()), 'dismantle', sum('d' in v for v in out.values()))

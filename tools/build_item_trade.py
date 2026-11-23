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

ALL = True  # data/item_trade.json covers every item (search); data/item-trade.js only box contents (item page cards)
contents = json.loads(re.sub(r'^\s*window\.SZO_ITEM_CONTENTS\s*=\s*|;\s*$', '', open(P('data/item-contents.js'), encoding='utf-8').read()))
box_ids = {int(i) for c in contents.values() for i in c.get('ids', [])}
wanted = {int(x['ID']) for x in json.load(open(P('data/items.json'), encoding='utf-8')) if str(x.get('ID', '')).isdigit()}

# NPC → shops placed on maps (data/stage_maps.json: npc.shops [{id, conds, server}] or npc.shop)
placed = {}   # shopId → [(npc name, map, npc id, x, y, conds text, server)]
for st in json.load(open(P('data/stage_maps.json'), encoding='utf-8'))['stages']:
    for p in st.get('npcs', []):
        for e in (p.get('shops') or [{'id': p.get('shop')}]):
            if not e or e.get('id') in (None, ''): continue
            cond = '、'.join(e.get('conds') or [])
            srv = e.get('server') if e.get('server') not in (None, '', 'both') else ''
            placed.setdefault(int(e['id']), []).append((p['name'], st['stageName'], p['id'], p.get('coordX', 0), p.get('coordY', 0), cond, srv))

buy = {}
for sh in json.load(open(P('data/shop_all.json'), encoding='utf-8'))['shops']:
    for it in sh['items']:
        if it.get('buyPercent') and it.get('buyPrice') and it['itemId'] in wanted:
            buy.setdefault(it['itemId'], []).append((int(it['buyPrice']), int(sh['shopId'])))

out = {}
for iid, offers in buy.items():
    # 人人都能賣的 NPC 優先；只有限制條件的（例如「限佔領此洞府的幫會」「限勇士」）才退而列出，並標明條件
    rows = [(price, r) for price, sid in offers for r in placed.get(sid, [])]
    if not rows: continue
    # 「選項「…」」只是打開商店要點的對話選項，不算限制
    free = [x for x in rows if all(c.startswith('選項') for c in x[1][5].split('、') if c)]
    pool = free or rows
    best = max(price for price, _ in pool)
    where = []
    for price, r in pool:
        if price != best: continue
        row = [r[0], r[1], r[2], r[3], r[4]] + ([r[5]] if r[5] or r[6] else []) + ([r[6]] if r[6] else [])
        if not any(w[0] == row[0] and w[1] == row[1] for w in where): where.append(row)
    out.setdefault(str(iid), {})['s'] = [best, where]

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

box = {k: v for k, v in out.items() if int(k) in box_ids}
with open(P('data/item-trade.js'), 'w', encoding='utf-8') as f:
    f.write('window.SZO_ITEM_TRADE=' + json.dumps(box, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(P('data/item_trade.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('box items', len(box), '/ all items', len(out), 'sell', sum('s' in v for v in out.values()), 'dismantle', sum('d' in v for v in out.values()))

"""2026-11-26: add the 秘境晶幣 第13季 rewards new this week to data/exchanges.json.

EXCHANGE.INI groups 214 (月服) / 215 (免服) gained 36 rows each (光速仙巧板、新絕代雙驕 武魂／封魂晶／秘笈／降神魂魄).
Rows already on the site are matched by (material, reward, server) and left alone; new ones are inserted after
the last existing row of the same server, in game order. The 絕代英雄戰旗 exchanges (groups 244 / 245) are already
in data/exchanges_limited.json with the same amounts, so they are not touched.

Usage: python3 tools/update_1126_exchanges.py <SETTING dir>
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import build_data as b  # noqa: E402

src = Path(sys.argv[1])
items = {r['ID']: r['Name'] for r in json.loads((ROOT / 'data/items.json').read_text('utf-8'))}
rows = [b.record_to_plain(r) for r in b.parse_ini_records((src / 'EXCHANGE.INI').read_bytes().decode('cp950'))]
P = ROOT / 'data/exchanges.json'
ex = json.loads(P.read_text('utf-8'))
SRV = {'214': '月服', '215': '免服'}
added = 0
for g, srv in SRV.items():
    h = 'S13大秘境・' + srv
    have = {(r['m'][0][1], r['r'][0][2], r['r'][0][1]) for r in ex['rows'] if r.get('h') == h}
    tmpl = next(r for r in ex['rows'] if r.get('h') == h)
    last = max(i for i, r in enumerate(ex['rows']) if r.get('h') == h)
    new = []
    for r in rows:
        if r.get('Group') != g or r.get('Material1') != '31711' or 'Material2' in r or 'Reward2' in r: continue
        key = (int(r['Material1Count']), int(r['Reward1']), int(r.get('Reward1Count', 1)))
        if key in have: continue
        new.append({'v': tmpl['v'], 'k': '兌換', 'p': tmpl['p'], 'g': tmpl['g'],
                    'm': [[items['31711'], key[0], 31711]], 'r': [[items[r['Reward1']], key[2], key[1]]], 'h': h})
    ex['rows'][last + 1:last + 1] = new
    added += len(new)
    print(h, '+', len(new))
ex['version'] = 'exchange-1126'
P.write_text(json.dumps(ex, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('added', added)

# 京城 百濟煉魂師: 悟心降魂玉 2 顆 → 勾芒／精靈王克里歐斯 1 魂魄 (MSG20 dialogue, same row shape as the other 悟心降魂玉 rows)
ex = json.loads(P.read_text('utf-8'))
last = max(i for i, r in enumerate(ex['rows']) if r.get('p') == 6 and r['m'][0][0] == '悟心降魂玉')
new = []
for hero in ('精靈王克里歐斯', '勾芒'):
    g = f'2顆轉為  1個「{hero}」魂魄！'
    if any(r.get('g') == g and r.get('p') == 6 for r in ex['rows']): continue
    new.append({'v': '中原（常駐）', 'k': '兌換', 'p': 6, 'g': g, 'm': [['悟心降魂玉', 2, 28179]], 'r': [[f'降神魂魄「{hero}」', 1, 0]],
                'l': '可一次換 1／10／100 份', 'c': '降神歷練 5 星 100 級以上，且須先召臨（裝備）該降神'})
ex['rows'][last + 1:last + 1] = new
P.write_text(json.dumps(ex, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('百濟煉魂師 +', len(new))

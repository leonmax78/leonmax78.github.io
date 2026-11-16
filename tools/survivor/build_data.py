"""倖存者小遊戲資料 → games/survivor-data.js

Monsters with an in-game portrait become enemies, grouped into six tiers by level so each
wave uses stronger monsters. High-star 封獸 are the bosses. Uses only data already on the site.
usage: python tools/survivor/build_data.py
"""
import json, os, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data'
have = {f[1:-4] for f in os.listdir(ROOT / 'assets/test-media/monster-portraits') if f.endswith('.png')}
mons = json.loads((DATA / 'monsters.json').read_text('utf-8'))
seen, pool = set(), []
for m in mons:
    pic, name = m.get('Pic'), (m.get('Name') or '').strip()
    if pic not in have or pic in seen or 'NO_ATTACK' in m.get('Flag', '') or not name or re.search(r'[測試]|GM|npc', name, re.I):
        continue
    lv = int(m.get('Level') or 0)
    if lv < 1 or lv > 260:
        continue
    seen.add(pic)
    pool.append([pic, name, lv])
pool.sort(key=lambda x: x[2])
n = len(pool)
tiers = [pool[n * i // 6: n * (i + 1) // 6] for i in range(6)]
# keep each tier to a varied sample
tiers = [t[:: max(1, len(t) // 36)][:36] for t in tiers]

beasts = json.loads(re.search(r'=(\[.*\])', (DATA / 'beasts.bundle.js').read_text('utf-8'), re.S).group(1))
boss = [[b['portrait'], b['name'], b.get('stars', 0)] for b in beasts
        if b.get('portrait') and (ROOT / b['portrait']).exists() and (b.get('stars') or 0) >= 5]
boss.sort(key=lambda x: x[2])
boss = boss[:: max(1, len(boss) // 12)][:12]

# 霹靂聯動的三張地圖，依難度排列：[stageId, 名稱, 難度說明, 起始怪物階級]
maps = [[190, '琉璃仙境', '簡單', 0], [202, '聖靈界線', '普通', 1], [227, '火宅佛獄', '困難', 2]]
maps = [m for m in maps if (ROOT / f'assets/test-media/stage-maps-webp/stage{m[0]:03d}.webp').exists()]
out = {'tiers': tiers, 'boss': boss, 'maps': maps}
(ROOT / 'games/survivor-data.js').write_text('window.SURVIVOR_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', 'utf-8')
print('tiers', [len(t) for t in tiers], [t[0][2] for t in tiers], 'boss', len(boss), [b[1] for b in boss], 'maps', maps)

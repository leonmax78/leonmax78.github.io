"""產生 data/training_spots.json：每張地圖（終末之塔按樓層）可打的怪物、等級、經驗與數量。

全站搜尋的「練功推薦」用它：角色等級 L 只能從等級 L～L+300 的怪物拿到經驗，
依「範圍內怪物每分鐘重生的經驗 ÷ 地圖面積」排出經驗最多、怪物最密集的地方。

重生時間取自遊戲 MAP/STAGEnnn.MPC 的怪物出生點（第 12 個欄位，單位 0.1 秒；
齊襄道 300＝30 秒，玩家實測吻合）。0＝不會自動重生（副本、樓層類地圖）。

用法：python3 tools/build_training_spots.py [遊戲資料夾（含 data1.pak、update.pak）]
"""
import json, statistics, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREEN = 800 * 600          # 遊戲畫面（原始像素）
BOSS_HP = 10_000_000        # 魔王不算練功怪
SKIP_IDS = {9029}           # 守關妖將（佔位設定）


def num(v):
    try:
        return int(float(v or 0))
    except (TypeError, ValueError):
        return 0


def respawns(game):
    """{(stageId, 怪物ID, rawX, rawY): 重生秒數}；update.pak 蓋過 data1.pak。"""
    src = (ROOT / 'tools/npc_shop_dialogs.py').read_text(encoding='utf-8')
    env = {'__file__': str(ROOT / 'tools/npc_shop_dialogs.py')}
    exec(src[:src.index("if __name__ == '__main__':")], env)
    files = {}
    for name in ('data1.pak', 'update.pak'):
        data = (Path(game) / name).read_bytes()
        for r in env['read_archive'](data):
            n = r['name'].lower()
            if n.startswith('map/stage') and n.endswith('.mpc') and n[9:12].isdigit():
                files[int(n[9:12])] = env['extract'](data, r)
    out = {}
    import struct
    for sid, data in files.items():
        h = struct.unpack_from('<16I', data)
        for p in range(h[6], h[8], 38):
            o = struct.unpack_from('<19H', data, p)
            if o[7] == 7001:
                out[(sid, o[9], o[1], o[2])] = o[11] / 10
    return out


def main():
    game = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/神州Online'
    resp = respawns(game)
    mons = {num(m['ID']): m for m in json.loads((ROOT / 'data/monsters.json').read_text(encoding='utf-8'))}
    st = json.loads((ROOT / 'data/stage_maps.json').read_text(encoding='utf-8'))
    st = st['stages'] if isinstance(st, dict) else st
    tx = (ROOT / 'data/map-taxonomy.js').read_text(encoding='utf-8')
    tx = json.loads(tx[tx.index('{'):tx.rstrip().rstrip(';').rindex('}') + 1]).get('stages', {})
    spots = []
    for s in st:
        ms = [m for m in s.get('monsters', []) if m.get('kind', 'monster') == 'monster']
        if not ms:
            continue
        ratios = [m['rawX'] / m['x'] for m in ms if m.get('x')] or [8]
        raw = statistics.median(ratios)
        zones = [(f"{s['stageName']} {a['floor']}樓", a['bounds']) for a in s.get('areas', [])] if s.get('mapCategory') == 'tower' else [(s['stageName'], [0, 0, s['width'], s['height']])]
        for name, (x0, y0, x1, y1) in zones:
            cnt = {}
            for m in ms:
                if not (x0 <= m['x'] <= x1 and y0 <= m['y'] <= y1) or m['id'] in SKIP_IDS:
                    continue
                d = mons.get(m['id'])
                if not d or num(d.get('HP')) >= BOSS_HP or num(d.get('DropExp')) <= 0:
                    continue
                k = (m['id'], resp.get((s['stageId'], m['id'], m.get('rawX'), m.get('rawY')), -1))
                cnt[k] = cnt.get(k, 0) + 1
            if not cnt:
                continue
            screens = max(1.0, (x1 - x0) * (y1 - y0) * raw * raw / SCREEN)
            spots.append({
                's': s['stageId'], 'n': name, 'g': (tx.get(str(s['stageId'])) or {}).get('group', '其他'), 'sec': (tx.get(str(s['stageId'])) or {}).get('section', '其他'),
                'a': round(screens, 2),
                'm': [[mons[i]['Name'], num(mons[i]['Level']), num(mons[i]['DropExp']), c, r] for (i, r), c in sorted(cnt.items(), key=lambda x: (num(mons[x[0][0]]['Level']), x[0][1]))]})
    out = ROOT / 'data/training_spots.json'
    out.write_text(json.dumps({'note': '角色等級 L 可從 L～L+300 等的怪物拿到經驗；g／sec＝地圖分類；a＝地圖約幾個畫面大；m＝[怪物, 等級, 經驗, 數量, 重生秒數（0＝不重生，-1＝不明）]', 'spots': spots}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('spots', len(spots), 'bytes', out.stat().st_size)


if __name__ == '__main__':
    main()

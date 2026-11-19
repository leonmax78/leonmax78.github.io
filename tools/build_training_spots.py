"""產生 data/training_spots.json：每張地圖（終末之塔按樓層）可打的怪物、等級、經驗與數量。

全站搜尋的「練功推薦」用它：角色等級 L 只能從等級 L～L+300 的怪物拿到經驗，
依「範圍內怪物每分鐘重生的經驗 ÷ 地圖面積」排出經驗最多、怪物最密集的地方。

重生時間取自遊戲 MAP/STAGEnnn.MPC 的怪物出生點（第 12 個欄位，單位 0.1 秒；
齊襄道 300＝30 秒，玩家實測吻合）。0＝不會自動重生（副本、樓層類地圖）。

定點：SETTING/STAGE.INI 的 STAGE_FLAG_NOMARK＝不能記錄定點（傳送大法、傳情等），
只能在一小塊範圍掛；STAGE_FLAG_ForbidAutoPlay＝禁止自動掛機。每個出生點另存位置（p），
網頁依角色等級即時找出最好的掛機範圍。
障礙物：MPC 地圖格（32×32 原始像素＝圖上 4×4）第 4 個位元組非 0＝不能走（樹、水、建築、牆）。
另輸出 data/training_walk.json（8×8 圖上單位的粗格，網頁用它算走路距離，打不到牆後的怪、傳送後沿真的能走的路打回掛點）。

用法：python3 tools/build_training_spots.py [遊戲資料夾（含 data1.pak、update.pak）] [--overlay=本週解包資料夾]
"""
import json, re, statistics, sys
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


def respawns(game, overlay=None):
    """{(stageId, 怪物ID, rawX, rawY): 重生秒數}；update.pak 蓋過 data1.pak。"""
    src = (ROOT / 'tools/npc_shop_dialogs.py').read_text(encoding='utf-8')
    env = {'__file__': str(ROOT / 'tools/npc_shop_dialogs.py')}
    exec(src[:src.index("if __name__ == '__main__':")], env)
    files, stage_ini = {}, ''
    for name in ('data1.pak', 'update.pak'):
        data = (Path(game) / name).read_bytes()
        for r in env['read_archive'](data):
            n = r['name'].lower()
            if n.startswith('map/stage') and n.endswith('.mpc') and n[9:12].isdigit():
                files[int(n[9:12])] = env['extract'](data, r)
            elif n == 'setting/stage.ini':
                stage_ini = env['extract'](data, r).decode('cp950', 'replace')
    if overlay:  # an extracted weekly update (MAP/, SETTING/) laid over the install
        for f in (Path(overlay) / 'MAP').glob('*.MPC'):
            if f.stem[5:].isdigit():
                files[int(f.stem[5:])] = f.read_bytes()
        if (Path(overlay) / 'SETTING/STAGE.INI').exists():
            stage_ini = (Path(overlay) / 'SETTING/STAGE.INI').read_bytes().decode('cp950', 'replace')
    flags = {}
    for b in re.split(r'\n(?=\[)', stage_ini):
        i = re.search(r'^ID\s*=\s*(\d+)', b, re.M)
        f = re.search(r'^Flag\s*=\s*(.*)$', b, re.M)
        if i:
            f = f.group(1) if f else ''
            flags[int(i.group(1))] = ('STAGE_FLAG_NOMARK' in f) * 1 + ('STAGE_FLAG_ForbidAutoPlay' in f) * 2
    out, walk, gone = {}, {}, set()
    import struct
    import numpy as np
    for sid, data in files.items():
        h = struct.unpack_from('<16I', data)
        W, H = h[1], h[2]
        walk[sid] = np.frombuffer(data[64:64 + W * H * 8], dtype=np.uint8).reshape(H, W, 8)[:, :, 3] == 0
        # 物件第 6 個欄位＝群組；某隻怪死亡觸發的事件裡有「隱藏群組」（動作 47），而整張圖沒有任何事件
        # 會再「顯示」這個群組（動作 48）＝王打死後這群怪就不再出現（例如終末之塔 36 樓）
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.mpc', delete=False) as tf:
            tf.write(data)
        try:
            objs, ev = env['parse_mpc'](tf.name)
        finally:
            os.unlink(tf.name)
        shown = {a[3] for br in ev.values() for b in br for a in b['act'] if a[0] == 48}
        hidden = {a[3] for o in objs if o[7] == 7001 and o[8] in ev for b in ev[o[8]] for a in b['act'] if a[0] == 47}
        for o in objs:
            if o[7] == 7001:
                k = (sid, o[9], o[1], o[2])
                out[k] = o[11] / 10
                if o[5] in hidden and o[5] not in shown and o[11]:
                    out[k] = 0
                    gone.add(k)
    return out, flags, walk, gone


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--overlay')]
    overlay = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--overlay=')), None)
    game = args[0] if args else '/mnt/user-data/uploads/神州Online'
    resp, flags, walk, gone = respawns(game, overlay)
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
        # 圖上位置 → 遊戲座標（等角投影是線性的，用這張圖所有已知座標的點擬合）
        import numpy as np
        known = [(m['x'], m['y'], m['coordX'], m['coordY']) for m in s.get('monsters', []) + s.get('npcs', []) if m.get('coordX') is not None and m.get('x') is not None]
        aff = None
        if len(known) >= 3:
            A = np.array([[x, y, 1] for x, y, _, _ in known], float)
            cx = np.linalg.lstsq(A, np.array([k[2] for k in known], float), rcond=None)[0]
            cy = np.linalg.lstsq(A, np.array([k[3] for k in known], float), rcond=None)[0]
            aff = [round(v, 5) for v in list(cx) + list(cy)]
        for name, (x0, y0, x1, y1) in zones:
            cnt, pts = {}, []
            for m in ms:
                if not (x0 <= m['x'] <= x1 and y0 <= m['y'] <= y1) or m['id'] in SKIP_IDS:
                    continue
                d = mons.get(m['id'])
                if not d or num(d.get('HP')) >= BOSS_HP or num(d.get('DropExp')) <= 0:
                    continue
                k = (m['id'], resp.get((s['stageId'], m['id'], m.get('rawX'), m.get('rawY')), -1))
                cnt[k] = cnt.get(k, 0) + 1
                pts.append((k, round(m['x']), round(m['y'])))
            if not cnt:
                continue
            # 終末之塔：地圖檔在這層放了守關妖將（9029）＝會隨機出現，出現後約 1 小時不能掛
            gone_here = any((s['stageId'], m['id'], m.get('rawX'), m.get('rawY')) in gone and x0 <= m['x'] <= x1 and y0 <= m['y'] <= y1 for m in ms)
            guard = any(m['id'] in SKIP_IDS and x0 <= m['x'] <= x1 and y0 <= m['y'] <= y1 for m in ms) if s.get('mapCategory') == 'tower' else False
            screens = max(1.0, (x1 - x0) * (y1 - y0) * raw * raw / SCREEN)
            keys = sorted(cnt, key=lambda x: (num(mons[x[0]]['Level']), x[1]))
            ki = {k: i for i, k in enumerate(keys)}
            spots.append({
                's': s['stageId'], 'n': name, 'g': (tx.get(str(s['stageId'])) or {}).get('group', '其他'), 'sec': (tx.get(str(s['stageId'])) or {}).get('section', '其他'),
                'a': round(screens, 2),
                'f': flags.get(s['stageId'], 0) | (4 if guard else 0) | (8 if gone_here else 0), 'sw': round(800 / raw, 2), 'xy': aff,
                'img': s['image'], 'bb': [round(max(0, x0)), round(max(0, y0)), round(min(s['width'], x1)), round(min(s['height'], y1))], 'W': s['width'], 'H': s['height'],
                'm': [[mons[i]['Name'], num(mons[i]['Level']), num(mons[i]['DropExp']), cnt[(i, r)], r, 1 if num(mons[i].get('DropMoneyMax')) > 0 else 0] for i, r in keys],
                'p': [[ki[k], x, y] for k, x, y in pts]})
    import numpy as np
    # 粗格（8×8 圖上單位）：2×2 細格中至少 2 格可走就算可走；以連續長度編碼（36 進位，從不可走開始）
    used = {sp['s'] for sp in spots}
    wj = {}
    for sid in sorted(used):
        g = walk.get(sid)
        if g is None:
            continue
        H2, W2 = g.shape[0] // 2, g.shape[1] // 2
        c = g[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).sum(axis=(1, 3)) >= 2
        runs, cur, n = [], False, 0
        for v in c.ravel():
            if v == cur:
                n += 1
            else:
                runs.append(n); cur = v; n = 1
        runs.append(n)
        wj[str(sid)] = [int(W2), int(H2), ','.join(np.base_repr(r, 36).lower() for r in runs)]
    wp = ROOT / 'data/training_walk.json'
    wp.write_text(json.dumps(wj, separators=(',', ':')), encoding='utf-8')
    print('walk', len(wj), 'bytes', wp.stat().st_size)
    out = ROOT / 'data/training_spots.json'
    # 終末速行令：在塔底法陣使用後 15 分鐘內可直達的樓層（道具說明「直接前往終末之塔第 NN 層樓」）
    tok = sorted({int(m.group(1)) for it in json.loads((ROOT / 'data/items.json').read_text(encoding='utf-8'))
                  if str(it.get('Name', '')).startswith('終末速行令') for m in [re.search(r'前往終末之塔第\s*(\d+)\s*層', str(it.get('Help', '')))] if m})
    out.write_text(json.dumps({'tok': tok, 'note': '角色等級 L 可從 L～L+300 等的怪物拿到經驗；g／sec＝地圖分類；a＝地圖約幾個畫面大；m＝[怪物, 等級, 經驗, 數量, 重生秒數（0＝不重生，-1＝不明）, 會不會掉錢（1／0）]；p＝出生點 [m 的索引, 圖上x, 圖上y]；sw＝一個畫面寬（圖上單位）；xy＝圖上→遊戲座標 [ax,bx,cx,ay,by,cy]；f＝1 不能定點、2 禁止自動掛機、4 可能出現守關妖將、8 有怪在王打死後不再出現（這些怪的重生記為 0）；img＝地圖圖片（W×H 與圖上單位相同），bb＝這個練功點在圖上的範圍', 'spots': spots}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('spots', len(spots), 'bytes', out.stat().st_size)


if __name__ == '__main__':
    main()

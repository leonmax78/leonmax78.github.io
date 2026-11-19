"""Apply the 2026-11-19 map changes to data/stage_maps.json (拆包與歷史資料/1029深淵/1119).

- MPC changed: 祁州城 (6) +憐星 12099; 京城 (7) −蘇櫻 12103; 終末之塔ⅩⅥ (346) +1 monster;
  天外天密道 (395) −蘇櫻／江小魚 and its 46 monsters. Only the objects that differ between last week's
  MPC and this week's are added / removed; every other marker (and the site's own choices, e.g. city
  guards left off the map) stays as it is.
- NPC.INI: 12099 / 12100 鐵心蘭 → 憐星 (Pic 6389).
- New map 玄武宮外林 (396, stage396.mpc). The full map can't be rendered here, so the background is
  the game's own minimap SMAP396.SHP scaled to the site's map size (MPC tiles × 4).
stage349.mpc (a new 終末之塔ⅩⅨ layout) is not used by any STAGE yet, so it is left out.

Usage: python tools/update_1119_maps.py <update folder with SETTING/ MAP/ SHAPE/> <last week's MAP folder>
"""
import json, re, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from npc_shop_dialogs import parse_mpc  # noqa: E402

REBUILD = [6, 7, 346, 395]
NEW_STAGE = 396


def ini_blocks(path, tag):
    t = path.read_bytes().replace(b'\r\n', b'\n').decode('cp950', 'replace')
    out = {}
    for b in re.split(r'\n(?=\[' + tag + r'\])', t, flags=re.I):
        m = re.search(r'^ID\s*=\s*(\d+)', b, re.M)
        if m:
            out[int(m.group(1))] = dict(re.findall(r'^\s*(\w+)\s*=\s*(.*?)\s*$', b, re.M))
    return out


def main():
    src = Path(sys.argv[1])
    npcs = ini_blocks(src / 'SETTING/NPC.INI', 'NPC')
    stages = ini_blocks(src / 'SETTING/STAGE.INI', 'STAGE')
    mons = {int(m['ID']): m for m in json.loads((ROOT / 'data/monsters.json').read_text(encoding='utf-8'))}
    P = ROOT / 'data/stage_maps.json'
    data = json.loads(P.read_text(encoding='utf-8'))
    by_id = {s['stageId']: s for s in data['stages']}

    def markers(stage_id, mpc, old):
        raw = mpc.read_bytes()
        rows = struct.unpack_from('<16I', raw)[2]
        objs, _ = parse_mpc(str(mpc))
        keep = {(m.get('kind'), m['id'], m['rawX'], m['rawY']): m for m in old.get('monsters', []) + old.get('npcs', [])}
        out = {'monsters': [], 'npcs': []}
        added, kept = [], 0
        for o in objs:
            if o[7] == 7001 and o[9] in mons:
                kind, oid = 'monster', o[9]
                if '倒數' in mons[oid]['Name']:
                    continue
            elif o[7] in npcs:
                kind, oid = 'npc', o[7]
            else:
                continue
            k = (kind, oid, o[1], o[2])
            if k in keep:
                out[kind + 's'].append(keep[k]); kept += 1; continue
            base = {'kind': kind, 'id': oid, 'x': round(o[1] / 8), 'y': round(o[2] / 8), 'rawX': o[1], 'rawY': o[2],
                    'coordX': round(o[1] / 32), 'coordY': rows - round(o[2] / 32)}
            if kind == 'monster':
                m = mons[oid]
                row = {'kind': 'monster', 'id': oid, 'name': m['Name'], 'pic': int(m.get('Pic') or 0), 'level': int(m.get('Level') or 0), **{x: base[x] for x in ('x', 'y', 'rawX', 'rawY', 'coordX', 'coordY')}}
            else:
                n = npcs[oid]
                row = {'kind': 'npc', 'id': oid, 'name': n['Name'], 'pic': int(n.get('Pic') or 0), 'level': '', **{x: base[x] for x in ('x', 'y', 'rawX', 'rawY', 'coordX', 'coordY')},
                       'role': 'mission' if 'CHAR_MISSIONNPC' in n.get('Flag', '') else 'talk', 'shop': ''}
            out[kind + 's'].append(row); added.append((kind, row['name']))
        removed = len(keep) - kept
        return out, added, removed

    import collections
    prev = Path(sys.argv[2])
    for sid in REBUILD:
        s = by_id[sid]
        sig = lambda o: ('monster', o[9], o[1], o[2]) if o[7] == 7001 else ('npc', o[7], o[1], o[2])
        old = collections.Counter(sig(o) for o in parse_mpc(str(prev / f'STAGE{sid:03d}.MPC'))[0])
        new = collections.Counter(sig(o) for o in parse_mpc(str(src / f'MAP/STAGE{sid:03d}.MPC'))[0])
        gone, came = old - new, new - old
        before = len(s['monsters']) + len(s['npcs'])
        for key in ('monsters', 'npcs'):
            s[key] = [m for m in s[key] if (m.get('kind', 'monster'), m['id'], m['rawX'], m['rawY']) not in gone]
        removed = before - len(s['monsters']) - len(s['npcs'])
        fresh, added, _ = markers(sid, src / f'MAP/STAGE{sid:03d}.MPC', {})
        for key in ('monsters', 'npcs'):
            for m in fresh[key]:
                if (m['kind'], m['id'], m['rawX'], m['rawY']) in came:
                    for area in s.get('areas', []):  # 終末之塔: floor of the marker
                        x0, y0, x1, y1 = area['bounds']
                        if x0 <= m['x'] <= x1 and y0 <= m['y'] <= y1:
                            m.update(floor=area['floor'], areaKey=f"tower-floor-{area['floor']}", areaName=f"{area['floor']}樓", areaLabel=f"{area['floor']}樓")
                            break
                    s[key].append(m); print('  +', sid, m['kind'], m['name'], m.get('floor', ''))
        print(sid, s['stageName'], 'removed', removed)

    # NPC.INI renames (the same NPC id can stand on several maps)
    for s in data['stages']:
        for n in s.get('npcs', []):
            info = npcs.get(n['id'])
            if n['id'] in (12099, 12100) and info:
                n['name'], n['pic'] = info['Name'], int(info['Pic'])
                n.pop('rawPic', None)

    # New map 玄武宮外林
    st = stages[NEW_STAGE]
    mpc = src / f'MAP/STAGE{NEW_STAGE:03d}.MPC'
    w, h = struct.unpack_from('<16I', mpc.read_bytes())[1:3]
    sys.path.insert(0, str(ROOT / 'tools/survivor/extract'))
    img_path = ROOT / f'assets/test-media/stage-maps-webp/stage{NEW_STAGE}.webp'
    from PIL import Image
    import importlib.util
    import types
    if 'tkinter' not in sys.modules:  # szo_tool_fixed imports tkinter for its GUI only
        class _Any:
            def __init__(self, *a, **k): pass
            def __getattr__(self, n): return _Any
        tk = types.ModuleType('tkinter'); tk.__getattr__ = lambda n: _Any
        for name in ('tkinter', 'tkinter.filedialog', 'tkinter.messagebox', 'tkinter.ttk'):
            sys.modules[name] = tk
    spec = importlib.util.spec_from_file_location('szo', '/home/claude/work/render/szo_tool_fixed.py')
    if spec and Path(spec.origin).exists():
        T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
        im = T.decode_tlhs((src / f'SHAPE/SMAP/SMAP{NEW_STAGE}.SHP').read_bytes()).convert('RGB')
        im.resize((w * 4, h * 4), Image.LANCZOS).save(img_path, 'WEBP', quality=88, method=6)
    out, added, _ = markers(NEW_STAGE, mpc, {})
    entry = {'stageId': NEW_STAGE, 'stageName': st['Name'], 'image': f'assets/test-media/stage-maps-webp/stage{NEW_STAGE}.webp',
             'width': w * 4, 'height': h * 4, 'monsters': out['monsters'], 'npcs': out['npcs'], 'scale': 2,
             'flags': [f.strip() for f in st.get('Flag', '').split(',') if f.strip()], 'imageSource': 'minimap'}
    data['stages'] = sorted([s for s in data['stages'] if s['stageId'] != NEW_STAGE] + [entry], key=lambda s: s['stageId'])
    data['excludedStageIds'] = [i for i in data.get('excludedStageIds', []) if i != NEW_STAGE]
    data['version'] = 'stage-map-1119'
    print(NEW_STAGE, st['Name'], len(out['monsters']), 'monsters', [n['name'] for n in out['npcs']])
    P.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    X = ROOT / 'data/stage_map_index.json'
    ix = json.loads(X.read_text(encoding='utf-8'))
    if not any(s['stageId'] == NEW_STAGE for s in ix['stages']):
        ix['stages'] = sorted(ix['stages'] + [{'stageId': NEW_STAGE, 'stageName': st['Name']}], key=lambda s: s['stageId'])
    X.write_text(json.dumps(ix, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()

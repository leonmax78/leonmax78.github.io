"""Apply the 2026-11-26 map changes to data/stage_maps.json (update.pak of 27.0.0.5).

- 終末之塔ⅩⅨ (349, floors 181–190) is now in use (STAGE.INI 349 → stage349.mpc). The map image is rendered by
  tools/update_0903_stage_maps.py into a staging site folder (see below); this script takes that entry, then
  assigns floors the same way tools/build_tower_floors.py does: walkable MPC regions + the landing tags
  (object 10002, o[5]) in the order 41,42,43,45…51 → 181…190. Checked against the bosses: 183 食心槲寄生,
  186 驚骸大巨人, 189 奪朱間符王, 190 墮仙周太公 (one every three floors, as on the floors below).
- 終末之塔ⅩⅧ (348): 主宰化體 moved up to 190樓, 驚宇鬱嶓羅 / 終塔之寶 moved, +1 五嶽岩魔. Only the markers are
  refreshed (static scenery changed by four exit/teleport objects), the image stays.
- 洞府 / 大營 (38–40, 138–140): the 絕代血盟高峰決 hero BOSS spawn points are added as activity markers.

Usage:
  python3 tools/update_0903_stage_maps.py --site-root <staging> --update-root <update with MAP/ SETTING/ SHAPE/>
          --base-root <base with DATA1/{map,setting} DATA2/shape DATA5/shape> --stages 348 349 --version 1126
  python3 tools/update_1126_maps.py <staging> <update MAP dir>
"""
import json, re, shutil, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_tower_floors import components  # noqa: E402
from audit_mpc_transfers import parse  # noqa: E402

HEROES = {  # stage → hero monster ids placed for the event (STAGE0xx.MPC, 2026-11-26)
    38: (18341, 18347, 18348), 39: (18345, 18347, 18348), 40: (18343, 18347, 18348),
    138: (18342, 18346, 18348), 139: (18344, 18346, 18348), 140: (18340, 18346, 18348),
}
EVENT = '絕代血盟高峰決'


def floors(stage, mpc, first):
    """build_tower_floors.build() for one stage."""
    parsed = parse(mpc)
    regions, locate = components(mpc)
    order = [41, 42, 43, 45, 46, 47, 48, 49, 50, 51]
    membership = {}
    for o in parsed['objects']:
        if o[0] == 10002 and o[5] in order:
            region = locate(o[1], o[2]); floor = first + order.index(o[5])
            if region is None: raise ValueError((stage['stageId'], o[5], 'no region'))
            if region in membership and membership[region] != floor: raise ValueError((stage['stageId'], region, 'overlap'))
            membership[region] = floor
    stage['mapCategory'] = 'tower'
    stage['areas'] = []
    for floor in range(first, first + 10):
        points = [p for r, f in membership.items() if f == floor for p in regions[r]]
        assert points, (stage['stageId'], floor)
        cx = sum(x for x, y in points) / len(points); cy = sum(y for x, y in points) / len(points)
        x, y = min(points, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
        stage['areas'].append({'key': f'tower-floor-{floor}', 'floor': floor, 'label': f'{floor}樓', 'name': f'{floor}樓', 'x': x * 4, 'y': y * 4,
                               'bounds': [min(p[0] for p in points) * 4, min(p[1] for p in points) * 4, (max(p[0] for p in points) + 1) * 4, (max(p[1] for p in points) + 1) * 4]})
    loose = []
    for kind in ('monsters', 'npcs', 'chests'):
        for m in stage.get(kind, []):
            floor = membership.get(locate(m.get('rawX', m['x'] * 8), m.get('rawY', m['y'] * 8)))
            for key in ('floor', 'tower_floors', 'areaKey', 'areaName', 'areaLabel'): m.pop(key, None)
            if floor is not None:
                m.update(floor=floor, areaKey=f'tower-floor-{floor}', areaName=f'{floor}樓', areaLabel=f'{floor}樓')
            else:
                m.update(areaKey='tower-entry', areaName='候塔區', areaLabel='候塔區')
                loose.append((kind, m['name']))
    return loose


def chests(stage, mpc, monsters):
    """add_mpc_chests.py for one stage (o[9] = monster id)."""
    chest = {mid for mid, m in monsters.items() if re.search(r'寶箱|寶盒|寶匣', m.get('Name', '')) or m.get('Sound4') == 'openbox'}
    rows = []
    for o in parse(mpc)['objects']:
        mid = o[9]
        if mid in chest:
            m = monsters[mid]
            rows.append({'kind': 'monster', 'id': mid, 'name': m.get('Name', ''), 'pic': int(m.get('Pic') or 0), 'level': int(m.get('Level') or 1),
                         'x': round(o[1] / 8), 'y': round(o[2] / 8), 'rawX': o[1], 'rawY': o[2], 'source': mpc.name})
    stage['chests'] = rows


def coords(stage, mpc):
    rows = struct.unpack_from('<16I', mpc.read_bytes())[2]
    for kind in ('monsters', 'npcs', 'chests'):
        for m in stage.get(kind) or []:
            if 'rawX' in m:
                m['coordX'], m['coordY'] = round(m['rawX'] / 32), round(rows - m['rawY'] / 32)


def main(staging, map_dir):
    staging, map_dir = Path(staging), Path(map_dir)
    monsters = {int(m['ID']): m for m in json.loads((ROOT / 'data/monsters.json').read_text('utf-8'))}
    path = ROOT / 'data/stage_maps.json'
    data = json.loads(path.read_text('utf-8'))
    by_id = {s['stageId']: s for s in data['stages']}
    fresh = {s['stageId']: s for s in json.loads((staging / 'data/stage_maps.json').read_text('utf-8'))['stages'] if s['stageId'] in (348, 349)}
    mpc = lambda sid: map_dir / f'STAGE{sid:03d}.MPC'

    # 348: new marker positions, same image; 主宰化體 keeps its shop wherever it stands
    old_npc = {n['id']: n for n in by_id[348]['npcs']}
    shop_of = {k: old_npc[11440][k] for k in ('role', 'shop', 'shops') if k in old_npc.get(11440, {})}
    by_id[348]['monsters'] = fresh[348]['monsters']
    by_id[348]['npcs'] = fresh[348]['npcs']
    # 349: the whole rendered entry
    by_id[349] = fresh[349]
    shutil.copy2(staging / 'assets/test-media/stage-maps-webp/stage349.webp', ROOT / 'assets/test-media/stage-maps-webp/stage349.webp')
    for sid in (348, 349):
        for n in by_id[sid]['npcs']:
            if n['id'] == 11440: n.update(shop_of)
        chests(by_id[sid], mpc(sid), monsters)
        loose = floors(by_id[sid], mpc(sid), 171 if sid == 348 else 181)
        coords(by_id[sid], mpc(sid))
        print(sid, by_id[sid]['stageName'], 'monsters', len(by_id[sid]['monsters']), 'npcs', len(by_id[sid]['npcs']), 'chests', len(by_id[sid]['chests']), 'entry-area', loose)

    # 洞府 / 大營 hero BOSS spawn points
    for sid, ids in HEROES.items():
        st = by_id[sid]
        st['monsters'] = [m for m in st['monsters'] if m.get('activity') != EVENT]
        d = mpc(sid).read_bytes()
        start = struct.unpack_from('<I', d, 24)[0] + 2; end = struct.unpack_from('<I', d, 32)[0]
        scale = st.get('scale', 2)
        for off in range(start, end - 37, 38):
            x, y = struct.unpack_from('<2H', d, off); mid = struct.unpack_from('<H', d, off + 16)[0]
            if mid in ids:
                m = monsters[mid]
                st['monsters'].append({'kind': 'monster', 'id': mid, 'name': m['Name'], 'pic': int(m['Pic']), 'level': int(m.get('Level') or 0),
                                       'x': round(x / 16 * scale), 'y': round(y / 16 * scale), 'rawX': x, 'rawY': y, 'activity': EVENT})
        coords(st, mpc(sid))
        print(sid, st['stageName'], [m['name'] for m in st['monsters'] if m.get('activity') == EVENT])

    data['excludedStageIds'] = [s for s in data['excludedStageIds'] if s != 349]
    data['stages'] = [by_id[s] for s in sorted(by_id)]
    data['version'] = 'stage-map-1126'
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

    ipath = ROOT / 'data/stage_map_index.json'
    index = json.loads(ipath.read_text('utf-8'))
    index['stages'] = [{'stageId': s['stageId'], 'stageName': s['stageName']} for s in data['stages']]
    ipath.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    tpath = ROOT / 'data/map-taxonomy.js'
    tax = tpath.read_text('utf-8')
    if '"349": {' not in tax:
        tax = tax.replace('    "348": {\n      "section": "特殊地圖",\n      "group": "終末之塔"\n    },\n',
                          '    "348": {\n      "section": "特殊地圖",\n      "group": "終末之塔"\n    },\n    "349": {\n      "section": "特殊地圖",\n      "group": "終末之塔"\n    },\n', 1)
        assert '"349": {' in tax
        tpath.write_text(tax, encoding='utf-8')

    from sync_tower_locations import sync
    sync()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

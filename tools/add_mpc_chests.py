"""Add treasure chests placed in the MPC files to data/stage_maps.json.

Usage: python tools/add_mpc_chests.py <extracted MAP dir>

Chests are MPC objects (o[9] = monster id) whose monster is a chest: the name
contains 寶箱 / 寶盒 / 寶匣 or its open sound is "openbox". Most sit hidden until
a dungeon's boss falls, so the earlier map build left them out. Several chests
often share one spot (the variant you get depends on difficulty or clear time).
Stages that already list chests (通寶花園, 虛空大秘境) are kept as they are.
Positions follow the file's convention: x/y = raw / 8, coordX/coordY = raw / 16.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
src = (ROOT / 'tools/npc_shop_dialogs.py').read_text(encoding='utf-8')
exec(src[:src.index("if __name__ == '__main__':")])   # parse_mpc


def main(map_dir):
    monsters = {int(m['ID']): m for m in json.loads((ROOT / 'data/monsters.json').read_text(encoding='utf-8'))}
    chest = {mid for mid, m in monsters.items()
             if re.search(r'寶箱|寶盒|寶匣', m.get('Name', '')) or m.get('Sound4') == 'openbox'}
    path = ROOT / 'data/stage_maps.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    added = {}
    for stage in data['stages']:
        if stage.get('chests'):
            continue
        mpc = Path(map_dir) / f"STAGE{int(stage['stageId']):03d}.MPC"
        if not mpc.exists():
            continue
        objs, _ = parse_mpc(str(mpc))
        rows = []
        for o in objs:
            mid = o[9]
            if mid not in chest:
                continue
            m = monsters[mid]
            rx, ry = o[1], o[2]
            rows.append({'kind': 'monster', 'id': mid, 'name': m.get('Name', ''), 'pic': int(m.get('Pic') or 0),
                         'level': int(m.get('Level') or 1), 'x': round(rx / 8), 'y': round(ry / 8),
                         'rawX': rx, 'rawY': ry, 'coordX': rx // 16, 'coordY': ry // 16, 'source': mpc.name})
        if rows:
            stage['chests'] = rows
            added[stage['stageId']] = (stage['stageName'], len(rows))
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    for sid, (name, n) in sorted(added.items()):
        print(sid, name, n)
    print(len(added), 'stages got chests')


if __name__ == '__main__':
    main(sys.argv[1])

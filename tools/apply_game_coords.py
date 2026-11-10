"""Set coordX/coordY in data/stage_maps.json to the in-game coordinates players see.

Usage: python tools/apply_game_coords.py <extracted MAP dir>

In-game tile coordinates: x = rawX / 32, y = (map rows) − rawY / 32, rounded, where map
rows is the cell height in the MPC header. Checked in game: 京城 敖姬 (248, 103),
鬼城 城隍廟 (85, 125), 永劫刑場 牢獄 (235, 103). x/y (image pixels) and rawX/rawY are
unchanged. Safe to run again.
"""
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(map_dir):
    path = ROOT / 'data/stage_maps.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    changed = 0
    for stage in data['stages']:
        mpc = Path(map_dir) / f"STAGE{int(stage['stageId']):03d}.MPC"
        if not mpc.exists():
            continue
        rows = struct.unpack_from('<16I', mpc.read_bytes())[2]
        for kind in ('monsters', 'npcs', 'chests'):
            for m in stage.get(kind) or []:
                if 'rawX' not in m or 'rawY' not in m:
                    continue
                gx, gy = round(m['rawX'] / 32), round(rows - m['rawY'] / 32)
                if m.get('coordX') != gx or m.get('coordY') != gy:
                    m['coordX'], m['coordY'] = gx, gy
                    changed += 1
    data['coordinate'] = 'x/y are rendered MPC image pixels; coordX/coordY are in-game coordinates (rawX/32, map rows − rawY/32)'
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(changed, 'markers updated')


if __name__ == '__main__':
    main(sys.argv[1])

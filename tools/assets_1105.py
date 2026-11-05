"""Add the 2026-11-05 monster portraits rendered from the game install (C:/UserJoy/神州Online).

Portraits were rendered with SZOAssetTool's load_monster_portrait_candidate using the update's
SETTING/MONSTER2.OBD and DATA1/setting/stables.dat (exact colour-table recolour, no heuristics):
  - 15 new colour-table Pics (SP_ATTRIB_TABLE with MiscAttrib)
  - 8928 and the 15 deep-sea Pics whose BaseBias the update removed (now plain base sprites)
Not included yet: BIAS recolours (8522, 8983, 8987) and TABLE Pics without a table index (8978, 8984).

Usage: python tools/assets_1105.py <folder with rendered m{pic}.png>
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PICS = ['8970', '8971', '8972', '8973', '8974', '8975', '8976', '8977', '8979', '8980', '8981', '8982', '8985', '8986', '8988',
        '8928', '8920', '8921', '8922', '8923', '8924', '8925', '8926', '8927', '8929', '8930', '8931', '8932', '8934', '8935', '8938']
VERSION = 'assets-1105-portraits'


def main():
    source = Path(sys.argv[1])
    for pic in PICS:
        shutil.copyfile(source / f'm{pic}.png', ROOT / f'assets/test-media/monster-portraits/m{pic}.png')
    path = ROOT / 'data/asset_manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    pics = set(manifest['monsterPics']) | set(PICS)
    manifest['monsterPics'] = sorted(pics)
    manifest['counts']['monsterPics'] = len(manifest['monsterPics'])
    manifest['version'] = VERSION
    text = json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))
    path.write_text(text, encoding='utf-8')
    (ROOT / 'data/asset_manifest.bundle.js').write_text(
        'window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES["asset_manifest"]=' + text + ';\n', encoding='utf-8')
    print(f'{len(PICS)} portraits; monsterPics {len(manifest["monsterPics"])}')


if __name__ == '__main__':
    main()

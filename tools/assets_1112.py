"""Add the 2026-11-12 images: item icons, two monster portraits and the 寶石交易商 NPC portrait.

Rendered with SZOAssetTool from the update's SHAPE/ITEM (I6909…I6957; i6337 from data2.pak) and, for
the portraits, the 1105 game files + MONSTER2.OBD / NPC.OBD (unchanged this week):
  monster Pics 8989 (符兵．齧蛇), 8990 (奪朱間符王); NPC Pic 6359 (寶石交易商, front frame).
Only images the site does not have yet are copied; existing ones are left alone.

Usage: python tools/assets_1112.py <folder with icons/i####.png, m####.png, n6359.png>
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONSTER_PICS = ['8989', '8990']
NPC_PICS = ['6359']
VERSION = 'assets-1112'


def main():
    source = Path(sys.argv[1])
    media = ROOT / 'assets/test-media'
    icons = []
    for f in sorted((source / 'icons').glob('i*.png')):
        dest = media / 'item-icons' / f.name
        if not dest.exists():
            shutil.copyfile(f, dest)
            icons.append(f.stem[1:])
    for pic in MONSTER_PICS:
        shutil.copyfile(source / f'm{pic}.png', media / f'monster-portraits/m{pic}.png')
    for pic in NPC_PICS:
        shutil.copyfile(source / f'n{pic}.png', media / f'npc-portraits/n{pic}.png')
    path = ROOT / 'data/asset_manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    manifest['itemIcons'] = sorted(set(manifest['itemIcons']) | set(icons))
    manifest['monsterPics'] = sorted(set(manifest['monsterPics']) | set(MONSTER_PICS))
    manifest['counts']['itemIcons'] = len(manifest['itemIcons'])
    manifest['counts']['monsterPics'] = len(manifest['monsterPics'])
    manifest['version'] = VERSION
    text = json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))
    path.write_text(text, encoding='utf-8')
    (ROOT / 'data/asset_manifest.bundle.js').write_text(
        'window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES["asset_manifest"]=' + text + ';\n', encoding='utf-8')
    print(f'{len(icons)} new icons {icons}; portraits {MONSTER_PICS} {NPC_PICS}')


if __name__ == '__main__':
    main()

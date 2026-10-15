"""Refresh changed item icons while preserving all other curated media."""
import json
from pathlib import Path
import rebuild_assets_from_szo_tool as assets

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home()/'Desktop/1015'
TOOL = Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'

def main():
    tool = assets.load_tool(TOOL)
    audit = json.loads((ROOT/'reports/update_1015_audit.json').read_text(encoding='utf-8'))
    ids = {r['id'].split('#')[0] for r in audit['ITEM.INI'] if 'Icon' in r['fields']}
    items = json.loads((ROOT/'data/items.json').read_text(encoding='utf-8'))
    icons = {}
    for item in items:
        if item['ID'] in ids:
            icons[int(item['Icon'])] = item
    done, missing = [], []
    for icon, item in icons.items():
        hit = assets.find_itemwnd_icon_file_split(tool,SOURCE,SOURCE,icon)
        path = hit[0] if hit else tool.find_icon_file(SOURCE,icon,'i',item['Type'])
        if not path:
            if (ROOT/f'assets/test-media/item-icons/i{icon%10000:04}.png').exists():
                continue
            missing.append(icon)
            continue
        target = ROOT/f'assets/test-media/item-icons/i{icon%10000:04}.png'
        if not assets.write_png(tool.load_shape(path)[0],target,tool.trim_visible):
            raise RuntimeError(str(path))
        done.append(f'{icon%10000:04}')
    (ROOT/'reports/assets_1015.json').write_text(json.dumps({'updated':done,'missing':missing},indent=2),encoding='utf-8')
    path = ROOT/'data/asset_manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    manifest['itemIcons'] = sorted(set(manifest['itemIcons']) | set(done))
    manifest['counts']['itemIcons'] = len(manifest['itemIcons'])
    manifest['version'] = 'assets-1015-v611'
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'data/asset_manifest.bundle.js').write_text('window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES.asset_manifest='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')
    print(f'Updated {len(done)} icons; missing {missing}')

if __name__ == '__main__':
    main()

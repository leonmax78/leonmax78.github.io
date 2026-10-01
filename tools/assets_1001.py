"""Extract the missing crossover material icon from the supplied game assets."""
import json
from pathlib import Path
import rebuild_assets_from_szo_tool as assets

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/1001'
TOOL=Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'
tool=assets.load_tool(TOOL)
item=next(r for r in json.loads((ROOT/'data/items.json').read_text(encoding='utf-8')) if r['ID']=='32902')
icon=int(item['Icon'])
hit=assets.find_itemwnd_icon_file_split(tool,SOURCE,SOURCE,icon)
path=hit[0] if hit else tool.find_icon_file(SOURCE,icon,'i',item['Type'])
if not path:raise RuntimeError(f'Missing icon {icon}')
target=ROOT/f'assets/test-media/item-icons/i{icon%10000:04}.png'
assert assets.write_png(tool.load_shape(path)[0],target,tool.trim_visible)
p=ROOT/'data/asset_manifest.json'
m=json.loads(p.read_text(encoding='utf-8'))
m['itemIcons']=sorted(set(m['itemIcons'])|{f'{icon%10000:04}'})
m['counts']['itemIcons']=len(m['itemIcons'])
m['version']='assets-1001-v561'
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'data/asset_manifest.bundle.js').write_text('window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES.asset_manifest='+json.dumps(m,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')
print('PASS',item['Name'],target.name)

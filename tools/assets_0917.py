"""Export only missing 0917 icons/portraits; leave existing art untouched."""
import json
from pathlib import Path
import rebuild_assets_from_szo_tool as assets
from build_data import parse_ini_records, read_text

ROOT=Path(__file__).resolve().parents[1]
UPDATE=Path.home()/'Desktop/0917'
BASE=Path.home()/'Desktop/0702'
TOOL=Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'
tool=assets.load_tool(TOOL)
resolve=tool.resolve_shape_file
tool.resolve_shape_file=lambda root,directory,name: resolve(UPDATE,directory,name) or resolve(BASE,directory,name)
items=json.loads((ROOT/'data/items.json').read_text(encoding='utf-8'))
written=[]
for item in items:
    if int(item['ID']) not in range(32894,32902):continue
    icon=int(item['Icon']);target=ROOT/f'assets/test-media/item-icons/i{icon%10000:04}.png'
    if target.exists():continue
    hit=assets.find_itemwnd_icon_file_split(tool,UPDATE,UPDATE,icon) or assets.find_itemwnd_icon_file_split(tool,UPDATE,BASE,icon)
    path=hit[0] if hit else tool.find_icon_file(UPDATE,icon,'i',item['Type'])
    if not path:raise RuntimeError(f'Missing icon {icon}')
    frame=tool.load_shape(path)[0]
    assert assets.write_png(frame,target,tool.trim_visible)
    written.append(target.name)
objects=assets.parse_monster_objects(tool,UPDATE)
mons=json.loads((ROOT/'data/monsters.json').read_text(encoding='utf-8'))
for mon in mons:
    if mon['ID'] not in ('18193','18194'):continue
    pic=mon['Pic'];target=ROOT/f'assets/test-media/monster-portraits/m{pic}.png'
    if target.exists():continue
    obj=assets.resolve_monster_object(tool,mon,objects)
    candidate=tool.load_monster_portrait_candidate(UPDATE,pic,obj)
    if not candidate:raise RuntimeError(f'Missing portrait {pic}')
    assert assets.write_png(candidate[0],target,tool.trim_visible)
    written.append(target.name)
manifest_path=ROOT/'data/asset_manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for name in written:
    key='itemIcons' if name.startswith('i') else 'monsterPics'
    value=Path(name).stem[1:]
    if value not in manifest[key]:manifest[key].append(value)
manifest['version']='assets-0917-v540'
manifest['counts']['itemIcons']=len(manifest['itemIcons'])
manifest['counts']['monsterPics']=len(manifest['monsterPics'])
text=json.dumps(manifest,ensure_ascii=False,separators=(',',':'))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'data/asset_manifest.bundle.js').write_text('window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES.asset_manifest='+text+';',encoding='utf-8')
print(written)

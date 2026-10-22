"""Build the new map in isolation, preserving all curated existing maps."""
import json
import shutil
import sys
from pathlib import Path
import update_0903_stage_maps as renderer
from build_data import parse_ini_records, write_data_bundle_js, write_runtime_data_js
import rebuild_assets_from_szo_tool as assets

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Desktop/1022'
BASE = Path.home() / 'Desktop/1015'

def load(name):
    return json.loads((ROOT / 'data' / name).read_text(encoding='utf-8'))

def save(name, data):
    text = json.dumps(data, ensure_ascii=False, indent=2)+'\n' if name == 'asset_manifest.json' else json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    (ROOT / 'data' / name).write_text(text, encoding='utf-8')

def records(name):
    return parse_ini_records((SOURCE / 'SETTING' / name).read_bytes().decode('cp950'))

def main():
    staging = ROOT / 'outputs/map-1022-build'
    (staging / 'data').mkdir(parents=True, exist_ok=True)
    (staging / 'reports').mkdir(exist_ok=True)
    for name in ('stage_maps.json', 'stage_map_index.json'):
        shutil.copy2(ROOT / 'data' / name, staging / 'data' / name)
    sys.argv = ['renderer', '--site-root', str(staging), '--update-root', str(SOURCE), '--base-root', str(BASE), '--stages', '395', '--version', '1022']
    renderer.main()
    generated = json.loads((staging / 'data/stage_maps.json').read_text(encoding='utf-8'))
    stage = next(s for s in generated['stages'] if s['stageId'] == 395)
    assert stage['stageName'] == '天外天密道'
    raw_stage = next(r for r in records('STAGE.INI') if r.get('ID') == '395')
    stage['flags'] = raw_stage['Flag'].split(',')
    payload = load('stage_maps.json')
    payload['stages'] = sorted([s for s in payload['stages'] if s['stageId'] != 395] + [stage], key=lambda s:s['stageId'])
    payload['version'] = 'stage-map-1022-tianwaitian'
    payload['excludedStageIds'] = [sid for sid in payload.get('excludedStageIds', []) if sid != 395]
    overlay = renderer.load_module(renderer.DEFAULT_OVERLAY)
    overlay.ROOT = SOURCE
    overlay.read_text = lambda p:p.read_bytes().decode('cp950')
    npc_data = overlay.parse_npcs()
    capital = next(s for s in payload['stages'] if s['stageId'] == 7)
    new_npcs = [renderer.marker(row, capital['scale']) for row in overlay.parse_stage_npcs(7, npc_data)]
    old_by_key = {(n['id'], n['rawX'], n['rawY']): n for n in capital['npcs']}
    capital['npcs'] = [dict(old_by_key.get((n['id'],n['rawX'],n['rawY']), {}), **n) for n in new_npcs]
    save('stage_maps.json', payload)
    index = load('stage_map_index.json')
    index['version'] = payload['version']
    index['stages'] = [{'stageId':s['stageId'], 'stageName':s['stageName']} for s in payload['stages']]
    save('stage_map_index.json', index)
    for folder, ext in [('stage-maps','png'), ('stage-maps-webp','webp')]:
        shutil.copy2(staging / f'assets/test-media/{folder}/stage395.{ext}', ROOT / f'assets/test-media/{folder}/stage395.{ext}')

    # Add only map-related monster records; do not rebuild curated game data globally.
    ids = {str(m['id']) for m in stage['monsters']}
    additions = [r for r in records('MONSTER_C.INI') if r.get('ID') in ids]
    assert {r['ID'] for r in additions} == ids
    monsters = [r for r in load('monsters.json') if r['ID'] not in ids] + additions
    save('monsters.json', monsters)
    write_data_bundle_js(ROOT/'data/monsters.bundle.js', 'monsters', monsters)
    locations = load('locations.json')
    for row in additions:
        locations[row['Name']] = stage['stageName']
    save('locations.json', locations)
    write_data_bundle_js(ROOT/'data/locations.bundle.js', 'locations', locations)
    search = load('search_index.json')
    search['monsters'] = [r for r in search['monsters'] if str(r['id']) not in ids] + [{'id':r['ID'],'name':r['Name'],'level':r.get('Level',''),'type':r.get('Type',''),'subType':r.get('SubType',''),'exp':r.get('DropExp','')} for r in additions]
    save('search_index.json', search)
    write_data_bundle_js(ROOT/'data/search_index.bundle.js', 'search_index', search)
    write_data_bundle_js(ROOT/'data/search_monsters.bundle.js', 'search_monsters', {'monsters':search['monsters']})
    write_runtime_data_js(ROOT/'data/runtime-data.js', {name:load(name+'.json') for name in ('items','monsters','magic','status','locations')})

    tool = assets.load_tool(renderer.DEFAULT_OVERLAY.parent/'SZOAssetTool.pyw')
    manifest = load('asset_manifest.json')
    missing, added = [], []
    for icon in [26898, *range(29700,29760)]:
        target = ROOT / f'assets/test-media/item-icons/i{icon%10000:04}.png'
        hit = None
        for source in (SOURCE, BASE):
            found = assets.find_itemwnd_icon_file_split(tool, SOURCE, source, icon)
            hit = found[0] if found else tool.find_icon_file(source, icon, 'i', '')
            if hit:
                break
        if hit:
            assert assets.write_png(tool.load_shape(hit)[0], target, tool.trim_visible)
            added.append(f'{icon%10000:04}')
        elif not target.exists():
            missing.append(icon)
    manifest['itemIcons'] = sorted(set(manifest['itemIcons']) | set(added))
    manifest['counts']['itemIcons'] = len(manifest['itemIcons'])
    manifest['version'] = 'assets-1022-v629'
    save('asset_manifest.json', manifest)
    write_data_bundle_js(ROOT/'data/asset_manifest.bundle.js', 'asset_manifest', manifest)
    report = {'stageId':395,'stageName':stage['stageName'],'width':stage['width'],'height':stage['height'],'monsterPoints':len(stage['monsters']),'monsterIds':sorted(ids),'npcs':stage['npcs'],'capitalEventNPCs':[n for n in capital['npcs'] if n['id'] in (12103,12104,12105)],'iconsAdded':added,'iconsMissingFromExports':missing}
    (ROOT/'reports/update_1022_maps.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()

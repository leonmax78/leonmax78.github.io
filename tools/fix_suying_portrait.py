"""Correct the crossover NPC's erroneous shared Pic without changing game files."""
import json
from pathlib import Path
import update_0903_stage_maps as renderer
import rebuild_assets_from_szo_tool as assets

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home()/'Desktop/1022'
BASE = Path.home()/'Desktop/1015'

def apply(payload):
    for stage in payload['stages']:
        for npc in stage.get('npcs', []):
            if npc['id'] in (12103, 12104):
                assert npc['name'] == '蘇櫻'
                npc['rawPic'] = 6391
                npc['pic'] = 6394

def main():
    overlay = renderer.load_module(renderer.DEFAULT_OVERLAY)
    overlay.ROOT = SOURCE
    tool = assets.load_tool(renderer.DEFAULT_OVERLAY.parent/'SZOAssetTool.pyw')
    resolve = tool.resolve_shape_file
    tool.resolve_shape_file = lambda root, directory, name: resolve(SOURCE,directory,name) or resolve(BASE,directory,name)
    objects = overlay.build_npc_object_index(tool)
    assert any('蘇櫻' in obj.get('Name','') for obj in objects['6394'])
    result = overlay.load_npc_sprite(tool,objects,6394,12104)
    if result is None:
        raise RuntimeError('Missing original Suying sprite')
    target = ROOT/'assets/test-media/npc-portraits/n6394.png'
    assert assets.write_png(result[0],target,tool.trim_visible)
    path = ROOT/'data/stage_maps.json'
    payload = json.loads(path.read_text(encoding='utf-8'))
    apply(payload)
    path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('Corrected NPC 12103 / 12104 to NPC210 Suying (6394); Jiang Xiaoyu remains 6391.')

if __name__ == '__main__':
    main()

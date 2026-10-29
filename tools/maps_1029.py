"""Render four Abyss maps and refresh changed NPC placements only."""
import json
import shutil
import sys
import subprocess
from pathlib import Path
import update_0903_stage_maps as renderer
import rebuild_assets_from_szo_tool as assets
import build_data as b
from fix_suying_portrait import apply as fix_suying

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/1029深淵/1029'
BASE=ROOT/'outputs/1029-client'

def main():
    reuse='--reuse-render' in sys.argv
    staging=ROOT/'outputs/map-1029-build'
    for folder in ('data','reports'):(staging/folder).mkdir(parents=True,exist_ok=True)
    if not reuse:
        for name in ('stage_maps.json','stage_map_index.json'):shutil.copy2(ROOT/'data'/name,staging/'data'/name)
    # Overlay needs base-only object definitions as well as this week's updated ones.
    combined=ROOT/'outputs/1029-overlay'
    (combined/'SETTING').mkdir(parents=True,exist_ok=True)
    for source in (BASE/'DATA1/setting',SOURCE/'SETTING'):
        for path in source.iterdir():
            if path.is_file():shutil.copy2(path,combined/'SETTING'/path.name)
    for folder in ('MAP','SHAPE'):
        shutil.copytree(SOURCE/folder,combined/folder,dirs_exist_ok=True)
    sys.argv=['renderer','--site-root',str(staging),'--update-root',str(combined),'--base-root',str(BASE),'--stages','400','401','402','403','--version','1029']
    if not reuse:renderer.main()
    payload=json.loads((ROOT/'data/stage_maps.json').read_text('utf-8'))
    generated=json.loads((staging/'data/stage_maps.json').read_text('utf-8'))
    additions=[s for s in generated['stages'] if s['stageId'] in (400,401,402,403)]
    raw_stages={int(r['ID']):r for r in b.parse_ini_records((SOURCE/'SETTING/STAGE.INI').read_bytes().decode('cp950')) if r.get('ID')}
    for s in additions:
        s['flags']=raw_stages[s['stageId']].get('Flag','').split(',')
    payload['stages']=sorted([s for s in payload['stages'] if s['stageId'] not in (400,401,402,403)]+additions,key=lambda s:s['stageId'])
    payload['version']='stage-map-1029-abyss'
    payload['excludedStageIds']=[i for i in payload.get('excludedStageIds',[]) if i not in (400,401,402,403)]
    overlay=renderer.load_module(renderer.DEFAULT_OVERLAY);overlay.ROOT=combined
    overlay.read_text=lambda p:p.read_bytes().decode('cp950')
    npcs=overlay.parse_npcs()
    baseline=json.loads(subprocess.check_output(['git','show','1b2e11f2:data/stage_maps.json'],cwd=ROOT))
    for s in payload['stages']:
        if s['stageId'] not in (6,7,8,381):continue
        previous=next(r for r in baseline['stages'] if r['stageId']==s['stageId'])
        old={(n['id'],n['rawX'],n['rawY']):n for n in previous['npcs']}
        ids={n['id'] for n in previous['npcs']}
        s['npcs']=[dict(old.get((n['id'],n['rawX'],n['rawY']),{}),**n) for n in (renderer.marker(r,s['scale']) for r in overlay.parse_stage_npcs(s['stageId'],npcs)) if n['id'] in ids or n['name'] in ('錢莊理事','敖姬','副將程磊')]
    fix_suying(payload)
    b.write_json(ROOT/'data/stage_maps.json',payload)
    index=json.loads((ROOT/'data/stage_map_index.json').read_text('utf-8'))
    index.update(version=payload['version'],stages=[{'stageId':s['stageId'],'stageName':s['stageName']} for s in payload['stages']])
    b.write_json(ROOT/'data/stage_map_index.json',index)
    for s in additions:
        for folder,ext in [('stage-maps','png'),('stage-maps-webp','webp')]:
            name=f'stage{s["stageId"]}.{ext}'
            shutil.copy2(staging/f'assets/test-media/{folder}'/name,ROOT/f'assets/test-media/{folder}'/name)
    locations=json.loads((ROOT/'data/locations.json').read_text('utf-8'))
    for s in additions:
        for m in s['monsters']:
            places=locations.get(m['name'],'').split('、')
            locations[m['name']]='、'.join(dict.fromkeys([p for p in places if p]+[s['stageName']]))
    b.write_json(ROOT/'data/locations.json',locations)
    b.write_data_bundle_js(ROOT/'data/locations.bundle.js','locations',locations)
    b.write_runtime_data_js(ROOT/'data/runtime-data.js',{k:json.loads((ROOT/f'data/{k}.json').read_text('utf-8')) for k in ('items','monsters','magic','status','locations')})
    tool=assets.load_tool(renderer.DEFAULT_OVERLAY.with_name('SZOAssetTool.pyw'))
    resolve=tool.resolve_shape_file
    tool.resolve_shape_file=lambda root,directory,name:resolve(combined,directory,name) or resolve(BASE,directory,name)
    objects=assets.parse_monster_objects(tool,combined)
    monsters={r['ID']:r for r in json.loads((ROOT/'data/monsters.json').read_text('utf-8'))}
    manifest=json.loads((ROOT/'data/asset_manifest.json').read_text('utf-8'))
    missing=[];portraits=[]
    for m in {str(m['pic']):m for s in additions for m in s['monsters']}.values():
        row=monsters[str(m['id'])];obj=assets.resolve_monster_object(tool,row,objects)
        candidate=tool.load_monster_portrait_candidate(BASE,str(m['pic']),obj)
        if candidate and assets.write_png(candidate[0],ROOT/f'assets/test-media/monster-portraits/m{m["pic"]}.png',tool.trim_visible):portraits.append(str(m['pic']))
        else:missing.append(m)
    npcobjects=overlay.build_npc_object_index(tool)
    for s in payload['stages']:
        if s['stageId'] not in (6,7,8,381,400,401,402,403):continue
        for npc in s['npcs']:
            target=ROOT/f'assets/test-media/npc-portraits/n{npc["pic"]}.png'
            if target.exists():continue
            result=overlay.load_npc_sprite(tool,npcobjects,npc['pic'],npc['id'])
            if result:assets.write_png(result[0],target,tool.trim_visible)
            else:missing.append(npc)
    manifest['monsterPics']=sorted(set(manifest['monsterPics'])|set(portraits))
    manifest['counts']['monsterPics']=len(manifest['monsterPics'])
    b.write_json(ROOT/'data/asset_manifest.json',manifest)
    b.write_data_bundle_js(ROOT/'data/asset_manifest.bundle.js','asset_manifest',manifest)
    report={'maps':[{'id':s['stageId'],'name':s['stageName'],'monsters':len(s['monsters']),'npcs':len(s['npcs'])} for s in additions],'portraits':portraits,'missing':missing}
    b.write_json(ROOT/'reports/maps_1029.json',report)
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()

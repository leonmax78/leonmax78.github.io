"""Read-only client extraction for the October 29 maps and icons."""
import json
import mmap
import shutil
import sys
from pathlib import Path
import rebuild_assets_from_szo_tool as assets
import build_data as b

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/1029深淵/1029'
BASE=ROOT/'outputs/1029-client'
TOOL=Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'
sys.path.insert(0,str(ROOT.parents[1]/'appearance-changer'))
from read_update import read_archive,extract

def main():
    game=Path('C:/UserJoy/神州Online')
    for number in (1,2,5,6,7,8):
        count=0
        with (game/f'data{number}.pak').open('rb') as f,mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as data:
            for row in read_archive(data)[0]:
                name=row['name'].replace('\\','/').lower()
                if name.endswith('/'):
                    continue
                if number==2 and not name.startswith(('shape/item/','shape/npc/','shape/wall/','shape/bmap/','shape/magic/')):continue
                if number==5 and not name.startswith(('shape/stage/','shape/house/','shape/face/','shape/body/','shape/change/')):continue
                dest=(BASE/f'DATA{number}'/name).resolve()
                assert dest.is_relative_to(BASE.resolve())
                if not dest.exists():
                    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(extract(data,row));count+=1
        print('extracted',number,count,flush=True)
    tool=assets.load_tool(TOOL)
    manifest=json.loads((ROOT/'data/asset_manifest.json').read_text('utf-8'))
    audit=json.loads((ROOT/'reports/update_1029_data.json').read_text('utf-8'))
    ids=set(audit['items']['added'])|{r['id'] for r in audit['items']['changed'] if 'Icon' in r['fields']}
    items=json.loads((ROOT/'data/items.json').read_text('utf-8'))
    added=[];missing=[]
    for item in items:
        if item['ID'] not in ids:continue
        icon=int(item.get('Icon') or 0)
        if not icon:continue
        hit=assets.find_itemwnd_icon_file_split(tool,SOURCE,SOURCE,icon) or assets.find_itemwnd_icon_file_split(tool,SOURCE,BASE,icon)
        path=hit[0] if hit else None
        if not path:
            missing.append({'id':item['ID'],'icon':icon});continue
        suffix=f'{icon%10000:04}'
        assert assets.write_png(tool.load_shape(path)[0],ROOT/f'assets/test-media/item-icons/i{suffix}.png',tool.trim_visible)
        added.append(suffix)
    manifest['itemIcons']=sorted(set(manifest['itemIcons'])|set(added))
    manifest['counts']['itemIcons']=len(manifest['itemIcons'])
    manifest['version']='assets-1029-v642'
    (ROOT/'data/asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    b.write_data_bundle_js(ROOT/'data/asset_manifest.bundle.js','asset_manifest',manifest)
    b.write_json(ROOT/'reports/assets_1029.json',{'icons':sorted(set(added)),'missing':missing})
    print('icons',len(set(added)),'missing',missing,flush=True)

if __name__=='__main__':main()

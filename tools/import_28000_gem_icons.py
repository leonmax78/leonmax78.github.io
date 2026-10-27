"""Export only the 60 new gemstone icons; never modify client archives."""
import argparse
import hashlib
import json
import mmap
from pathlib import Path
import sys
import tempfile
from PIL import Image, ImageDraw
import rebuild_assets_from_szo_tool as assets

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('game',type=Path)
    parser.add_argument('setting',type=Path)
    parser.add_argument('--reader',type=Path,default=ROOT.parents[1]/'appearance-changer')
    parser.add_argument('--tool',type=Path,default=Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw')
    args=parser.parse_args()
    sys.path.insert(0,str(args.reader))
    from read_update import read_archive,extract
    tool=assets.load_tool(args.tool)
    definitions={int(row['ID']):row for row in tool.parse_ini_records(args.setting/'itemwnd.ini') if row.get('ID','').isdigit()}
    items=json.loads((ROOT/'data/items.json').read_text('utf-8'))
    affected=[row for row in items if 29700<=int(row.get('Icon') or 0)<=29759]
    report={'archive':'data2.pak','affectedItems':len(affected),'icons':[]}
    rendered=[]
    with (args.game/'data2.pak').open('rb') as f,mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as data,tempfile.TemporaryDirectory() as temp:
        rows={row['name'].lower():row for row in read_archive(data)[0]}
        for icon in range(29700,29760):
            suffix=str(icon%10000);entry=definitions[icon]
            assert entry['Normal'].lower()=='i'+suffix and entry['Dir'].strip('\\/').lower()=='item'
            assert 'ICON_ATTRIB_TABLE' not in entry.get('Attrib','')
            name=f'shape/item/i{suffix}.shp'
            raw=extract(data,rows[name])
            source=Path(temp)/f'i{suffix}.shp';source.write_bytes(raw)
            img=tool.trim_visible(tool.load_shape(source)[0]).convert('RGBA')
            assert img.getbbox(),name
            rendered.append((suffix,img))
            report['icons'].append({'icon':icon,'source':name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'width':img.width,'height':img.height})
    # Commit generated assets only after every source has decoded successfully.
    for suffix,img in rendered:img.save(ROOT/f'assets/test-media/item-icons/i{suffix}.png')
    manifest_path=ROOT/'data/asset_manifest.json'
    manifest=json.loads(manifest_path.read_text('utf-8'))
    manifest['itemIcons']=sorted(set(manifest['itemIcons'])|{suffix for suffix,_ in rendered})
    manifest['counts']['itemIcons']=len(manifest['itemIcons'])
    manifest['version']='assets-28000-gems-v639'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'data/asset_manifest.bundle.js').write_text('window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES.asset_manifest='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')
    (ROOT/'reports/28000-gem-icons.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    sheet=Image.new('RGB',(600,420),'#18212c');draw=ImageDraw.Draw(sheet)
    for i,(suffix,img) in enumerate(rendered):
        x,y=(i%10)*60,(i//10)*70
        sheet.paste(img,(x+(60-img.width)//2,y+3),img);draw.text((x+10,y+48),suffix,fill='white')
    (ROOT/'outputs').mkdir(exist_ok=True);sheet.save(ROOT/'outputs/28000-gem-icons.png')
    print(f'Exported {len(rendered)} icons for {len(affected)} items')

if __name__=='__main__':main()

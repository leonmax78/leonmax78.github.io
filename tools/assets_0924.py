"""Extract the newly released soul portraits and register their assets."""
import json
from pathlib import Path
import rebuild_assets_from_szo_tool as assets

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path.home()/'Desktop/0924'
TOOL=Path.home()/'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'
def main():
    tool=assets.load_tool(TOOL)
    souls=json.loads((ROOT/'data/soul.json').read_text(encoding='utf-8'))
    for soul in souls:
        if soul['ID'] not in (64,65):continue
        source=tool.changebody_portrait_file(SOURCE,soul)
        if not source:raise RuntimeError('Missing portrait: '+soul['Name'])
        assert assets.write_png(tool.load_shape(source)[0],ROOT/f"assets/test-media/soul-portraits/s{soul['ID']}.png",tool.trim_visible)
    p=ROOT/'data/asset_manifest.json'
    m=json.loads(p.read_text(encoding='utf-8'))
    m['soulIds']=sorted(set(m['soulIds'])|{'64','65'},key=int)
    m['counts']['soulPortraits']=len(m['soulIds'])
    m['version']='assets-0924-v550'
    p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'data/asset_manifest.bundle.js').write_text('window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};window.SZO_DATA_BUNDLES.asset_manifest='+json.dumps(m,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')
    print('PASS: soul portraits 64 and 65 extracted')
if __name__=='__main__':main()

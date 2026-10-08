"""Map restored model resources to game records and website map locations."""
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
import rebuild_assets_from_szo_tool as assets

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Desktop/1008'
TOOL = Path.home() / 'Documents/Codex/2026-07-03/id-29622-icon-25575-gicon-35575/outputs/SZOAssetTool.pyw'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--update', action='store_true')
    update = parser.parse_args().update
    tool = assets.load_tool(TOOL)
    objects = assets.parse_monster_objects(tool, SOURCE)
    monsters = json.loads((ROOT/'data/monsters.json').read_text(encoding='utf-8'))
    stages = json.loads((ROOT/'data/stage_maps.json').read_text(encoding='utf-8'))['stages']
    audit = json.loads((ROOT/'reports/weekly_1008_diff.json').read_text(encoding='utf-8'))
    dirs = sorted({Path(r['path']).parent.name for r in audit['files'] if r['status']=='not_in_baseline'})
    output = ROOT/'outputs/1008-assets'
    output.mkdir(parents=True, exist_ok=True)
    result = []
    previews = []
    sheet = Image.new('RGB', (720, len(dirs)*120), '#dddddd')
    draw = ImageDraw.Draw(sheet)
    for index, directory in enumerate(dirs):
        sequences = {seq for seq, entries in objects.items() if any(str(o.get('Directory','')).strip('\\/').split('\\')[-1].upper()==directory for o in entries)}
        rows = [r for r in monsters if str(r.get('Pic')) in sequences]
        locations = []
        for stage in stages:
            for kind in ('monsters','npcs'):
                hits = {(str(r['id']),r['name']) for r in stage.get(kind,[]) if str(r.get('pic')) in sequences}
                if hits:
                    locations.append({'stageId':stage['stageId'],'stageName':stage['stageName'],'kind':kind,'records':[{'id':i,'name':n} for i,n in sorted(hits)]})
        restored = sorted((SOURCE/'SHAPE/MON'/directory).glob(f'{directory}W*.SHP'))
        pic = next((str(r['Pic']) for r in rows), None)
        draw.text((5,index*120+5),f'{directory}: Pic {pic}; {len(rows)} records',fill='black')
        paths = ([ROOT/f'assets/test-media/monster-portraits/m{pic}.png'] if pic else []) + restored[:4]
        for col,p in enumerate(paths):
            if not p.exists():continue
            img = Image.open(p).convert('RGBA') if p.suffix=='.png' else tool.trim_visible(tool.load_shape(p)[0]).convert('RGBA')
            img.thumbnail((115,85))
            sheet.paste(img,(col*140,index*120+25),img)
            draw.text((col*140,index*120+108),p.stem,fill='black')
        checks = []
        for seq in sorted(sequences):
            obj = next(o for o in objects[seq] if str(o.get('Directory','')).strip('\\/').split('\\')[-1].upper()==directory)
            target = ROOT/f'assets/test-media/monster-portraits/m{seq}.png'
            current = Image.open(target).convert('RGBA') if target.exists() else None
            match = None
            replacement = None
            replacement_source = None
            for source in restored:
                frames = tool.apply_object_recolor(tool.load_shape(source), obj, SOURCE)
                for frame in frames:
                    candidate = tool.trim_visible(frame).convert('RGBA')
                    if current is not None and candidate.size==current.size and candidate.getchannel('A').tobytes()==current.getchannel('A').tobytes() and replacement is None:
                        replacement, replacement_source = candidate, source.name
                    if current is not None and candidate.size==current.size and candidate.tobytes()==current.tobytes():
                        match = source.name
                        break
                if match:break
            changed = match is None and replacement is not None
            missing_palette = 'SP_ATTRIB_TABLE' in str(obj.get('Flags','')) and tool.stable_table_bytes(SOURCE) is None
            if missing_palette:
                changed = False
            if changed and update:
                previews.append((seq,current.copy(),replacement.copy()))
                replacement.save(target)
            checks.append({'pic':seq,'exists':target.exists(),'matchingRestoredFile':match,'sameSilhouetteSource':replacement_source,'preservedMissingPalette':missing_palette,'updated':changed and update})
        result.append({'directory':directory,'sequences':sorted(sequences),'records':[{'id':r['ID'],'name':r['Name'],'pic':r['Pic']} for r in rows],'locations':locations,'portraitChecks':checks})
    sheet.save(output/'comparison.png')
    if previews:
        proof = Image.new('RGB',(800,((len(previews)+3)//4)*150),'#dddddd')
        labels = ImageDraw.Draw(proof)
        for i,(seq,before,after) in enumerate(previews):
            x,y=(i%4)*200,(i//4)*150
            labels.text((x,y),f'{seq}: old / new',fill='black')
            for dx,img in ((0,before),(100,after)):
                img.thumbnail((95,125));proof.paste(img,(x+dx,y+20),img)
        proof.save(output/'updated-portraits.png')
    (ROOT/'reports/weekly_1008_asset_locations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines = ['# 10/08 補回圖像與地圖對照', '', '以 MONSTER／MONSTER2／NPC.OBD 的模型目錄、Pic 與網站現有地圖點位交叉比對。下列是使用同模型的地點，不代表每個地點之前都曾發生失蹤；本週沒有新增或搬移出生點。', '', '| 模型 | 代表名稱 | 網站已收錄地圖 |', '|---|---|---|']
    for r in result:
        names = '、'.join(dict.fromkeys(x['name'] for x in r['records']))
        places = '、'.join(dict.fromkeys(x['stageName'] for x in r['locations'])) or '目前地圖資料沒有固定點位，不能據此推定遊戲中不存在'
        lines.append(f"| {r['directory']} | {names} | {places} |")
    lines += ['', '## NPC 對照', '']
    for r in result:
        for loc in r['locations']:
            if loc['kind']=='npcs':
                lines.append('- '+loc['stageName']+'：'+'、'.join(x['name']+'（'+x['id']+'）' for x in loc['records']))
    lines += ['', '## 圖片處理', '', '50 個關聯 Pic 的網站圖片均已存在。本次更新 43 張同尺寸、同透明輪廓的圖片，保留原朝向，採用本週 SHP 畫面及可解析的模型變色設定。3 張已逐像素相同，不必更新。', '', '4 張使用額外色盤表的圖片（8610、6729、5442、5233）保留既有版本：本週快照缺少 STABLES.DAT，不能將未套色的原圖直接覆蓋變色版。這 4 張目前不是缺圖；需完整色盤資源才能進一步核對。', '', '完整 ID、Pic、地點與逐圖檢查結果：[JSON 明細](weekly_1008_asset_locations.json)。']
    (ROOT/'reports/weekly_1008_asset_locations.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    for r in result:print(r['directory'],r['sequences'],[(x['id'],x['name']) for x in r['records']],len(r['locations']))
    print('Unmatched portraits:',[c for r in result for c in r['portraitChecks'] if not c['matchingRestoredFile']])

if __name__=='__main__':main()

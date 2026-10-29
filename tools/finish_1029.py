"""Build supplementary release indexes and audit the supplied announcements."""
import json
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import build_data as b
import rebuild_assets_from_szo_tool as assets
from assets_1029 import SOURCE,BASE,TOOL

ROOT=Path(__file__).resolve().parents[1]

def load(name):return json.loads((ROOT/f'data/{name}.json').read_text('utf-8'))

def main():
    items={r['ID']:r for r in load('items')}
    rows=[]
    for row in load('exchange'):
        if int(row.get('Group',0)) not in (214,215,218,219,220,221,222,223,224,225,226,231,232,233,241):continue
        parts=lambda kind:[{'id':row[k],'count':int(row.get(k+'Count',1))} for k in row if k.startswith(kind) and k[len(kind):].isdigit() and row[k]!='0']
        rows.append({'id':row['ID'],'group':int(row['Group']),'name':row['Name'],'materials':parts('Material'),'rewards':parts('Reward')})
    names={p['id']:items.get(p['id'],{}).get('Name',p['id']) for r in rows for p in r['materials']+r['rewards']}
    (ROOT/'data/abyss-exchanges.js').write_text('window.SZO_ABYSS_EXCHANGES='+json.dumps({'rows':rows,'names':names},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    manifest=load('asset_manifest');tool=assets.load_tool(TOOL)
    for soul in load('soul'):
        sid=str(soul['ID'])
        if sid not in ('67','68','70','71'):continue
        path=tool.changebody_portrait_file(SOURCE,soul) or tool.changebody_portrait_file(BASE,soul)
        assert path,f'Missing soul {sid}'
        assert assets.write_png(tool.load_shape(path)[0],ROOT/f'assets/test-media/soul-portraits/s{sid}.png',tool.trim_visible)
        if sid not in manifest['soulIds']:manifest['soulIds'].append(sid)
    manifest['counts']['soulPortraits']=len(manifest['soulIds'])
    b.write_json(ROOT/'data/asset_manifest.json',manifest)
    b.write_data_bundle_js(ROOT/'data/asset_manifest.bundle.js','asset_manifest',manifest)
    # Refresh curated collection reverse sources without rebuilding task/NPC annotations.
    reverse=load('drop_reverse');book=load('collectbook_sources')
    pending={r['ID']:r for r in load('monsters') if r.get('DropRevision')}
    for kind in ('weapon','artifact','recipe','beast'):
        for row in book.get(kind,[]):
            sources=row.get('reverseDrops',[])
            ids=set(map(str,row.get('allItemIds') or [row.get('itemId')]))
            sources[:]=[source for source in sources if not (set(pending.get(str(source.get('monsterId')),{}).get('RemovedDrops',[])) & ids)]
            for source in sources:
                m=pending.get(str(source.get('monsterId')))
                if m:source['rate']=None
            row['reverseDropCount']=len(sources)
    (ROOT/'data/collectbook_sources.json').write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    meta=load('build_meta');meta['built_at']=datetime.now(ZoneInfo('Asia/Taipei')).isoformat(timespec='seconds')
    meta['game_version']='27.0.0.1'
    for key in meta['counts']:meta['counts'][key]=len(load(key))
    b.write_json(ROOT/'data/build_meta.json',meta);b.write_data_bundle_js(ROOT/'data/build_meta.bundle.js','build_meta',meta)
    report=json.loads((ROOT/'reports/update_1029_data.json').read_text('utf-8'))
    lines=['# 10/29 深淵更新待確認','', '新版已提供四張地圖、寶石設定、兌換材料與兩款錦囊機率。以下公告掉落缺新版權重；網站不顯示舊機率，公告移除的品項已自查詢排除。','', '| ID | 名稱 | 狀態 |','|---|---|---|']
    lines += [f'| {r["id"]} | {r["name"]} | '+('終末之塔寶石形狀／品級與機率待補' if r['tower'] else '新版機率待補')+' |' for r in report['pendingDrops']]
    lines += ['', '下次更新重新拆 UPDATE.pak，比對上述 MONSTER_C.INI DropItem；不要將公告新增品項設為等機率。','', '寶石門檻已依 10/29 JEWEL_C.INI 更新：5,000 等 14 孔、20,000 等 30 孔。','', '公告「神州深淵錦囊」第12獎寫作秘藏箱Ⅳ；封包實際指向 32962 神魂寶石秘藏袋Ⅳ，網站採封包道具名稱。','公告商品包兌換段落寫「神州龍川提貨券」，與本次深淵提貨券不一致，不據此修改道具 ID。']
    (ROOT/'docs/next-update-1029-drops.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    for name in ('soul','jiangshen','shop_all'):
        (ROOT/f'data/{name}.json').write_text(json.dumps(load(name),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Exchange rows',len(rows),'soul portraits',manifest['counts']['soulPortraits'],'pending drops',len(report['pendingDrops']))

if __name__=='__main__':main()

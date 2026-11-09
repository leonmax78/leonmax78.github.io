"""Apply NPC -> shop mapping read from the game dialogue (MSG/STGMSG TRADE actions) to stage_maps.json.

Each npc gets `shops`: [{id, server: both|month|free, conds: [...], note}] and `shop` stays the
primary shop (first month/both entry) so older readers keep working. Mapping file is produced by
tools/npc_shop_dialogs.py from the current game install.
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools/data/npc_shop_dialogs_1105.json'
mapping = json.loads(src.read_text(encoding='utf-8'))
shop_ids = {s['shopId'] for s in json.loads((ROOT / 'data/shop_all.json').read_text(encoding='utf-8'))['shops']}
# Old war events (玄州、獄門峽…) no longer run: list only the everyday shop (user decision 2026-11-10).
# 終末之塔Ⅰ 主宰化體 has no shop there (user-confirmed); the 895 shop stays on 終末之塔ⅩⅧ.
NO_SHOP = {(284, 11440)}
path = ROOT / 'data/stage_maps.json'
data = json.loads(path.read_text(encoding='utf-8'))
changed = added = 0
for stage in data['stages']:
    for npc in stage.get('npcs', []):
        rows = [r for r in mapping.get(f"{stage['stageId']}:{npc['id']}", []) if r['id'] in shop_ids]
        if (stage['stageId'], npc['id']) in NO_SHOP:
            npc['shop'] = ''
            npc['role'] = 'talk'
            npc.pop('shops', None)
            continue
        rows = [r for r in rows if '事件期間' not in r.get('conds', [])]
        if not rows:
            continue
        for r in rows:
            if '平時' in r.get('conds', []):
                r['note'] = ''
                if len([x for x in rows if x['server'] in (r['server'], 'both') or r['server'] == 'both']) == 1:
                    r['conds'] = [c for c in r['conds'] if c != '平時']
        shops = [{k: v for k, v in r.items() if v not in ('', [])} for r in rows]
        primary = next((r['id'] for r in rows if r['server'] != 'free'), rows[0]['id'])
        if str(npc.get('shop') or '') != str(primary):
            changed += 1 if npc.get('shop') else 0
            added += 0 if npc.get('shop') else 1
        npc['shop'] = str(primary)
        npc['role'] = 'shop'
        npc['shops'] = shops
data['version'] = 'stage-map-1105-shop-dialogs'
path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'primary changed {changed}, newly marked {added}')
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_npc_index
build_npc_index.main()

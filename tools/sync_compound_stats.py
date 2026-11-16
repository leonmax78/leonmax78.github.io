"""以遊戲道具資料（data/items.json）校正裝備的 base_stats。

會更新兩份檔案中的 equipment[].base_stats：
  - data/compound_config.json
  - js/data/equip-compound-data.js（EQUIP_COMPOUND_DATA 內嵌備援）
其他欄位與排版不動。遊戲改版匯入 items.json 後可重跑；
tools/check_compound_vs_items.py 會在部署時提醒是否需要重跑。

用法：python3 tools/sync_compound_stats.py [--dry-run]
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# (items.json 欄位, base_stats 鍵, 預設標籤)；順序即寫入順序
FIELDS = [('Con', 'con', '體魄'), ('Str', 'str', '力量'), ('Int', 'int', '智慧'), ('Dex', 'dex', '敏捷'),
          ('HP', 'hp', '生命'), ('MP', 'mp', '精力'), (None, 'damage', '傷害'), ('MagicAttack', 'm_attack', '術法攻擊'),
          ('ExtraDef', 'def', '物防'), ('MagicDef', 'm_def', '術防'),
          ('IceDef', 'ice_def', '冰抗'), ('FireDef', 'fire_def', '火抗'), ('LightningDef', 'lightning_def', '雷抗'), ('DarkDef', 'dark_def', '冥抗'),
          ('IceAttack', 'ice_attack', '冰傷'), ('IceProb', 'ice_prob', '冰傷機率'), ('FireAttack', 'fire_attack', '火傷'), ('FireProb', 'fire_prob', '火傷機率'),
          ('LightningAttack', 'lightning_attack', '雷傷'), ('LightningProb', 'lightning_prob', '雷傷機率'),
          ('DarkAttack', 'dark_attack', '冥傷'), ('DarkProb', 'dark_prob', '冥傷機率'),
          ('ParalysisRes', 'paralysis_res', '麻痺抗性'), ('PosionRes', 'poison_res', '中毒抗性'),
          ('BlindRes', 'blind_res', '盲目抗性'), ('SilentRes', 'silent_res', '封咒抗性'),
          ('Attack', 'attack', '命中'), ('AttackRange', 'attack_range', '攻擊距離'),
          ('Durabulity', 'durability', '耐久'), ('Weight', 'weight', '重量')]
MANAGED = {k for _, k, _ in FIELDS}


def num(v):
    try:
        return int(float(v or 0))
    except (TypeError, ValueError):
        return 0


def rebuild(old, it):
    """依道具資料重建；保留標籤用字與 level／clevel 等非能力欄位。"""
    new = {}
    for src, key, label in FIELDS:
        lab = (old.get(key) or {}).get('label', label) if isinstance(old.get(key), dict) else label
        if key == 'damage':
            lo, hi = num(it.get('DamageMin')), num(it.get('DamageMax'))
            if lo or hi:
                new[key] = {'label': lab, 'min': lo, 'max': hi}
        elif num(it.get(src)):
            new[key] = {'label': lab, 'value': num(it.get(src))}
    for k, v in old.items():  # level、clevel 與其他未管理的欄位照舊放在後面
        if k not in MANAGED:
            new[k] = v
    if 'level' in old or num(it.get('Level')):
        new['level'] = num(it.get('Level')) if 'Level' in it else old.get('level')
    if 'clevel' in old or num(it.get('CLevel')):
        new['clevel'] = num(it.get('CLevel')) if 'CLevel' in it else old.get('clevel')
    return new


def sync(equipment, items):
    changed = []
    for e in equipment:
        it = items.get(str(e.get('item_id')))
        if not it:
            continue
        nb = rebuild(e.get('base_stats') or {}, it)
        if nb != e.get('base_stats'):
            changed.append(e['name'])
            e['base_stats'] = nb
    return changed


def main():
    dry = '--dry-run' in sys.argv
    items = {str(i['ID']): i for i in json.loads((ROOT / 'data/items.json').read_text(encoding='utf-8'))}
    # 1) data/compound_config.json（2 格縮排、結尾無換行）
    p = ROOT / 'data/compound_config.json'
    raw = p.read_text(encoding='utf-8')
    cfg = json.loads(raw)
    ch = sync(cfg['equipment'], items)
    print(f'compound_config.json：更新 {len(ch)} 件')
    if ch and not dry:
        p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''), encoding='utf-8')
    # 2) js/data/equip-compound-data.js
    p = ROOT / 'js/data/equip-compound-data.js'
    js = p.read_text(encoding='utf-8')
    i = js.index('{', js.index('EQUIP_COMPOUND_DATA'))
    data, end = json.JSONDecoder().raw_decode(js[i:])
    seg = js[i:i + end]
    if json.dumps(data, ensure_ascii=False, indent=2) != seg:
        sys.exit('equip-compound-data.js 的排版無法無損重寫，未更動')
    ch = sync(data['equipment'], items)
    print(f'equip-compound-data.js：更新 {len(ch)} 件')
    if ch and not dry:
        p.write_text(js[:i] + json.dumps(data, ensure_ascii=False, indent=2) + js[i + end:], encoding='utf-8')


if __name__ == '__main__':
    main()

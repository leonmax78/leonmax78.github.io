"""比對 data/compound_config.json 的裝備屬性與遊戲道具資料 data/items.json。

網站合成頁與角色模擬都以 items.json 為準，compound_config 的 base_stats 只是備援；
這個檢查在每次部署時列出兩者不一致的裝備，提醒遊戲改版後要不要同步原始資料。
只發出 GitHub Actions 警告，不會讓部署失敗。

用法：python3 tools/check_compound_vs_items.py [--strict]
  --strict  有差異時以結束碼 1 結束
"""
import json, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = [('Con', 'con', '體魄'), ('Str', 'str', '力量'), ('Int', 'int', '智慧'), ('Dex', 'dex', '敏捷'),
          ('HP', 'hp', '生命'), ('MP', 'mp', '精力'), ('ExtraDef', 'def', '物防'), ('MagicDef', 'm_def', '術防'),
          ('MagicAttack', 'm_attack', '術法攻擊'), ('Attack', 'attack', '命中'), ('AttackRange', 'attack_range', '攻擊距離'),
          ('IceAttack', 'ice_attack', '冰傷'), ('IceProb', 'ice_prob', '冰傷機率'), ('FireAttack', 'fire_attack', '火傷'),
          ('FireProb', 'fire_prob', '火傷機率'), ('LightningAttack', 'lightning_attack', '雷傷'),
          ('LightningProb', 'lightning_prob', '雷傷機率'), ('DarkAttack', 'dark_attack', '冥傷'), ('DarkProb', 'dark_prob', '冥傷機率'),
          ('ParalysisRes', 'paralysis_res', '麻痺抗性'), ('PosionRes', 'poison_res', '中毒抗性'),
          ('BlindRes', 'blind_res', '盲目抗性'), ('SilentRes', 'silent_res', '封咒抗性'),
          ('Durabulity', 'durability', '耐久'), ('Weight', 'weight', '重量')]


def num(v):
    try:
        return int(float(v or 0))
    except (TypeError, ValueError):
        return 0


def stat(bs, key):
    s = bs.get(key)
    return num(s.get('value') if isinstance(s, dict) else s)


def main():
    cfg = json.loads((ROOT / 'data/compound_config.json').read_text(encoding='utf-8'))
    items = {str(i['ID']): i for i in json.loads((ROOT / 'data/items.json').read_text(encoding='utf-8'))}
    problems = []
    for e in cfg.get('equipment', []):
        it = items.get(str(e.get('item_id')))
        if not it:
            problems.append((e['name'], ['道具資料裡找不到這個 ID']))
            continue
        bs, diffs = e.get('base_stats') or {}, []
        for src, key, label in FIELDS:
            a, b = stat(bs, key), num(it.get(src))
            if a != b:
                diffs.append(f'{label} {a}→{b}')
        d = bs.get('damage') or {}
        if (num(d.get('min')), num(d.get('max'))) != (num(it.get('DamageMin')), num(it.get('DamageMax'))):
            diffs.append(f"傷害 {num(d.get('min'))}-{num(d.get('max'))}→{num(it.get('DamageMin'))}-{num(it.get('DamageMax'))}")
        if diffs:
            problems.append((e['name'], diffs))
    gh = bool(__import__('os').environ.get('GITHUB_ACTIONS'))
    head = f'比對 {len(cfg.get("equipment", []))} 件裝備，{len(problems)} 件與道具資料不一致（左邊為 compound_config，右邊為 items.json）'
    print(('::warning title=合成資料與道具資料不一致::' + head + '，明細見這個步驟的紀錄') if gh and problems else head)
    for name, diffs in problems:
        print(f'  {name}：' + '、'.join(diffs))
    if problems and '--strict' in sys.argv:
        sys.exit(1)


if __name__ == '__main__':
    main()

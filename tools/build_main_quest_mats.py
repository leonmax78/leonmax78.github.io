"""主線所需道具一覽 → data/quest_main_mats.json

For every 資料片 group, add up what its 主線任務 ask you to hand in (quest 'ho'),
keeping only general materials (紀元裂片, 四聖諦, 天鐵 …) and leaving out the
quest's own pick-ups and kill drops (躁亂異魂, 混亂之魂 …).

An item counts as a quest-only pick-up when
  * the step that asks for it says to defeat monsters for it or pick it up on the map
    (打倒/擊敗/掉落/散落/砍除/拆下…), or
  * nobody drops or sells it, it appears in one quest series only and is cheap
    (Value < 10000), e.g. 能量積蓄體之一, or
  * only one monster drops it and it is cheap (a boss's quest drop, 靈王餘燼).
Output: {"group": [[itemId, name, qtyText], …]} in quest order.
usage: python tools/build_main_quest_mats.py
"""
import json, re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
LINK = re.compile(r'⟦[^⟧]*?,([^,⟧]+)⟧')
KILL = re.compile(r'散落|砍除|拆下|打倒|擊敗|擊殺|消滅|掃蕩|挫敗|粉碎|打敗|勇弒|斬殺|討伐|擊退|清除|掉落|拾取|殺死|剿滅|奪得')


UNIT = '個把顆枚片罈株塊滴粒張份根支瓶塊'
ZH = {'一': 1, '兩': 2, '二': 2, '三': 3, '四': 4, '五': 5}


def step_qtys(name, ho_qty, steps, portals):
    """'ho' lists each item once per quest, but a quest can ask for it in several steps
    (頂天之道: 紀元裂片 3 枚 × 4 重結界). Count every step that names it:
    「紀元裂片3枚」 or 「225個洋宇脈塵」; a step without a number uses the 'ho' amount.
    A portal that 「消耗一個「紀元裂片」」 counts too."""
    n = re.escape(name)
    out = []
    for s in steps:
        if name not in s:
            continue
        m = re.search(n + r'\s*(\d+)', s) or re.search(r'(\d+)\s*[' + UNIT + r']\s*' + n, s)
        out.append(m.group(1) if m else ho_qty)
    for p in portals or []:
        m = re.search(r'消耗\s*(\d+|[一兩二三四五])\s*[' + UNIT + r']?「' + n + '」', str(p[-1]))
        if m:
            out.append(str(ZH.get(m.group(1), m.group(1))))
    return out or [ho_qty]


def main():
    quests = json.loads((DATA / 'quests.json').read_text('utf-8'))
    rev = json.loads((DATA / 'drop_reverse.json').read_text('utf-8'))
    value = {str(x['ID']): int(float(x.get('Value') or 0)) for x in json.loads((DATA / 'items.json').read_text('utf-8'))}
    shop = {str(it['itemId']) for s in json.loads((DATA / 'shop_all.json').read_text('utf-8'))['shops'] for it in s['items']}
    trade = {str(x[2]) for r in json.loads((DATA / 'exchanges.json').read_text('utf-8'))['rows'] for x in r['m'] + r['r']}
    trade |= set(re.findall(r'"id":"(\d+)"', (DATA / 'abyss-exchanges.js').read_text('utf-8') + (DATA / 'recipe-flows.js').read_text('utf-8')))
    series = defaultdict(set)
    for q in quests['quests']:
        for x in q.get('ho', []) + q.get('it', []):
            series[str(x[0])].add(q['g'])

    def quest_only(iid, name, steps):
        base = re.sub(r'之[一二三四五六七八九]$', '', name)  # 能量積蓄體之一 → 能量積蓄體
        said = [s for s in steps if base in s]
        if said and any(KILL.search(s) for s in said):
            return True
        cheap = value.get(iid, 0) < 10000
        if not rev.get(iid) and iid not in shop and len(series[iid]) < 2 and cheap:
            return True
        drops = rev.get(iid, [])
        # one boss that always drops it (護界靈王 → 靈王餘燼)
        return len(drops) == 1 and value.get(iid, 0) <= 1000 and (iid not in shop or (drops[0].get('rate') or 0) >= 100)

    out = {}
    for g in quests['groups'].get('資料片任務', []):
        rows = {}
        for q in quests['quests']:
            if q['c'] != '資料片任務' or q['g'] != g or q.get('tag') != '主線任務':
                continue
            steps = [LINK.sub(r'\1', s) for s in q.get('s', [])]
            for iid, name, qty, _ in q.get('ho', []):
                iid = str(iid)
                if quest_only(iid, name, steps):
                    continue
                rows.setdefault(iid, [iid, name, []])[2].extend(step_qtys(name, str(qty).lstrip('×'), steps, q.get('pt', [])))
        if rows:
            res = []
            for iid, name, qtys in rows.values():
                nums = [int(x) for x in qtys if x.isdigit()]
                text = str(sum(nums)) if len(nums) == len(qtys) else '＋'.join(qtys)
                res.append([iid, name, text])
            out[g] = res
    (DATA / 'quest_main_mats.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    for g, rows in out.items():
        print(g, '、'.join(f'{n}×{q}' for _, n, q in rows))


if __name__ == '__main__':
    main()

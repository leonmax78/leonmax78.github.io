"""主線所需道具一覽 → data/quest_main_mats.json

For every 資料片 group, add up what its 主線任務 ask you to hand in (quest 'ho'),
keeping only general materials (紀元裂片, 四聖諦, 天鐵 …) and leaving out the
quest's own pick-ups and kill drops (躁亂異魂, 混亂之魂 …).

An item is listed when it shows up in a monster/box drop list (drop_reverse), a shop
or an exchange — i.e. something players can prepare. Items found nowhere else only
drop while the quest is active, so they are left out (躁亂異魂, 混亂之魂 …).
Output: {"group": [[itemId, name, qtyText], …]} in quest order.
usage: python tools/build_main_quest_mats.py
"""
import json, re
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
    shop = {str(it['itemId']) for s in json.loads((DATA / 'shop_all.json').read_text('utf-8'))['shops'] for it in s['items'] if it.get('sellPrice') is not None}  # sold, not only bought back
    trade = {str(x[2]) for r in json.loads((DATA / 'exchanges.json').read_text('utf-8'))['rows'] for x in r['m'] + r['r']}
    trade |= set(re.findall(r'"id":"(\d+)"', (DATA / 'abyss-exchanges.js').read_text('utf-8') + (DATA / 'recipe-flows.js').read_text('utf-8')))

    def quest_only(iid, name, steps):
        # Owner's rule: anything you can see in a drop list (or buy / exchange) can be
        # prepared beforehand; items no monster list shows only drop while the quest is active.
        return not rev.get(iid) and iid not in shop and iid not in trade

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

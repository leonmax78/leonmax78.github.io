"""產生 data/quest_starts.json：任務敘述沒寫出接任務 NPC 時，從 NPC 對話找接任務的人。

任務頁「接任務」那一行優先用任務敘述（MISSION.INI）裡的第一個 NPC 連結；
沒有的任務，若只有一位 NPC 的對話有「任務「名稱」」選項且地圖上找得到他，就記在這裡。
輸出：{任務ID: [地圖ID, NPC ID, 遊戲座標X, 遊戲座標Y, NPC名稱]}

用法：python3 tools/build_quest_starts.py
"""
import json, re, glob, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NPC_LINK = re.compile(r'⟦\d+,[1-9]\d*,\d+,\d+,[^⟧]+⟧')


def main():
    q = json.loads((ROOT / 'data/quests.json').read_text(encoding='utf-8'))
    st = json.loads((ROOT / 'data/stage_maps.json').read_text(encoding='utf-8'))
    st = st['stages'] if isinstance(st, dict) else st
    where = collections.defaultdict(list)
    for s in st:
        for n in s.get('npcs', []):
            if n.get('coordX') is not None:
                where[n['id']].append((s['stageId'], n['coordX'], n['coordY']))
    accept = collections.defaultdict(dict)
    for f in glob.glob(str(ROOT / 'data/npc-talk/n*.json')):
        d = json.loads(Path(f).read_text(encoding='utf-8'))
        nid = int(Path(f).stem[1:])
        for m in (d.get('msgs') or {}).values():
            for t in m.get('tr') or []:
                for c in t.get('c') or []:
                    mm = re.fullmatch(r'任務「(.+)」', c)
                    if mm:
                        accept[mm.group(1)][nid] = d.get('n') or ''
    out = {}
    for x in q['quests']:
        if NPC_LINK.search(x.get('d') or ''):
            continue
        cand = accept.get(x['n']) or {}
        if len(set(cand.values())) != 1:
            continue
        named = re.search(r'⟦\d+,0,\d+,\d+,([^⟧]+)⟧', x.get('d') or '')
        if named and named.group(1) != next(iter(cand.values())):
            continue  # 敘述指名的是別人，不猜
        locs = [(nid, w) for nid in cand for w in where.get(nid, [])]
        if len(locs) != 1:
            continue
        nid, (sid, cx, cy) = locs[0]
        out[str(x['i'])] = [sid, nid, cx, cy, cand[nid].replace('　', ' ')]
    p = ROOT / 'data/quest_starts.json'
    p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('quest_starts', len(out))


if __name__ == '__main__':
    main()

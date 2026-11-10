"""Index NPC dialogue nodes by the items they take, give or require.

Reads data/npc-talk/n*.json and data/stage_map_index.json and writes
data/npc_item_talk.json:
  { "items": { name: [[npcId, stageId, msgId, kind, other], ...] },
    "npcs":  { npcId: [npcName, stageName] } }
kind: t = 交出 (exchange / hand in), g = 獲得 (reward), h = 持有 (needs item).
other: for t/h rows, the items given in the same branch (comma joined).
"""
import json, re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = json.load(open(os.path.join(ROOT, 'data/stage_map_index.json'), encoding='utf-8'))
where = {}
for name, stage, npc, shop, stage_name in idx.get('npcs', []):
    where.setdefault(str(npc), (stage, stage_name))
Q = re.compile(r'「(.+?)」')
items, npcs = {}, {}
for path in sorted(glob.glob(os.path.join(ROOT, 'data/npc-talk/n*.json'))):
    d = json.load(open(path, encoding='utf-8'))
    nid = os.path.basename(path)[1:-5]
    stage, stage_name = where.get(nid, ('', ''))
    rows = {}
    def add(name, msg, kind, other):
        rows.setdefault((name, msg, kind), [])
        for o in other:
            if o != name and o not in rows[(name, msg, kind)]: rows[(name, msg, kind)].append(o)
    for mid, m in d.get('msgs', {}).items():
        for t in m.get('tr', []):
            acts = t.get('a') or []
            gets = [Q.search(a).group(1) for a in acts if a.startswith('獲得') and Q.search(a)]
            target = t.get('j') or int(mid)
            for a in acts:
                mm = Q.search(a)
                if not mm: continue
                if a.startswith('交出'): add(mm.group(1), target, 't', gets)
                elif a.startswith('獲得'): add(mm.group(1), target, 'g', [])
            for c in t.get('c') or []:
                mm = Q.search(c)
                if mm and c.startswith('持有'): add(mm.group(1), target, 'h', gets)
    for (name, msg, kind), other in rows.items():
        if kind == 'h' and (name, msg, 't') in rows: continue
        items.setdefault(name, []).append([int(nid), stage, msg, kind, '、'.join(other[:4]) + ('…' if len(other) > 4 else '')])
        npcs[nid] = [d.get('n', ''), stage_name]
out = {'items': items, 'npcs': npcs}
with open(os.path.join(ROOT, 'data/npc_item_talk.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print(len(items), 'items,', sum(len(v) for v in items.values()), 'rows,', len(npcs), 'npcs')

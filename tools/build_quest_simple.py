#!/usr/bin/env python3
"""Build data/quest_simple.json: plain-language quest steps shown on the quest page.

Sources (hand-written, keep these when rebuilding):
  tools/data/quest_simple_src.json    {"<quest id>-<step index>": "白話步驟"}
  tools/data/quest_simple_hints.json  {"<quest id>-<step index>": [怪物名稱, ...]}
      monsters hinted by NPC dialogue / item names for steps that only say 「打怪」

What this adds on top of the plain text:
  * NPC names standing in the sentence become NPC links (⟦stage,npc,x,y,name⟧),
    looked up on the maps the step mentions (or the maps the original step links to);
  * monster names standing in the sentence that the quest's own monster list (q.mo)
    lacks are listed in "mo" so the page links them to their map;
  * a step that only says 打怪／任一敵人／周圍的怪 gets the monsters spelled out:
    （可打：A、B、C）— from the hints file, otherwise the normal monsters of that map.

Output: {"s": {"<quest id>": [step, ...]}, "mo": {"<quest id>": [[name, stage], ...]}}
"""
import json, os, re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))

q = J('data/quests.json')
src = J('tools/data/quest_simple_src.json')
hints = J('tools/data/quest_simple_hints.json') if os.path.exists(os.path.join(ROOT, 'tools/data/quest_simple_hints.json')) else {}
sm = {s['stageId']: s for s in J('data/stage_maps.json')['stages']}
mon_by = {int(m['ID']): m for m in J('data/monsters.json')}
stages = {int(k): v for k, v in q['stages'].items()}
stage_id = {}
for k, v in stages.items():
    if v and v not in stage_id: stage_id[v] = k
stage_names = sorted((n for n in stage_id if len(n) >= 2), key=len, reverse=True)
TOK = re.compile(r'⟦(-?\d+),(\d+),(-?\d+),(-?\d+),([^⟧]*)⟧')
GENERIC = re.compile(r'打怪|的怪|任一(?:怪|敵人|鬼界敵人|亡邪)|打(?:\S{0,8})(?:敵人|敵軍)|類(?:怪|敵人)|系怪|元素怪物|虛空怪|虛空魔物|怪物|精怪')
SKIP = re.compile(r'中原|商店|商家')
# 有限定種類的（元素怪物、女性敵人、東瀛敵軍…）沒有手動提示就不列整張地圖的怪
QUAL = re.compile(r'類|系|陣營|男女|東瀛|太極|鬼界|亡邪|元素|虛空怪|女性|植物|各層|艾濟|惡魔|人、神、魔')


def normal(m):
    d = mon_by.get(m['id'])
    if not d: return False
    return int(float(d.get('HP') or 0)) < 10_000_000 and int(float(d.get('DropExp') or 0)) > 1 and '倒數' not in d['Name']


def map_mons(st):
    c = Counter(m['name'] for m in sm.get(st, {}).get('monsters', []) if normal(m))
    return [n for n, _ in c.most_common()]


# every NPC name on any map: a short name inside a longer one (四聖太宰／四聖太宰化體) is not linked
ALL_NPC = {p['name'] for s in sm.values() for p in s.get('npcs', []) if len(p['name']) >= 2}

# monster name -> stages where it stands (for names the quest's own list lacks)
MON_AT = {}
for st, s in sm.items():
    for m in s.get('monsters', []):
        MON_AT.setdefault(m['name'], [])
        if st not in MON_AT[m['name']]: MON_AT[m['name']].append(st)


def outside_tokens(text, name):
    parts = re.split(r'(⟦[^⟧]*⟧)', text)
    return any(name in parts[i] for i in range(0, len(parts), 2))


def swap(text, name, tok):
    parts = re.split(r'(⟦[^⟧]*⟧)', text)
    for i in range(0, len(parts), 2):
        at = parts[i].find(name)
        if at >= 0:
            parts[i] = parts[i][:at] + tok + parts[i][at + len(name):]
            return ''.join(parts)
    return text


out_s, out_mo = {}, {}
for x in q['quests']:
    n = len(x.get('s') or [])
    keys = [f"{x['i']}-{k}" for k in range(n)]
    if not n or not all(k in src for k in keys): continue
    qmo = {name for name, _ in x.get('mo') or []}
    giver = [int(m.group(1)) for m in TOK.finditer(x.get('d') or '') if int(m.group(2))]
    extra = []
    steps = []
    for k, key in enumerate(keys):
        text, orig = src[key], x['s'][k]
        named = [s for s in stage_names if s in text]
        named = [s for s in named if not any(s != o and s in o for o in named)]
        cand = [stage_id[s] for s in named]
        cand += [int(m.group(1)) for m in TOK.finditer(orig)]
        cand += [st for name, st in x.get('mo') or [] if name in text]
        cand += giver
        cand = list(dict.fromkeys(c for c in cand if c in sm))
        # NPCs standing in the sentence → links (original link first, else the map's NPC)
        for m in TOK.finditer(orig):
            if int(m.group(2)) and m.group(5) and outside_tokens(text, m.group(5)) and not any(g != m.group(5) and m.group(5) in g and g in text for g in ALL_NPC):
                text = swap(text, m.group(5), m.group(0))
        npcs = {}
        for st in cand:
            for p in sm[st].get('npcs', []):
                if len(p['name']) >= 2 and p['name'] not in npcs: npcs[p['name']] = (st, p)
        for name in sorted(npcs, key=len, reverse=True):
            if outside_tokens(text, name) and not any(g != name and name in g and g in text for g in ALL_NPC):
                st, p = npcs[name]
                text = swap(text, name, f"⟦{st},{p['id']},{p.get('coordX', 0)},{p.get('coordY', 0)},{name}⟧")
        # monsters standing in the sentence
        plain = TOK.sub('', text)
        found = []
        for name in sorted(MON_AT, key=len, reverse=True):
            if len(name) < 2 or name not in plain: continue
            plain = plain.replace(name, '　')
            found.append(name)
            if name in qmo or any(name == e[0] for e in extra): continue
            at = [st for st in cand if st in MON_AT[name]] or MON_AT[name]
            extra.append([name, at[0]])
        # 只寫「打怪」：把可打的怪寫出來
        if not found and GENERIC.search(text) and not SKIP.search(text):
            names = hints.get(key) or (map_mons(stage_id[named[0]]) if named and not QUAL.search(text) else [])
            names = names[:8]
            if names:
                text = re.sub(r'(，|$)', lambda m: f"（可打：{'、'.join(names)}）" + m.group(1), text, count=1)
                st0 = stage_id[named[0]] if named else (cand[0] if cand else 0)
                for name in names:
                    if name in qmo or any(name == e[0] for e in extra): continue
                    at = [st for st in cand if st in MON_AT.get(name, [])] or MON_AT.get(name) or [st0]
                    extra.append([name, at[0]])
        steps.append(text)
    out_s[str(x['i'])] = steps
    if extra: out_mo[str(x['i'])] = extra

with open(os.path.join(ROOT, 'data/quest_simple.json'), 'w', encoding='utf-8') as f:
    json.dump({'s': out_s, 'mo': out_mo}, f, ensure_ascii=False, separators=(',', ':'))
print('quests', len(out_s), 'steps', sum(map(len, out_s.values())), 'extra monster links', sum(map(len, out_mo.values())))

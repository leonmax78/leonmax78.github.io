"""Collect the player skills (five classes + crossover) from the game files.

Usage: python tools/build_skills.py <game install dir> <out.json>

Sources
- SETTING/LEARN.INI: per-class teacher lists (ID 26 勇士, 27 劍俠, 28 術者, 29 道人, 30 僧侶 hold every
  skill of that class with its learn level; 152/163/172/182/192 are the 三轉 lists).
- MSG / STGMSG: dialogue nodes that teach a skill (EVENT_ACT 28 or 97 = learn magic N). The node and
  its parents carry the checks: cond 2 = class, cond 4 = level, cond 31 = holds item, cond 34 = knows
  magic; act 37 takes the book. The NPC comes from data/npc-talk (msg id -> NPC).
- MAGIC.INI / ITEM.INI: skill stats and the 法器 (MAGIC.Item).
Monster-only skills never appear in these sources, so they are left out.
"""
import collections
import glob
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / 'tools/npc_shop_dialogs.py').read_text(encoding='utf-8')
exec(src[:src.index("if __name__ == '__main__':")])   # extract_install

CLS = {1: '勇士', 2: '劍俠', 16: '術者', 4: '道人', 8: '僧侶'}
CLS_ORDER = ['劍俠', '勇士', '術者', '道人', '僧侶']
LEARN_CLASS = {26: '勇士', 27: '劍俠', 28: '術者', 29: '道人', 30: '僧侶'}
THIRD = {152: '勇士', 163: '劍俠', 172: '術者', 182: '道人', 192: '僧侶'}
EQUIP = {'SWORD': '劍', 'BLADE': '刀', 'SPEAR': '槍', 'AXE': '斧', 'HAMMER': '錘', 'ROD': '棍', 'STAFF': '杖',
         'HIDDEN_WEAPON': '暗器', 'SHIELD': '盾', 'WHISK': '拂塵'}
TIERS = ['基本', '三轉', '進階', '天照', '覺醒', '密傳', '奧義', '聖傳', '仙傳', '聯動', '通用']
SECT = {'劍宗': '劍俠', '武宗': '勇士', '術宗': '術者', '道宗': '道人', '禪宗': '僧侶'}
TRAINER = {'劍俠': ('京城／祁州城／玄州城「傳功長者」', '祁州城「劍俠傳功長老」'),
           '勇士': ('京城／祁州城／玄州城「總教頭」', '祁州城「勇士傳功長老」'),
           '術者': ('京城／祁州城／玄州城「總護法」', '祁州城「術者傳功長老」'),
           '道人': ('京城「丹雲子」／祁州城「丹霞子」／玄州城「丹華子」', '祁州城「道人傳功長老」'),
           '僧侶': ('京城「覺塵戒師」／祁州城「靜虛戒師」／玄州城「苦定戒師」', '祁州城「僧侶傳功長老」')}
IPS = ['新絕代雙驕', '活俠傳', '東離劍遊紀', '侍魂', '霹靂']


def blocks(path, tag):
    t = open(path, 'rb').read().decode('cp950', 'replace')
    out = []
    for b in re.split(r'^\[' + tag + r'\]\s*$', t, flags=re.M)[1:]:
        d = collections.defaultdict(list)
        for k, v in re.findall(r'^[ \t]*([A-Za-z_]+\d*)[ \t]*=[ \t]*(.*?)[ \t\r]*$', b, re.M):
            d[k].append(v)
        out.append(d)
    return out


def parse_trigger(s):
    t = [x.strip() for x in s.split(',')]
    i = 0

    def nxt():
        nonlocal i
        v = t[i]; i += 1
        return v
    try:
        conds = []
        for _ in range(int(nxt())):
            code = int(nxt()); neg = nxt() == 'True'; n = int(nxt())
            conds.append((code, neg, [nxt() for _ in range(n)]))
        acts = []
        for _ in range(int(nxt())):
            code = int(nxt()); n = int(nxt())
            acts.append((code, [nxt() for _ in range(n)]))
        return conds, acts
    except Exception:
        return None


def g(d, k, default=''):
    return (d.get(k) or [default])[0].strip()


def main(game, out):
    cur = tempfile.mkdtemp()
    extract_install(game, cur)
    S = f'{cur}/SETTING'
    magic = {int(g(d, 'ID')): d for d in blocks(f'{S}/MAGIC.INI', 'MAGIC') if g(d, 'ID').isdigit()}
    items = {int(g(d, 'ID')): d for d in blocks(f'{S}/ITEM.INI', 'ITEM') if g(d, 'ID').isdigit()}
    msgs = {}
    for p in sorted(glob.glob(f'{S}/MSG[0-9]*.INI'), key=lambda p: int(re.search(r'MSG(\d+)', p).group(1))):
        for d in blocks(p, 'MSG'):
            if g(d, 'ID').lstrip('-').isdigit(): msgs[int(g(d, 'ID'))] = d
    for p in sorted(glob.glob(f'{S}/STGMSG*.INI'), key=lambda p: int(re.search(r'STGMSG(\d+)', p).group(1))):
        for d in blocks(p, 'MSG'):
            if g(d, 'ID').lstrip('-').isdigit(): msgs[int(g(d, 'ID'))] = d
    for d in blocks(f'{S}/MSG.INI', 'MSG'):
        if g(d, 'ID').lstrip('-').isdigit(): msgs.setdefault(int(g(d, 'ID')), d)

    # msg -> NPCs that can reach it, from the site's dialogue trees
    npc_of = collections.defaultdict(set)
    npc_name = {}
    for f in (ROOT / 'data/npc-talk').glob('n*.json'):
        t = json.loads(f.read_text(encoding='utf-8'))
        nid = int(f.stem[1:]); npc_name[nid] = t.get('n', '')
        for m in t.get('msgs', {}): npc_of[int(m)].add(nid)
    stage_maps = json.loads((ROOT / 'data/stage_maps.json').read_text(encoding='utf-8'))
    npc_where = collections.defaultdict(list)
    for st in stage_maps['stages']:
        for n in [n for n in st.get('npcs') or [] if str(n.get('id')).isdigit()]:
            npc_where[int(n['id'])].append(f"{st['stageName']} ({n.get('coordX')},{n.get('coordY')})")

    parents = collections.defaultdict(set)
    for mid, d in msgs.items():
        for k, vs in d.items():
            if k == 'Jump' or k.startswith('OptJump'):
                for v in vs:
                    if v.strip().isdigit(): parents[int(v)].add(mid)
            if k.startswith('Trigger'):
                for v in vs:
                    p = parse_trigger(v)
                    for c, ps in (p[1] if p else []):
                        if c == 12 and ps and ps[0].isdigit(): parents[int(ps[0])].add(mid)

    # Comparison ops in conditions: checked against the reject lines ("練到【200級】之後再來",
    # cond 4 op 1 value 200) -> 1 is "<", 2 is ">". A negated condition flips the op.
    FLIP = {'0': '5', '5': '0', '1': '4', '4': '1', '2': '3', '3': '2'}

    def must(conds, holds):
        """conds that must hold (holds=True) or must fail (False) -> [(code, op, params)]."""
        out = []
        for c, neg, ps in conds:
            op = ps[0] if ps else '0'
            if neg == holds: op = FLIP.get(op, op)
            out.append((c, op, ps[1:] if len(ps) > 1 else ps))
        return out

    def triggers(m):
        d = msgs.get(m) or {}
        out = []
        for k in sorted((k for k in d if k.startswith('Trigger')), key=lambda k: int(k[7:] or 0)):
            for v in d[k]:
                p = parse_trigger(v)
                if p: out.append(p)
        return out

    def jumps_of(acts):
        return {int(ps[0]) for c, ps in acts if c == 12 and ps and ps[0].isdigit()}

    def requirement_paths(node, learn_index, depth=5):
        """Requirements on each dialogue path that ends in the learning trigger."""
        trs = triggers(node)
        base = must(trs[learn_index][0], True)
        for conds, acts in trs[:learn_index]:
            if conds and (jumps_of(acts) or acts): base += must(conds, False)
        results = []

        def up(m, req, dep, seen):
            pars = [q for q in parents.get(m, ()) if q not in seen]
            if dep >= depth or not pars:
                results.append(req); return
            for q in pars:
                trs = triggers(q)
                via = next((i for i, (cs, acts) in enumerate(trs) if m in jumps_of(acts)), None)
                r = list(req)
                if via is not None:
                    r += must(trs[via][0], True)
                    for cs, acts in trs[:via]:
                        if cs and jumps_of(acts): r += must(cs, False)
                else:
                    for cs, acts in trs:
                        if cs and jumps_of(acts): r += must(cs, False)
                up(q, r, dep + 1, seen | {q})
                if len(results) > 60: return
        up(node, base, 0, {node})
        return results

    def ancestor_texts(node, depth=4):
        out, frontier, seen = [], [node], {node}
        for _ in range(depth):
            nxt = []
            for m in frontier:
                for q in parents.get(m, ()):
                    if q in seen: continue
                    seen.add(q); nxt.append(q)
                    d = msgs.get(q) or {}
                    out.append(g(d, 'Msg') + ' '.join(v[0] for k, v in d.items() if k.startswith('OptStr')))
            frontier = nxt
        return out

    def summarize(req):
        classes, level, tier = set(CLS.values()), 0, None
        for c, op, ps in req:
            if c == 2 and ps and ps[-1].isdigit():
                names = {n for b, n in CLS.items() if int(ps[-1]) & b}
                if op == '0': classes &= names
                elif op == '5': classes -= names
            if c == 4 and ps and ps[-1].isdigit():
                v = int(ps[-1])
                if op == '4': level = max(level, v)          # not "< v"
                if op == '2': level = max(level, v + 1)      # "> v"
            if c == 42 and ps and ps[-1].isdigit():
                v = int(ps[-1])
                if op == '4': tier = max(tier or 0, v)
                if op == '2': tier = max(tier or 0, v + 1)
        return classes, level, tier

    skills = {}   # (magic id, class or IP key) -> row

    def row(mid):
        d = magic.get(mid, {})
        r = {'id': mid, 'name': g(d, 'Name'), 'classes': set(), 'level': None, 'how': [], 'npcs': set(),
             'books': set(), 'tier': '', 'ip': '', 'awake': bool(d.get('AvailOnlyDeityAwake')), 'texts': [], 'req': [], 'rank': None, 'trainer': '', 'note': ''}
        return r

    # 1) LEARN tables
    learn = {int(g(d, 'ID')): [[int(x) for x in re.findall(r'\d+', v)] for v in d['learn']] for d in blocks(f'{S}/LEARN.INI', 'LEARN')}
    for tid, cls in LEARN_CLASS.items():
        third = {m for m, *_ in learn[[k for k, v in THIRD.items() if v == cls][0]]}
        for mid, lv, price in learn[tid]:
            r = skills.setdefault((mid, cls), row(mid))
            r['classes'].add(cls); r['level'] = lv if r['level'] is None else min(r['level'], lv)
            r['tier'] = '三轉' if mid in third else '基本'
            r['how'].append('職業導師')
            r['trainer'] = TRAINER[cls][1] if r['tier'] == '三轉' else TRAINER[cls][0]

    # 2) dialogue teaching
    for mid_node, d in msgs.items():
        for k in d:
            if not k.startswith('Trigger'): continue
            for v in d[k]:
                p = parse_trigger(v)
                if not p: continue
                conds, acts = p
                learnt = [int(ps[0]) for c, ps in acts if c in (28, 97) and ps and ps[0].isdigit()]
                if not learnt: continue
                took = [(int(ps[0]), int(ps[1]) if len(ps) > 1 else 1) for c, ps in acts if c == 37 and ps and ps[0].isdigit()]
                idx = next(i for i, (cs, acts2) in enumerate(triggers(mid_node)) if (cs, acts2) == (conds, acts))
                classes, level, rank = set(), None, None
                for req in requirement_paths(mid_node, idx):
                    cl, lv, rk = summarize(req)
                    if not cl: continue
                    classes |= cl
                    level = lv if level is None else min(level, lv)
                    rank = rk if rank is None else min(rank, rk or 0)
                needs_item = set()
                book_ids = {i for i, _ in took} | needs_item
                books = {g(items.get(i, {}), 'Name') or f'#{i}' for i in book_ids}
                text = g(d, 'Msg')
                bracketed = {g(magic.get(x, {}), 'Name')[1:].split(']')[0] for x in learnt if g(magic.get(x, {}), 'Name').startswith('[')}
                for m in learnt:
                    if m not in magic: continue
                    if bracketed and not g(magic[m], 'Name').startswith('['): continue
                    blob = text + ' '.join(g(items.get(i, {}), 'Help') for i in book_ids) + ' '.join(books)
                    ip = ''
                    if '聯動' in blob or any(x.startswith('秘笈') for x in books):
                        # the crossover title is named in the dialogue a few steps up (賞金獵人's menu)
                        for t in [blob] + ancestor_texts(mid_node):
                            ip = next((x for x in IPS if x in t), '')
                            if ip: break
                        ip = ip or '聯動'
                    b = ' '.join(books); nm = g(magic[m], 'Name')
                    tier = ('聯動' if ip else '仙傳' if '仙傳' in b else '聖傳' if '聖傳' in b else '奧義' if '奧義' in b
                            else '密傳' if '密傳' in b else '天照' if '天照' in b else '覺醒' if '覺醒' in nm
                            else '進階' if nm.startswith('[') or '五派前輩精魂' in b else '')
                    key = (m, tier)
                    r = skills.setdefault(key, row(m))
                    r['classes'] |= classes; r['ip'] = ip
                    if level: r['level'] = level if r['level'] is None else min(r['level'], level)
                    if rank: r['rank'] = rank
                    took_txt = '、'.join(f"{g(items.get(i, {}), 'Name') or i}×{n}" for i, n in took)
                    r['req'].append(f"{'/'.join(c for c in CLS_ORDER if c in classes) or '?'}"
                                    + (f" Lv{level}" if level else '') + (f" 交{took_txt}" if took_txt else ''))
                    r['books'] |= books
                    r['how'].append('對話' + ('' if not books else '：' + '、'.join(sorted(books))))
                    nodes = {mid_node} | parents.get(mid_node, set())
                    for n in nodes:
                        for nid in npc_of.get(n, ()): r['npcs'].add(nid)
                    r['texts'].append(text[:120])

    base_classes = collections.defaultdict(set)
    for (mid, k), r in skills.items():
        if r['tier'] in ('基本', '三轉'): base_classes[r['name']] |= r['classes']
    # 進階X upgrades (MAGIC 2000+) that no dialogue teaches in the client files: listed for review
    # under 三轉 with the class of their base skill (or of the neighbouring upgrade when shared).
    known = {m for m, _ in skills}
    ups = sorted(i for i, d in magic.items() if i >= 2000 and g(d, 'Name').startswith('進階') and i not in known)
    guess = {}
    for i in ups:
        base = base_classes.get(g(magic[i], 'Name')[2:], set())
        if len(base) == 1: guess[i] = set(base)
    for i in ups:
        r = skills.setdefault((i, '三轉'), row(i)); r['tier'] = '三轉'
        if i in guess:
            r['classes'] = guess[i]
            r['note'] = '遊戲檔找不到學習對話（可能是祁州城傳功長老），職業依原技能推測'
        else:
            r['classes'] = set(base_classes.get(g(magic[i], 'Name')[2:], set()))
            r['note'] = '遊戲檔找不到學習對話；原技能多職業共用，職業待確認（只留正確職業那頁）'
    rows = []
    for (mid, _), r in list(skills.items()):
        d = magic[mid]
        name = r['name']
        b = ' '.join(r['books'])
        tier = r['tier'] or _[0:0] or (_ if isinstance(_, str) and _ in TIERS else '')
        if not tier:
            if r['classes'] and (r['classes'] <= base_classes.get(name, set()) or (len(r['classes']) == 5 and name in base_classes)):
                continue        # another way to learn a class skill already listed from the teacher table
            tier = '三轉' if r['classes'] and len(r['classes']) < 5 else '通用'
        # sect named on the book decides the home class (劍宗 → 劍俠 …); others learn it cross-class
        home = [c for s_, c in SECT.items() if s_ in b]
        classes = [c for c in CLS_ORDER if c in r['classes']]
        if tier == '進階' and base_classes.get(name.strip('[]').split(']')[0]):
            classes = [c for c in classes if c in base_classes[name.strip('[]').split(']')[0]]] or classes
            r['req'] = ['/'.join(classes) + ' ' + q.split(' ', 1)[1] if ' ' in q else q for q in r['req']]
        item = g(d, 'Item')
        hr = g(d, 'HitRange')
        rows.append({
            'id': mid, 'name': name, 'tier': tier, 'ip': r['ip'],
            'classes': classes, 'home': home[0] if len(home) == 1 else '',
            'level': r['level'], 'books': sorted(r['books']),
            'npcs': [f"{npc_name.get(n, n)}｜{'；'.join(npc_where.get(n, [])[:2])}" for n in sorted(r['npcs'])],
            'tool': g(items.get(int(item), {}), 'Name') if item.isdigit() else '',
            'target': g(d, 'Target'), 'stun': int(g(d, 'Stun') or 0) / 10, 'range': g(d, 'Range'), 'hit': hr, 'mana': g(d, 'Mana'),
            'weapon': EQUIP.get(g(d, 'Equip'), g(d, 'Equip')),
            'phys': g(d, 'ExtraDamage'), 'dmg': f"{g(d, 'DamageMin')}~{g(d, 'DamageMax')}" if d.get('DamageMin') else '',
            'awake': r['awake'], 'help': g(d, 'Help').replace('\\n', ' '),
            'how': sorted(set(r['how'])), 'text': r['texts'][0] if r['texts'] else '',
            'note': r['note'],
            'req': [q for q in sorted(set(r['req'])) if '交' in q] or sorted(set(r['req'])), 'rank': r['rank'], 'trainer': r['trainer'],
        })
    named = sorted((r['id'], r['ip']) for r in rows if r['ip'] and r['ip'] != '聯動')
    for r in rows:
        if r['ip'] == '聯動' and named:
            r['ip'] = min(named, key=lambda t: abs(t[0] - r['id']))[1]
    Path(out).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(rows), 'skill rows ->', out)
    print(collections.Counter(r['tier'] for r in rows))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

"""Build data/quests.json from the game's SETTING/MISSION.INI.

Usage: python tools/build_quests.py <MISSION.INI>

MISSION.INI (CP950) holds every quest: name, start map, level / fame /
class limits, the version it belongs to, a description and the step log
shown in game. NPC references in the text look like
  <map=7,x=0,y=0,NPCID=6030,雲兆祥>
and are resolved here to the NPC's map coordinates from data/stage_maps.json.

Rewards and quest items come from the NPC dialogue triggers in
data/npc-talk (actions that end a quest, conditions on quest progress).

Output rows (compact keys):
  i id, n name, c category, g group, lv/mx level range, fm fame text,
  cl class, m start stage id, d description, s steps, r rewards,
  it quest items, rp repeatable, tm team quest, pre prerequisite names.
Text fields keep NPC links as  ⟦stageId,npcId,x,y,name⟧ .
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLASS = {0: '勇士', 1: '劍俠', 2: '術者', 3: '道人', 4: '僧侶'}
CLASS_HOME = {1: '勇士', 2: '術者', 3: '道人', 4: '僧侶', 5: '劍俠'}  # filled from stage names below
NEWBIE_MAPS = {'山林地訓練營': '勇士', '黑水潭地龍穴': '術者', '紫霞山養心觀': '道人', '踏雲頂梵天寺': '僧侶', '葬劍崖護法院': '劍俠', '義勇軍校場': '義勇軍校場'}
VER_TO_GROUP = {
    '神州Online': None, '麒麟傳說': None, '修羅境': '修羅境', '桃花仙境': '桃花仙境', '東海龍宮': '東海龍宮',
    '決戰神州': None, '古墓秘境': '古墓秘境', '蒼狼劫': '蒼狼劫', '地火神兵': '地火神兵', '西域傳奇': '西域傳奇',
    '決戰東瀛': '決戰東瀛', '梵天劫': '梵天劫', '無間煉獄': '無間煉獄', '五派頂峰': '五派頂峰', '波斯聖域': '波斯聖域',
    '十字聖戰': '十字聖戰', '深淵': '深淵', '問頂仙途': '問頂仙途', '俠者無敵': '俠者無敵', '勝者為王': '勝者為王',
    '唯我頂天': '唯我頂天', '唯我頂天Ⅱ創世紀': '唯我頂天', '唯我頂天Ⅲ天罪': '天罪', 'S.Z.O武俠神域': '武俠神域',
    '赤膽征長疆': '赤膽征長疆', '神州20': '神州20', '神州20 Ⅱ': '神州20 II', '六宇浮上': '六宇浮上',
    '決戰神州Ⅱ龍川事變': '龍川事變',
}
LINK = re.compile(r'<map=(\d+),x=(-?\d+),y=(-?\d+),NPCID=?(\d+),([^>]*)>')
HIDDEN_SKIP = re.compile(r'^20\d\d|活動|聖靈煉金|改版|咕嚕|暗記|重置|入場|價格|提昇|提升|修煉|速通|禮包|記錄|魂印|Deg|開局|齊備|速軸|兌換|改制|賜福|月費|福袋|倉庫|回籠|衝等|任務記錄|名人堂|付費|暢行')
MULTI = re.compile(r'<(map=[^<>]*?)>')


def split_multi(v):
    """<map=1,..,A,map=2,..,B> lists alternatives (one NPC per class); emit one link each."""
    return MULTI.sub(lambda m: '、'.join('<' + part + '>' for part in re.split(r',(?=map=)', m[1])), v or '')


BRACKET = re.compile(r'【([^】]+)】')


def read_ini(path):
    raw = open(path, 'rb').read()
    try:
        text = raw.decode('cp950')
    except UnicodeDecodeError:
        text = raw.decode('cp950', errors='replace')
    common, missions = {}, []
    cur = None
    for line in text.splitlines():
        s = line.strip()
        if s.startswith('['):
            cur = {} if s == '[MISSION]' else None
            if cur is not None:
                missions.append(cur)
            continue
        if '=' not in s:
            continue
        k, v = s.split('=', 1)
        (cur if cur is not None else common)[k.strip()] = v.strip()
    return common, missions


def main(ini):
    common, missions = read_ini(ini)
    versions = {int(k[9:]): v for k, v in common.items() if k.startswith('SzVerName')}
    smap = json.load(open(os.path.join(ROOT, 'data/stage_maps.json'), encoding='utf-8'))
    stage_name = {s['stageId']: s['stageName'] for s in smap['stages']}
    npc_pos = {}   # (stage, npc) -> (x, y); npc -> [(stage, x, y)]
    npc_any = {}
    for s in smap['stages']:
        for n in s.get('npcs') or []:
            xy = (n.get('coordX'), n.get('coordY'))
            npc_pos.setdefault((s['stageId'], n['id']), xy)
            npc_any.setdefault(n['id'], []).append((s['stageId'],) + xy)
    tax_src = open(os.path.join(ROOT, 'data/map-taxonomy.js'), encoding='utf-8').read()
    tax = json.loads(tax_src[tax_src.index('{'):tax_src.rindex('}') + 1])
    stage_group = {int(k): v.get('group') for k, v in tax['stages'].items()}
    stage_series = {int(k): v['series'] for k, v in tax['stages'].items() if v.get('group') == '聯動' and v.get('series')}
    order = tax['groups']['一般地圖']

    def link(m):
        stage, x, y, npc, name = int(m[1]), int(m[2]), int(m[3]), int(m[4]), m[5]
        if npc:
            pos = npc_pos.get((stage, npc))
            if not pos and npc_any.get(npc):
                stage, *pos = npc_any[npc][0]
            if pos and pos[0] is not None:
                x, y = pos
        return f'⟦{stage},{npc},{x},{y},{name}⟧'

    def text(v):
        return LINK.sub(link, v or '').replace('\\n', '\n')

    # Rewards / hand-ins / quest items from NPC dialogue (data/npc-talk).
    # 月服 / 免服: a node with a 「免服」 branch is the 月服 text and its target the 免服 one;
    # the tag carries forward along the dialogue until another server branch.
    Q = re.compile(r'「(.+?)」')
    QTY = re.compile(r'「(.+?)」×(\d+)')
    rewards_of, handin_of, items_of = {}, {}, {}
    REWARD = ('獲得「', '經驗 ', '金錢 ', '名聲 ')
    for path in glob.glob(os.path.join(ROOT, 'data/npc-talk/n*.json')):
        d = json.load(open(path, encoding='utf-8'))
        msgs = d.get('msgs', {})
        server = {}
        for mid_, m in msgs.items():
            for t in m.get('tr', []):
                c = t.get('c') or []
                if t.get('j') and c in (['免服'], ['月服']):
                    server[str(t['j'])] = c[0]
                    server.setdefault(mid_, '月服' if c[0] == '免服' else '免服')
        todo = list(server)
        while todo:
            cur = todo.pop()
            m = msgs.get(cur) or {}
            nxt = [str(j) for _, j in m.get('o', []) if j] + [str(j) for j in m.get('n', [])] + [str(t['j']) for t in m.get('tr', []) if t.get('j') and (t.get('c') or []) not in (['免服'], ['月服'])]
            for j in nxt:
                if j in msgs and j not in server:
                    server[j] = server[cur]; todo.append(j)
        for mid_, m in msgs.items():
            trs = m.get('tr', [])
            refs, done = set(), set()
            for t in trs:
                for x in (t.get('c') or []):
                    if x.startswith('任務進度「'): refs.add(Q.search(x).group(1))
                for x in (t.get('a') or []):
                    if x.startswith(('完成任務「', '接下任務「')) or (x.startswith('任務「') and x.endswith('結束')):
                        q = Q.search(x).group(1); refs.add(q)
                        if x.startswith('完成任務'): done.add(q)   # step 15 = quest finished; 任務結束 alone is a reset
            if not refs: continue
            for t in trs:
                conds = t.get('c') or []
                srv = next((x for x in conds if x in ('免服', '月服')), None) or server.get(mid_)
                who = ' '.join(x for x in conds if x.startswith('限'))
                own = set()
                for x in conds + (t.get('a') or []):
                    mq = Q.search(x)
                    if mq and (x.startswith(('任務進度「', '完成任務「', '接下任務「')) or (x.startswith('任務「') and x.endswith('結束'))): own.add(mq.group(1))
                # A node about one quest owns all its triggers; a hub node only the ones naming the quest.
                for q in (refs if len(refs) == 1 else own):
                    for x in (t.get('a') or []):
                        mm = QTY.search(x)
                        if x.startswith('交出') and mm:
                            handin_of.setdefault(q, {}).setdefault((mm[1], who), {})[srv or ''] = int(mm[2])
                        if mm and (x.startswith('交出') or x.startswith('持有')):
                            items_of.setdefault(q, set()).add(mm[1])
                    for x in conds:
                        if x.startswith('持有「'): items_of.setdefault(q, set()).add(Q.search(x).group(1))
                for q in done:
                    rw = [x for x in (t.get('a') or []) if x.startswith(REWARD)]
                    if rw:
                        rewards_of.setdefault(q, {}).setdefault((mid_, srv or ''), []).append((who, rw))
    def zh_value(t):
        """'+2,300億' / '-9990萬' / '+1萬1500' → int"""
        sign = -1 if t.strip().startswith('-') else 1
        n = 0
        for part, unit in re.findall(r'(\d+)(億|萬|)', t.replace(',', '')):
            n += int(part) * {'億': 100_000_000, '萬': 10_000, '': 1}[unit]
        return sign * n
    def zh_amount(n):
        sign = '-' if n < 0 else '+'; n = abs(n)
        if n < 10_000: return f'{sign}{n:,}'
        yi, rest = divmod(n, 100_000_000); wan, one = divmod(rest, 10_000)
        return sign + (f'{yi:,}億' if yi else '') + (f'{wan}萬' if wan else '') + (str(one) if one else '')
    # Quests whose finishing dialogue is not reachable from an NPC's Talk tree (map events,
    # collaboration maps): use the completion nodes the dialogue tool found in the MSG files.
    comp_path = os.path.join(ROOT, 'tools/data/quest_completions.json')
    if os.path.exists(comp_path):
        for q, nodes in json.load(open(comp_path, encoding='utf-8')).items():
            rewards_of.pop(q, None)   # the full MSG scan sees every finishing node and server branch
            for node in nodes:
                for t in node.get('tr', []):
                    conds = t.get('c') or []
                    srv = next((x for x in conds if x in ('免服', '月服')), None) or node.get('srv') or ''
                    who = ' '.join(x for x in conds if x.startswith('限'))
                    rw = [x for x in t.get('a', []) if x.startswith(REWARD)]
                    if rw:
                        rewards_of.setdefault(q, {}).setdefault((str(node['m']), srv), []).append((who, rw))
    ALTERNATIVES = set()
    def exp_of(parts):
        tot = 0
        for _, rw in parts:
            for x in rw:
                mm = re.match(r'(經驗|金錢) \+([\d,億萬]+)', x)
                if mm:
                    v = mm[2].replace(',', ''); n = 0
                    for part, unit in re.findall(r'(\d+)(億|萬|)', v):
                        n += int(part) * {'億': 100_000_000, '萬': 10_000, '': 1}[unit]
                    tot += n
        return tot
    def format_rewards(q):
        groups = rewards_of.get(q, {})
        variants = []   # (server, [(who, [acts])])
        for (mid_, srv), parts in groups.items():
            merged = {}
            for who, rw in parts:
                lst = merged.setdefault(who, [])
                for x in rw:
                    if x not in lst: lst.append(x)
            key = tuple(sorted((w, tuple(v)) for w, v in merged.items()))
            if any(v[1] == key for v in variants): continue
            variants.append([srv, key])
        # Untagged variants are different outcomes (e.g. which goods you sold), not 月服/免服:
        # only an explicit 免服 branch in the dialogue marks a server.
        if sum(1 for v in variants if not v[0]) >= 2:
            ALTERNATIVES.add(q)
        out = []
        order = {'月服': 0, '': 1, '免服': 2}
        for srv, key in sorted(variants, key=lambda v: order.get(v[0], 1)):
            for who, acts in key:
                acts = list(acts)
                # Several 經驗 lines in one reward add up (經驗 +20億、經驗 +10億 → 經驗 +30億).
                exps = [x for x in acts if x.startswith('經驗 ')]
                if len(exps) > 1:
                    total = sum(zh_value(x[3:]) for x in exps)
                    acts[acts.index(exps[0])] = '經驗 ' + zh_amount(total)
                    for x in exps[1:]: acts.remove(x)
                # 名聲 +N and 名聲 -N together: good or evil fame grows by N (follows your current side).
                for x in list(acts):
                    if x.startswith('名聲 +') and ('名聲 -' + x[4:]) in acts:
                        acts[acts.index(x)] = '名聲 ±' + x[4:] + '（依善惡）'; acts.remove('名聲 -' + x[4:])
                label = '、'.join(acts)
                tag = '（' + srv + '）' if srv else ''
                out.append(((who + '：') if who else '') + label + tag)
        return out
    def format_handins(q):
        rows = []
        for (name, who), by in handin_of.get(q, {}).items():
            vals = {k: v for k, v in by.items()}
            if set(vals) == {''}:
                txt = f'×{vals[""]}'
            else:
                m_, f_ = vals.get('月服', vals.get('')), vals.get('免服')
                if f_ is not None and m_ is not None and f_ != m_:
                    txt = f'×{m_}（月服）／×{f_}（免服）'
                else:
                    txt = f'×{m_ if m_ is not None else f_}'
            rows.append([name, txt, who])
        return rows
    item_rows = json.load(open(os.path.join(ROOT, 'data/items.json'), encoding='utf-8'))
    item_names = {r.get('Name') for r in item_rows}
    item_id = {}
    for r in item_rows:
        item_id.setdefault(r.get('Name'), r.get('ID'))
    long_names = sorted((n for n in item_names if n and len(n) >= 3), key=len, reverse=True)

    ov_path = os.path.join(ROOT, 'tools/data/quest_overrides.json')
    overrides = json.load(open(ov_path, encoding='utf-8')) if os.path.exists(ov_path) else {}
    out, section = [], 'once'
    by_id = {m.get('ID'): m.get('Name') for m in missions}
    for m in missions:
        mid = int(m.get('ID', 0))
        steps = [split_multi(m[k]) for k in sorted((k for k in m if re.fullmatch(r'Step\d+', k)), key=lambda k: int(k[4:]))]
        m['Describe'] = split_multi(m.get('Describe', ''))
        if mid >= 20000:
            # 以下隱藏: mostly internal markers; keep the ones that read like real quests.
            if HIDDEN_SKIP.search(m.get('Name', '')) or not steps:
                continue
        if mid == 278:
            section = 'repeat'
        if mid == 15000:
            section = 'team'
        if (not steps and not m.get('Describe')) or '測試' in m.get('Name', ''):
            continue
        name = m.get('Name', '')
        stage = int(m['Map']) if m.get('Map', '').isdigit() else None
        if stage is None:
            first = LINK.search(m.get('Describe', '') + ''.join(steps))
            stage = int(first[1]) if first and int(first[1]) in stage_name else None
        cls = int(m['CharacterType']) if m.get('CharacterType', '').isdigit() else None
        ver = versions.get(int(m['MinSzVer'])) if m.get('MinSzVer', '').isdigit() else None
        group = stage_group.get(stage) if stage else None
        if group not in order or group == '中原地圖':
            group = VER_TO_GROUP.get(ver) if ver else None
        sname = stage_name.get(stage, '')
        maps_used = ({stage} if stage else set()) | {int(x[1]) for x in LINK.finditer(m.get('Describe', '') + ''.join(steps))}
        series = [stage_series[x] for x in maps_used if x in stage_series]
        if series:
            cat, sub = '聯動任務', max(set(series), key=series.count)
        elif group and group in order and group != '中原地圖':
            cat, sub = '資料片任務', group
        elif sname in NEWBIE_MAPS:
            cat, sub = '新手任務', NEWBIE_MAPS[sname]
        elif cls is not None:
            cat, sub = '職業任務', sname or CLASS[cls]  # grouped by start map; the class shows as a tag
        else:
            cat, sub = '一般任務', sname or '活動與其他'
        ov = overrides.get(str(mid), {})
        if ov.get('hide'):
            continue
        if ov.get('c'):
            cat = ov['c']
        if 'g' in ov:
            sub = ov['g'] or (sname or '活動與其他')
        fame = []
        if m.get('MinFame'): fame.append(f"名聲 ≥ {m['MinFame']}")
        if m.get('MaxFame'): fame.append(f"名聲 ≤ {m['MaxFame']}")
        if m.get('MinFameAbs'): fame.append(f"名聲絕對值 ≥ {m['MinFameAbs']}")
        found = set()
        for s in steps + [m.get('Describe', '')]:
            for b in BRACKET.findall(LINK.sub(lambda x: x[5], s)):
                nm = re.sub(r'[\*＊xX×]?\s*\d+\s*(個|片|張|顆|瓶|份|塊|隻|把|件)?$', '', b).strip()
                if nm in item_names:
                    found.add(nm)
        plain = LINK.sub('', ' '.join(steps))
        for nm in long_names:
            if nm in plain:
                found.add(nm)
                plain = plain.replace(nm, '　')
        found |= {x for x in items_of.get(name, ()) if x in item_names}
        rewards = format_rewards(name)
        if ov.get('reward_needs_exp'):   # owner: variants without exp are retired rewards
            rewards = [r for r in rewards if '經驗' in r]
        handins = format_handins(name)
        row = {'i': mid, 'n': name, 'c': cat, 'g': sub, 'm': stage,
               'd': text(m.get('Describe')), 's': [text(s) for s in steps]}
        if m.get('MinLevel'): row['lv'] = int(m['MinLevel'])
        if m.get('MaxLevel'): row['mx'] = int(m['MaxLevel'])
        if fame: row['fm'] = '、'.join(fame)
        if cls is not None: row['cl'] = CLASS[cls]
        if m.get('Sex'): row['sx'] = '男' if m['Sex'] == '0' else '女'
        if rewards:
            row['r'] = rewards[:12]
            ri = sorted({x for r in row['r'] for x in re.findall(r'「(.+?)」', r) if item_id.get(x)})
            if ri: row['ri'] = [[item_id[x], x] for x in ri]
        if name in ALTERNATIVES: row['rx'] = 1
        if handins: row['ho'] = [[item_id.get(n, ''), n, qty, who] for n, qty, who in handins][:30]
        if found: row['it'] = [[item_id.get(n, ''), n] for n in sorted(found)]
        if ov.get('note'): row['tag'] = ov['note']
        if 'order' in ov: row['_o'] = ov['order']
        if section == 'repeat': row['rp'] = 1
        if section == 'team': row['tm'] = 1
        pre = [by_id.get(x.strip()) for x in m.get('MustFinishMission', '').split(',') if x.strip()]
        if any(pre): row['pre'] = [p for p in pre if p]
        out.append(row)
    cats = ['資料片任務', '聯動任務', '轉職任務', '職業任務', '一般任務', '新手任務']
    ver_groups = [g for g in order if g != '中原地圖']
    if '俠者無敵' in ver_groups:
        ver_groups.insert(ver_groups.index('俠者無敵') + 1, '時界任務')
    groups = {
        '資料片任務': ver_groups,
        '聯動任務': tax.get('series', []),
        '轉職任務': ['二轉', '三轉', '四轉', '五轉'],
        '新手任務': ['義勇軍校場', '勇士', '劍俠', '術者', '道人', '僧侶'],
    }
    # 一般任務 / 職業任務: by map order (stage id); 活動與其他 last.
    for c in ('一般任務', '職業任務'):
        first_stage = {}
        for r in out:
            if r['c'] == c:
                first_stage[r['g']] = min(first_stage.get(r['g'], 99999), r['m'] or 99999)
        groups[c] = sorted(first_stage, key=lambda g: (g == '活動與其他', first_stage[g], g))
    for c in cats:  # any group a manual override introduced
        for g in sorted({r['g'] for r in out if r['c'] == c} - set(groups[c])):
            groups[c].append(g)
    gpos = {(c, g): i for c in cats for i, g in enumerate(groups[c])}
    tag_rank = {'主線任務': 0, '支線任務': 1}
    out.sort(key=lambda r: (cats.index(r['c']) if r['c'] in cats else 99, gpos.get((r['c'], r['g']), 999),
                            tag_rank.get(r.get('tag'), 2), r.get('_o', 0), (r['m'] or 99999) if r['c'] == '聯動任務' else 0,
                            list(CLASS.values()).index(r['cl']) if r['c'] == '職業任務' and r.get('cl') in CLASS.values() else 0, r['i']))
    for r in out: r.pop('_o', None)
    data = {'cats': cats, 'groups': groups, 'stages': {str(k): v for k, v in stage_name.items()}, 'quests': out}
    with open(os.path.join(ROOT, 'data/quests.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    with open(os.path.join(ROOT, 'tools/data/quest_reward_alternatives.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(sorted(r['n'] for r in out if r['n'] in ALTERNATIVES)) + '\n')
    print(len(out), 'quests', Counter(r['c'] for r in out), 'with rewards', sum('r' in r for r in out), 'with items', sum('it' in r for r in out))


if __name__ == '__main__':
    main(sys.argv[1])

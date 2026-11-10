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
LINK = re.compile(r'<map=(\d+),x=(-?\d+),y=(-?\d+),NPCID=(\d+),([^>]*)>')
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

    # Rewards / quest items from NPC dialogue.
    end_of, items_of = {}, {}
    Q = re.compile(r'「(.+?)」')
    for path in glob.glob(os.path.join(ROOT, 'data/npc-talk/n*.json')):
        d = json.load(open(path, encoding='utf-8'))
        for m in d.get('msgs', {}).values():
            for t in m.get('tr', []):
                acts, conds = t.get('a') or [], t.get('c') or []
                ended = [Q.search(a).group(1) for a in acts if a.startswith('任務「') and a.endswith('結束')]
                for q in ended:
                    rw = [a for a in acts if not a.startswith('任務「') and not a.startswith('接下任務')]
                    if rw:
                        end_of.setdefault(q, set()).add(' '.join(cn for cn in conds if cn.startswith('限')) + '|' + '、'.join(rw))
                quests = [Q.search(c).group(1) for c in conds if c.startswith('任務進度「')] + ended
                for q in quests:
                    for a in acts + conds:
                        mm = Q.search(a)
                        if mm and (a.startswith('交出') or a.startswith('持有')):
                            items_of.setdefault(q, set()).add(mm.group(1))
    item_rows = json.load(open(os.path.join(ROOT, 'data/items.json'), encoding='utf-8'))
    item_names = {r.get('Name') for r in item_rows}
    item_id = {}
    for r in item_rows:
        item_id.setdefault(r.get('Name'), r.get('ID'))
    long_names = sorted((n for n in item_names if n and len(n) >= 3), key=len, reverse=True)

    out, section = [], 'once'
    by_id = {m.get('ID'): m.get('Name') for m in missions}
    for m in missions:
        mid = int(m.get('ID', 0))
        steps = [m[k] for k in sorted((k for k in m if re.fullmatch(r'Step\d+', k)), key=lambda k: int(k[4:]))]
        if mid >= 20000:
            break  # 以下隱藏
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
        if group and group in order and group != '中原地圖':
            cat, sub = '資料片任務', group
        elif sname in NEWBIE_MAPS:
            cat, sub = '新手任務', NEWBIE_MAPS[sname]
        elif cls is not None:
            cat, sub = '職業任務', CLASS[cls]
        else:
            cat, sub = '一般任務', sname or '活動與其他'
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
        rewards = []
        for r in sorted(end_of.get(name, ())):
            who, what = r.split('|', 1)
            rewards.append((who + '：' if who else '') + what)
        row = {'i': mid, 'n': name, 'c': cat, 'g': sub, 'm': stage,
               'd': text(m.get('Describe')), 's': [text(s) for s in steps]}
        if m.get('MinLevel'): row['lv'] = int(m['MinLevel'])
        if m.get('MaxLevel'): row['mx'] = int(m['MaxLevel'])
        if fame: row['fm'] = '、'.join(fame)
        if cls is not None: row['cl'] = CLASS[cls]
        if m.get('Sex'): row['sx'] = '男' if m['Sex'] == '0' else '女'
        if rewards: row['r'] = rewards[:8]
        if found: row['it'] = [[item_id.get(n, ''), n] for n in sorted(found)]
        if section == 'repeat': row['rp'] = 1
        if section == 'team': row['tm'] = 1
        pre = [by_id.get(x.strip()) for x in m.get('MustFinishMission', '').split(',') if x.strip()]
        if any(pre): row['pre'] = [p for p in pre if p]
        out.append(row)
    cats = ['資料片任務', '職業任務', '一般任務', '新手任務']
    groups = {
        '資料片任務': [g for g in order if g != '中原地圖'],
        '職業任務': list(CLASS.values()),
        '新手任務': ['義勇軍校場', '勇士', '劍俠', '術者', '道人', '僧侶'],
    }
    groups['一般任務'] = sorted({r['g'] for r in out if r['c'] == '一般任務'}, key=lambda g: min(r['m'] or 9999 for r in out if r['g'] == g))
    data = {'cats': cats, 'groups': groups, 'stages': {str(k): v for k, v in stage_name.items()}, 'quests': out}
    with open(os.path.join(ROOT, 'data/quests.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(out), 'quests', Counter(r['c'] for r in out), 'with rewards', sum('r' in r for r in out), 'with items', sum('it' in r for r in out))


if __name__ == '__main__':
    main(sys.argv[1])

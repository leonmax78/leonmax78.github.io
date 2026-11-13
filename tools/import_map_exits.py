"""Add cross-map exits (MPC event action 3) to data/stage_maps.json as stage['exits'].

usage: python tools/import_map_exits.py <folder with stageNNN.mpc> [<folder with MSG*/STGMSG*.INI>]
Each exit: {destination, label, x, y, conditional[, portal]}; x/y are site map pixels (raw / 8).
With the dialog folder, events that open a dialog (action 42) are followed through
Jump / OptJump / trigger jumps (act 12); a trigger act 3 there is a portal (portal: true).
Death-return branches and exits to the same map are skipped; tower maps keep their
reviewed 'transfers' instead.
"""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_mpc_transfers import parse

ROOT = Path(__file__).resolve().parents[1]

# Dialog teleports are only shown when checked in game: many dialog chains are
# boss-room exits, failure returns or quest-only teleports that a player can't use
# freely. (stage, destination) pairs listed here are confirmed.
PORTAL_KEEP = {(127, 132)}   # 亂石林 穹蒼結界 → 大汗陵墓


def load_msgs(folder):
    msgs = {}
    for f in sorted(Path(folder).glob('*.INI')):
        text = f.read_bytes().decode('cp950', 'ignore')
        for block in text.split('[MSG]')[1:]:
            d = {}
            for line in block.splitlines():
                if '=' in line:
                    k, v = line.split('=', 1)
                    d.setdefault(k.strip(), []).append(v.strip())
            if 'ID' in d and d['ID'][0].isdigit():
                msgs[int(d['ID'][0])] = d
    return msgs


def trigger_actions(s):
    v = [x.strip() for x in s.split(',')]
    i = 0
    def nxt():
        nonlocal i
        x = v[i] if i < len(v) else ''; i += 1; return x
    try:
        for _ in range(int(nxt())):
            nxt(); nxt(); n = int(nxt()); [nxt() for _ in range(n)]
        acts = []
        for _ in range(int(nxt())):
            code = int(nxt()); n = int(nxt()); acts.append((code, [nxt() for _ in range(n)]))
        return acts
    except Exception:
        return []


def dialog_teleports(msgs, start):
    """Destinations reachable from a dialog: [(dest, needs_choice_or_condition)]"""
    seen, todo, found = set(), [(start, False)], {}
    while todo and len(seen) < 60:
        mid, cond = todo.pop()
        if mid in seen or mid not in msgs:
            continue
        seen.add(mid)
        d = msgs[mid]
        nexts = [j for j in d.get('Jump', []) if j.isdigit()]
        opts = [j for k, vals in d.items() if k.startswith('OptJump') for j in vals if j.isdigit()]
        for j in nexts: todo.append((int(j), cond))
        for j in opts: todo.append((int(j), True))
        for k, vals in d.items():
            if not k.startswith('Trigger'):
                continue
            for t in vals:
                has_cond = not t.strip().startswith('0,')
                for code, params in trigger_actions(t):
                    if code == 12 and params and params[0].isdigit():
                        todo.append((int(params[0]), cond or has_cond))
                    if code == 3 and params and params[0].isdigit():
                        dest = int(params[0])
                        found[dest] = found.get(dest, True) and (cond or has_cond)
    return found


def clusters(pts, gap=48 * 8):
    """Split raw event points into groups whose members are within `gap` (raw units) of each other."""
    groups = []
    for p in pts:
        near = [g for g in groups if any(abs(p[0] - q[0]) <= gap and abs(p[1] - q[1]) <= gap for q in g)]
        merged = [p]
        for g in near:
            merged += g; groups.remove(g)
        groups.append(merged)
    return groups


def main(mpc_dir, msg_dir=None):
    msgs = load_msgs(msg_dir) if msg_dir else {}
    path = ROOT / 'data/stage_maps.json'
    data = json.loads(path.read_text('utf-8'))
    names = {s['stageId']: s['stageName'] for s in data['stages']}
    total = 0
    for stage in data['stages']:
        sid = stage['stageId']
        stage.pop('exits', None)
        if stage.get('mapCategory') == 'tower':
            continue
        f = Path(mpc_dir) / f'stage{sid:03d}.mpc'
        if not f.exists():
            continue
        mpc = parse(f)
        exits = {}
        for ev in mpc['events']:
            src = [o for o in mpc['objects'] if o[8] == ev['id']]
            if not src:
                continue
            for br in ev['branches']:
                if any(c[0] == 32 for c in br['conditions']):
                    continue
                for a in br['actions']:
                    dest = a[3]
                    if a[0] != 3 or dest == sid or dest not in names:
                        continue
                    e = exits.setdefault((ev['id'], dest), dict(pts=[(o[1], o[2]) for o in src], cond=False))
                    if br['conditions'] or len(ev['branches']) > 1:
                        e['cond'] = True
        if msgs:
            for ev in mpc['events']:
                src = [o for o in mpc['objects'] if o[8] == ev['id']]
                if not src:
                    continue
                for br in ev['branches']:
                    if any(c[0] == 32 for c in br['conditions']):
                        continue
                    for a in br['actions']:
                        if a[0] != 42:
                            continue
                        for dest, cond in dialog_teleports(msgs, a[3]).items():
                            if (sid, dest) not in PORTAL_KEEP:
                                continue
                            if dest == sid or dest not in names or (ev['id'], dest) in exits:
                                continue
                            exits[(ev['id'], dest)] = dict(pts=[(o[1], o[2]) for o in src],
                                cond=cond or bool(br['conditions']), portal=True)
        rows = []
        for (_, dest), e in sorted(exits.items()):
            # one event can cover several far-apart spots (e.g. 比武校場: all four corners)
            for pts in clusters(e['pts']):
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                rows.append(dict(destination=dest, label=names[dest],
                                 x=round(sum(xs) / len(xs) / 8, 1), y=round(sum(ys) / len(ys) / 8, 1),
                                 conditional=e['cond']))
                if e.get('portal'):
                    rows[-1]['portal'] = True
        if rows:
            stage['exits'] = rows
            total += len(rows)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('exits', total, 'portals', sum(1 for st in data['stages'] for e in st.get('exits', []) if e.get('portal')))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

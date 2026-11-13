"""Add cross-map exits (MPC event action 3) to data/stage_maps.json as stage['exits'].

usage: python tools/import_map_exits.py <folder with stageNNN.mpc>
Each exit: {destination, label, x, y, conditional}; x/y are site map pixels (raw / 8).
Death-return branches and exits to the same map are skipped; tower maps keep their
reviewed 'transfers' instead.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_mpc_transfers import parse

ROOT = Path(__file__).resolve().parents[1]


def main(mpc_dir):
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
        rows = []
        for (_, dest), e in sorted(exits.items()):
            xs = [p[0] for p in e['pts']]; ys = [p[1] for p in e['pts']]
            rows.append(dict(destination=dest, label=names[dest],
                             x=round(sum(xs) / len(xs) / 8, 1), y=round(sum(ys) / len(ys) / 8, 1),
                             conditional=e['cond']))
        if rows:
            stage['exits'] = rows
            total += len(rows)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('exits', total)


if __name__ == '__main__':
    main(sys.argv[1])

"""Read-only MPC event/landing-tag research. Does not update site or game data."""
import json
import re
import struct
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'outputs/1029-client/DATA1'
UPDATE = Path.home() / 'Desktop/1029深淵/1029'
TOWER = list(range(284, 295)) + list(range(342, 349))


def parse(path):
    data = path.read_bytes()
    assert data[:4] == b'MAP\0', path
    header = struct.unpack_from('<16I', data)
    start, count, end, events = header[6:10]
    assert start + count * 38 == end
    objects = [struct.unpack_from('<19H', data, pos) for pos in range(start, end, 38)]
    pos = end

    def read(n):
        nonlocal pos
        result = list(struct.unpack_from(f'<{n}I', data, pos))
        pos += n * 4
        return result

    records = []
    for _ in range(events):
        offset = pos
        event_id, cursor, branches = read(3)
        assert branches < 1000
        rows = []
        for _ in range(branches):
            branch_id, contact, unknown, conditions, actions = read(5)
            assert conditions < 1000 and actions < 1000
            rows.append(dict(id=branch_id, contact=contact, unknown=unknown,
                             conditions=[read(12) for _ in range(conditions)],
                             actions=[read(12) for _ in range(actions)]))
        records.append(dict(id=event_id, cursor=cursor, offset=offset, branches=rows))
    assert pos == len(data) == header[11], (path, pos, len(data))
    return dict(path=str(path), objects=objects, events=records, size=pos)


def points(objects):
    return [dict(sequence=o[0], rawX=o[1], rawY=o[2],
                 x=o[1]/16, y=o[2]/16, tag=o[5], event=o[8]) for o in objects]


def main():
    files = {int(p.stem[5:]): p for p in (BASE/'map').glob('stage*.mpc')}
    files.update({int(p.stem[5:]): p for p in (UPDATE/'MAP').glob('STAGE*.MPC')})
    names = {s['stageId']: s['stageName'] for s in json.loads((ROOT/'data/stage_maps.json').read_text('utf-8'))['stages']}
    definitions = (BASE/'setting/event.ini').read_bytes().decode('cp950')
    condition_names = {int(v): k for k, v in re.findall(r'#define\s+(EVENT_COND_\w+)\s+(\d+)', definitions)}
    parsed, failures = {}, {}
    for sid, path in files.items():
        try:
            parsed[sid] = parse(path)
        except (AssertionError, struct.error, ValueError) as error:
            failures[sid] = str(error)
    routes = []
    for sid in TOWER + [381, 400]:
        stage = parsed[sid]
        for event in stage['events']:
            sources = points([o for o in stage['objects'] if o[8] == event['id']])
            for branch in event['branches']:
                for action in branch['actions']:
                    if action[0] not in (3, 9):
                        continue
                    destination = action[3] if action[0] == 3 else sid
                    tag = action[5] if action[0] == 3 else action[3]
                    target = parsed.get(destination, {})
                    landings = points([o for o in target.get('objects', []) if o[0] == 10002 and o[5] == tag])
                    routes.append(dict(stage=sid, name=names.get(sid), event=event['id'],
                        eventOffset=event['offset'], branch=branch['id'], contact=branch['contact'],
                        kind='cross-map' if action[0] == 3 else 'same-map',
                        destination=destination, destinationName=names.get(destination), tag=tag,
                        sources=sources, landings=landings, action=action,
                        conditions=[dict(name=condition_names.get(c[0], str(c[0])), raw=c) for c in branch['conditions']],
                        deathReturn=any(c[0] == 32 for c in branch['conditions'])))
    tower = [r for r in routes if r['stage'] in TOWER]
    summary = dict(parsedMaps=len(parsed), failedMaps=len(failures), towerMaps=len(TOWER),
        towerTransferBranches=len(tower), towerUniqueTransferEvents=len({(r['stage'], r['event']) for r in tower}),
        towerUnresolvedLandings=sum(not r['landings'] for r in tower),
        towerUnplacedEvents=sum(not r['sources'] for r in tower),
        towerDeathReturnBranches=sum(r['deathReturn'] for r in tower),
        kinds=dict(Counter(r['kind'] for r in tower)))
    result = dict(summary=summary, failures=failures, routes=routes,
        note='Raw MPC evidence; floor labels and complete condition semantics are not inferred. Multiple landing points per TAG are retained.')
    output = ROOT/'reports/mpc-transfer-audit.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', 'utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print('Report:', output)


if __name__ == '__main__':
    main()

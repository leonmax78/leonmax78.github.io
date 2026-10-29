"""Import only the reviewed Tower I transfer destinations from MPC evidence."""
import json
from audit_mpc_transfers import ROOT, BASE, parse


def main():
    path = ROOT / 'data/stage_maps.json'
    data = json.loads(path.read_text('utf-8'))
    stages = {s['stageId']: s for s in data['stages']}
    stage = stages[284]
    audit = json.loads((ROOT/'reports/mpc-transfer-audit.json').read_text('utf-8'))
    events = {e['id']: e for e in parse(BASE/'map/stage284.mpc')['events']}
    # Reviewed against the existing floor labels and disconnected map blocks.
    floors = {43: 2, 45: 3, 46: 4, 47: 5, 48: 6, 49: 7, 50: 8, 52: 9, 51: 10}
    groups = {}
    for r in audit['routes']:
        if r['stage'] != 284 or r['deathReturn'] or not r['sources']:
            continue
        assert r['landings'], r
        key = (r['event'], r['destination'], r['tag'])
        groups.setdefault(key, []).append(r)
    result = []
    for (event, destination, tag), branches in groups.items():
        r = branches[0]
        x = sum(p['rawX'] for p in r['sources'])/len(r['sources'])/8
        y = sum(p['rawY'] for p in r['sources'])/len(r['sources'])/8
        floor = floors[tag] if destination == 284 else 11 if destination == 285 else None
        label = f'第{floor}層' if floor else stages[destination]['stageName']
        conditional = len(events[event]['branches']) > 1 or any(b['conditions'] for b in branches)
        result.append(dict(event=event, x=round(x, 2), y=round(y, 2),
            destination=destination, tag=tag, destinationFloor=floor, label=label,
            conditional=conditional, branches=[b['branch'] for b in branches],
            landingPoints=[dict(x=p['rawX']/8, y=p['rawY']/8) for p in r['landings']]))
    assert len(result) == 13
    assert {r['destinationFloor'] for r in result if r['destinationFloor']} == set(range(2, 12))
    stage['transfers'] = result
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('Imported 13 reviewed transfer events; death-return branches excluded.')


if __name__ == '__main__':
    main()

"""Regression checks against the reviewed pre-import commit."""
import json
import subprocess
from pathlib import Path
from build_data import build_drop_reverse, parse_ini_records, read_text

ROOT = Path(__file__).resolve().parents[1]
BASE = '37df98b53ed9d9dc6a6b5c99fe854244d400def0'
def load(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))
def original(name):
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE}:{name}'], cwd=ROOT))

before = original('data/monsters.json')
after = load('data/monsters.json')
assert len(before) == len(after)
changed = []
for a, b in zip(before, after):
    if a == b:
        continue
    assert not a.get('DropItem') and b.get('DropItem')
    assert a == {k: v for k, v in b.items() if k != 'DropItem'}
    changed.append(b)
assert len(changed) == 110
assert next(r for r in before if r['ID'] == '9569') == next(r for r in after if r['ID'] == '9569')
ids = {r['ID'] for r in changed}
reverse = load('data/drop_reverse.json')
expected = build_drop_reverse(changed)
old_reverse = original('data/drop_reverse.json')
for key in old_reverse.keys() | reverse.keys():
    old = [r for r in old_reverse.get(key, []) if str(r['monsterId']) not in ids]
    kept = [r for r in reverse.get(key, []) if str(r['monsterId']) not in ids]
    assert sorted(old, key=lambda r: str(r['monsterId'])) == sorted(kept, key=lambda r: str(r['monsterId']))
    added = [r for r in reverse.get(key, []) if str(r['monsterId']) in ids]
    assert added == expected.get(key, [])
for key in expected:
    assert load(f'data/drop_reverse_shards/{key[:3]}.json')[key] == reverse[key]
raw = {r['ID']: r for r in parse_ini_records(read_text(ROOT / 'raw/new/MONSTER_C.INI'))}
assert all(raw[r['ID']]['DropItem'] == r['DropItem'] for r in changed)
runtime = (ROOT / 'data/runtime-data.js').read_text(encoding='utf-8')
assert json.loads(runtime.split('=', 1)[1].strip().rstrip(';'))['monsters'] == after
print('PASS: exactly 110 absent tables filled; existing fields, drops and beast preserved; reverse/shards/raw/runtime synchronized.')

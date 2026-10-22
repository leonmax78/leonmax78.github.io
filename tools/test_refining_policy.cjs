const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/refining-policy.js'), 'utf8'), context);
const policy = context.window.SZO_REFINING;
const promoted = [571,572,573,574,580,581,582,583,584,585,586,587,588,589,590,591];
for (const id of promoted) {
  const original = {id, stable_value: id < 580 ? 70 : 50, group: id < 580 ? 'stable_70' : 'stable_50'};
  const applied = policy.apply(original);
  assert.equal(applied.stable_value, 99);
  assert.equal(applied.group, original.group);
  assert.equal(policy.apply(applied).original_stable_value, original.stable_value);
  assert.equal(policy.value({id, stable: original.stable_value}), 99);
  policy.enabled = false;
  assert.equal(policy.value(applied), original.stable_value);
  policy.enabled = true;
}
for (const id of [548,549,550,551,552,553,554,555,295,297]) {
  assert.equal(policy.value({id, stable_value:50}), 50);
}
assert.equal(policy.value({id:580}), undefined);
assert.equal(policy.value({id:580, stable:12}), 12);
console.log('PASS: 16 new recipes promoted; old recipes unchanged; restoration and item-flow values verified.');

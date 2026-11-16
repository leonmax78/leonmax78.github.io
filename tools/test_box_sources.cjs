const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
global.window = {};
require('../data/box-sources.js');
require('../js/box-source-rows.js');
const items = new Map(read('items.json').map(i => [i.ID, i]));
const reverse = read('drop_reverse.json');
const lookup = window.szoBoxSourceRows;
const example = lookup(reverse['23603']);
assert.deepEqual(example.filter(x => x.boxId).map(x => [x.boxId, x.monsterName, x.rate]),
  [['23842', '無間邪兵戰匣', 7.5], ['23938', '天戮邪兵戰匣', 3]]);
let tested = 0;
for (const prefix of read('drop_reverse_shards/manifest.json').shards) {
  for (const [id, rows] of Object.entries(read('drop_reverse_shards/' + prefix + '.json'))) {
    assert.deepEqual(lookup(rows), lookup(reverse[id]));
    for (const row of rows) {
      for (const out of lookup([row])) {
        assert.equal(out.rate, row.rate);
        assert.equal(out.weight, row.weight);
        if (!out.boxId) { assert.equal(out, row); continue; }
        const item = items.get(out.boxId);
        assert.equal(item.Magic, String(row.monsterId));
        assert.equal(item.Name, out.monsterName);
        tested++;
      }
    }
  }
}
console.log('Verified box-to-reward links:', tested);

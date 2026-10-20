const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Pass the extracted stage238.mpc path.');
const bytes = fs.readFileSync(source);
assert.equal(bytes.subarray(0, 4).toString(), 'MAP\0');
const monsters = new Map(JSON.parse(fs.readFileSync(path.join(root, 'data/monsters.json'), 'utf8')).map(row => [Number(row.ID), row]));
const target = path.join(root, 'data/stage_maps.json');
const data = JSON.parse(fs.readFileSync(target, 'utf8'));
const stage = data.stages.find(row => row.stageId === 238);
assert(stage);
const chests = [];
// MPC placements use 38-byte records; the entity ID is at byte 16.
const start = bytes.readUInt32LE(24) + 2;
const end = bytes.readUInt32LE(32);
assert(end <= bytes.length && start < end);
for (let offset = start; offset + 38 <= end; offset += 38) {
  const id = bytes.readUInt16LE(offset + 16);
  const row = monsters.get(id);
  if (!row?.Name.includes('寶箱')) continue;
  const rawX = bytes.readUInt16LE(offset), rawY = bytes.readUInt16LE(offset + 2);
  chests.push({
    kind: 'monster', id, name: row.Name, pic: Number(row.Pic), level: Number(row.Level),
    x: Math.round(rawX / 16 * stage.scale), y: Math.round(rawY / 16 * stage.scale),
    rawX, rawY, source: 'STAGE238.MPC'
  });
}
assert.equal(chests.length, 39);
assert(chests.every(row => row.x >= 0 && row.x <= stage.width && row.y >= 0 && row.y <= stage.height));
stage.chests = chests;
fs.writeFileSync(target, JSON.stringify(data));
console.log(`Imported ${chests.length} chest placements into stage 238 only.`);

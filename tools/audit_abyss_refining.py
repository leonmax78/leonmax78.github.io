"""Compare installer MaxRef=99 recipes with actual website data and policy."""
import json
import subprocess
import sys
from pathlib import Path
from build_data import read_text, parse_ini_records, record_to_plain

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
rows = [record_to_plain(r) for r in parse_ini_records(read_text(source)) if r.get('MaxRef') == '99']
assert len(rows) == 24
program = r"""
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=JSON.parse(fs.readFileSync(0,'utf8'));
const site=JSON.parse(fs.readFileSync('data/compound.json','utf8'));
const c={window:{}};
vm.createContext(c);
vm.runInContext(fs.readFileSync('data/refining-policy.js','utf8'),c);
vm.runInContext(fs.readFileSync('js/data/equip-compound-data.js','utf8')+';window.equip=EQUIP_COMPOUND_DATA;',c);
const result=source.map(r=>{
 const s=site.find(s=>s.ID===r.ID);
 assert(s,'Missing recipe '+r.ID);
 for(const key of ['Name','Stable','MaxRef'])assert.equal(s[key],r[key],r.ID+' '+key);
 const stable=c.window.SZO_REFINING.value({id:Number(s.ID),stable_value:Number(s.Stable)});
 const embedded=c.window.equip.recipes.find(s=>Number(s.id)===Number(r.ID));
 assert(embedded,'Missing embedded recipe '+r.ID);
 assert.equal(Number(embedded.stable_value),Number(r.Stable));
 assert.equal(Number(embedded.max_ref),Number(r.MaxRef));
 return {id:r.ID,name:r.Name,rawStable:Number(r.Stable),maxRef:Number(r.MaxRef),websiteStable:stable};
});
assert.equal(result.filter(r=>r.websiteStable===99).length,16);
assert.equal(result.filter(r=>r.websiteStable===50).length,8);
process.stdout.write(JSON.stringify(result));
"""
result = json.loads(subprocess.check_output(['node', '-e', program], input=json.dumps(rows).encode('utf-8'), cwd=ROOT))
lines = ['# 深淵主程式 MaxRef=99 配方比對', '',
         '來源：28000 主程式 data1/setting/compound.ini。共 24 種。', '',
         '`MaxRef` 是最高煉製上限，`Stable` 才是原始安定值。網站依已確認的限時活動將 16 種新配方調為 99；8 種舊配方維持 50。', '',
         '已核對 data/compound.json、裝備試算內嵌配方資料及實際 SZO_REFINING 政策函式；全部相符，無須修改試算數值。', '',
         '| ID | 配方 | 檔案 Stable | MaxRef | 網站有效安定值 |', '| --- | --- | ---: | ---: | ---: |']
lines += [f"| {r['id']} | {r['name']} | {r['rawStable']} | {r['maxRef']} | {r['websiteStable']} |" for r in result]
(ROOT / 'reports/abyss-28000-refining.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('PASS: 24 MaxRef=99 recipes; 16 promoted, 8 old unchanged; raw and embedded calculator data match.')

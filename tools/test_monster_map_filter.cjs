const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://preview.test/**',r=>{
    const file=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');
    return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
   });
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
   await page.locator('[data-view="monster"]').evaluate(b=>b.click());
   await page.waitForFunction(()=>document.querySelector('#monsterMapMain')&&!document.querySelector('#monsterMapMain').disabled);
   const stages=JSON.parse(fs.readFileSync(path.join(root,'data/stage_maps.json'),'utf8')).stages;
   const valid=stages.filter(s=>s.monsters.some(m=>m.id!=null&&Number.isFinite(m.x)&&Number.isFinite(m.y)));
   const options=await page.locator('#monsterMapMain option').evaluateAll(nodes=>nodes.map(n=>n.value));
   assert.deepEqual(options,['',...valid.map(s=>String(s.stageId))]);
   assert(!options.includes('7'),'Empty capital must not appear');
   const selected=valid.find(s=>s.stageId===395)||valid[0];
   await page.locator('#monsterMapMain').selectOption(String(selected.stageId));
   await page.waitForFunction(()=>document.querySelectorAll('#monsterResultsMain [data-monster]').length>0);
   const ids=new Set(selected.monsters.map(m=>String(m.id)));
   assert((await page.locator('#monsterResultsMain [data-monster]').evaluateAll(ns=>ns.map(n=>n.dataset.monster))).every(id=>ids.has(id)));
   await page.evaluate(()=>renderMonsterPage());
   assert.equal(await page.locator('#monsterMapMain').inputValue(),String(selected.stageId));
   await page.evaluate(()=>clearMonsterSearchFilters());
   assert.equal(await page.locator('#monsterMapMain').inputValue(),'');
   await page.evaluate(async()=>{await ensureMonsterDataLoaded();setMonsterQueryMode('beast');});
   await page.waitForFunction(()=>document.querySelector('#monsterResultsMain .resultItem'));
   await page.locator('#monsterResultsMain .resultItem').first().click();
   await page.getByText('攻擊距離（原始值）',{exact:true}).waitFor();
   await page.getByText('攻擊速度（原始值）',{exact:true}).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(root,`outputs/beast-speed-${width}.png`)});
   await page.evaluate(()=>setMonsterQueryMode('monster'));
   await page.screenshot({path:path.join(root,`outputs/monster-map-${width}.png`)});
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('PASS '+width+': nonempty map options, ID filtering, restore/reset and beast fields');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

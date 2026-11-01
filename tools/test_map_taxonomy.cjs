const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const series={'霹靂':[190,202,227],'侍魂':[325,326,327,328],'幻三':[351,352,353,354,355],'東離':[370,371,372,373],'幻三鳳凰':[374,375,376],'活俠':[377,378,379,380],'絕代':[392,393,394,395]};
async function run(engine,width){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://preview.test')return r.abort();const f=path.join(root,decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
  await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();closeDrawer();});
  assert.equal(await page.evaluate(()=>Object.keys(SZO_MAP_TAXONOMY.stages).length),374);
  assert.deepEqual(await page.evaluate(()=>Object.entries(SZO_MAP_TAXONOMY.stages).filter(([id,c])=>c.hidden).map(([id])=>id)),[]);
  await page.selectOption('#mapGroupSelect','地火神兵');
  assert.equal(await page.locator('#mapStageSelect option[value="154"]').count(),1);
  assert.equal(await page.locator('#mapStageSelect option[value="155"]').count(),1);
  await page.selectOption('#mapCategorySelect','特殊地圖');await page.selectOption('#mapGroupSelect','聯動');
  assert.deepEqual(await page.locator('#mapSeriesSelect option').allTextContents(),Object.keys(series));
  for(const [name,ids] of Object.entries(series)){
   await page.selectOption('#mapSeriesSelect',name);
   assert.deepEqual(await page.locator('#mapStageSelect option').evaluateAll(ns=>ns.map(n=>Number(n.value))),ids);
  }
  await page.waitForFunction(()=>document.querySelector('#mapImage').naturalWidth>0);
  await page.screenshot({path:path.join(root,`outputs/taxonomy-map-${width}.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.selectOption('#mapGroupSelect','終末之塔');
  assert.equal(await page.locator('#mapStageSelect option').count(),180);
  await page.selectOption('#mapGroupSelect','虛空大秘境');
  assert.equal(await page.locator('.mapSide:not(.mapChestSide):not(.mapNpcSide) .mapMarkerChoice').count() >= 28,true);
  await page.locator('[data-map-all="monster"]').click();
  assert.equal(await page.locator('.mapMarkerChoice input:checked').count(),28);
  await page.screenshot({path:path.join(root,`outputs/secret-realm-${width}.png`)});
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_monster');window.v88MonsterMap='';await renderMonsterPage();});
  await page.waitForFunction(()=>document.querySelector('#monsterMapMain')&&!document.querySelector('#monsterMapMain').disabled);
  await page.selectOption('#monsterMapCategorySelect','特殊地圖');await page.selectOption('#monsterMapGroupSelect','聯動');
  assert.deepEqual(await page.locator('#monsterMapSeriesSelect option').allTextContents(),Object.keys(series));
  await page.selectOption('#monsterMapSeriesSelect','絕代');
  const options=await page.locator('#monsterMapMain option').evaluateAll(ns=>ns.map(n=>n.value).filter(Boolean));
  assert(options.length&&options.every(id=>series['絕代'].includes(Number(id))));
  assert.equal(await page.evaluate(()=>SZO_MAP_CLASS.get('155').group),'地火神兵');
  await page.screenshot({path:path.join(root,`outputs/taxonomy-monster-${width}.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width>=768){
   await page.evaluate(()=>setView('autodata'));
   await page.waitForFunction(()=>document.querySelector('#ae-mapCategorySelect'));
   await page.locator('#ae-tab-map').click();
   await page.selectOption('#ae-mapCategorySelect','特殊地圖');
   await page.selectOption('#ae-mapGroupSelect','虛空大秘境');
   await page.selectOption('#ae-map','300');
   assert((await page.locator('#ae-map-info').innerText()).includes('索魂狼'));
   await page.selectOption('#ae-mapCategorySelect','一般地圖');
   await page.selectOption('#ae-mapGroupSelect','地火神兵');assert.equal(await page.locator('#ae-map option[value="154"]').count(),1);
   assert.equal(await page.locator('#ae-map option[value="155"]').count(),1);
   await page.selectOption('#ae-mapCategorySelect','特殊地圖');await page.selectOption('#ae-mapGroupSelect','聯動');
   assert.deepEqual(await page.locator('#ae-mapSeriesSelect option').allTextContents(),Object.keys(series));
   for(const [name,ids] of Object.entries(series)){
    await page.selectOption('#ae-mapSeriesSelect',name);
    assert.deepEqual(await page.locator('#ae-map option').evaluateAll(ns=>ns.filter(n=>n.value).map(n=>Number(n.value))),ids);
   }
   await page.selectOption('#ae-map','395');assert((await page.locator('#ae-map-info').innerText()).includes('怪物：'));
   assert.equal(await page.evaluate(async()=>(await AutoDataServices.loadData()).maps.some(m=>m.stageId===155)),true);
   await page.screenshot({path:path.join(root,'outputs/taxonomy-editor.png')});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS taxonomy',width,'series order/memberships, visible154/155, tower180, responsive layout');
 }finally{await browser.close();}
}
(async()=>{await run(chromium,1440);await run(webkit,390);})().catch(e=>{console.error(e);process.exit(1);});

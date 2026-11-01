const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const stages=require('../data/stage_maps.json').stages;
const towers=stages.filter(s=>s.mapCategory==='tower');
assert.equal(towers.length,18);
assert.deepEqual(towers.flatMap(s=>s.areas.map(a=>a.floor)),Array.from({length:180},(_,i)=>i+1));
for(const s of towers)for(const m of s.monsters)assert(m.floor||s.stageId===284&&m.id===15723);
const names=f=>towers.flatMap(s=>s.monsters).filter(m=>m.floor===f).map(m=>m.name);
assert.notDeepEqual([...new Set(names(37))],[...new Set(names(38))]);
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://preview.test')return r.abort();const file=path.join(root,decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();closeDrawer();});
  assert.equal(await page.locator('#mapStageSelect optgroup[label="終末之塔"] option').count(),180);
  for(const floor of [37,38,162,173,180]){
   const stage=towers.find(s=>s.areas.some(a=>a.floor===floor));
   await page.selectOption('#mapStageSelect',`${stage.stageId}:${floor}`,{force:true});
   assert.deepEqual(await page.locator('.mapAreaLabel').allTextContents(),[floor+'樓']);
   assert.equal(await page.locator('.mapTransferLabel').count(),0);
   const expected=[...new Set(names(floor))];
   const text=await page.locator('.mapMonsterSide').innerText();
   expected.forEach(n=>assert(text.includes(n),n));
   const ids=await page.locator('.mapDot[data-map-monster]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.mapMonster)));
   assert(ids.length>0);
   assert(ids.every(id=>stage.monsters.some(m=>m.floor===floor&&m.id===id)));
  }
  await page.selectOption('#mapStageSelect','287:37',{force:true});
  await page.screenshot({path:path.join(root,'outputs/tower-floor-37.png')});
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_monster');await ensureMonsterSpawnIds();});
  assert(await page.evaluate(()=>{window.v88MonsterMap='tower:37';return monsterMapIds.get('tower:37').size>0&&monsterMapOptionsHTML().includes('終末之塔');}));
  await page.evaluate(()=>setView('autodata'));
  await page.waitForFunction(()=>document.querySelector('#ae-map option[value="tower:37"]'));
  await page.locator('#ae-tab-map').click();await page.selectOption('#ae-map','tower:37');
  assert((await page.locator('#ae-map-info').innerText()).includes('37樓'));
  const result=await page.evaluate(async()=>{
   const d=await AutoDataServices.loadData();return [37,38].map(f=>{const m=d.maps.find(m=>m.key==='tower:'+f);return {floor:f,names:m.monsterNames,ids:[...m.ids]};});
  });
  const reverse=require('../data/drop_reverse.json');
  for(const r of result){const monsterIds=new Set(towers.flatMap(s=>s.monsters).filter(m=>m.floor===r.floor).map(m=>String(m.id)));const expected=Object.entries(reverse).filter(([id,rows])=>rows.some(row=>monsterIds.has(String(row.monsterId)))).map(([id])=>id);assert.deepEqual(r.ids.sort(),expected.sort());}
  assert.deepEqual(errors,[]);
  console.log('PASS: 180 floors, map filtering, monster filters, canonical drop sets, 37/38 isolation.');
  console.log(result.map(r=>`${r.floor}: ${r.names.join(', ')}; ${r.ids.length} drops`).join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

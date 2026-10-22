const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const maps=JSON.parse(fs.readFileSync(path.join(root,'data/stage_maps.json')));
const old=JSON.parse(cp.execFileSync('git',['show','3af2b627:data/stage_maps.json'],{cwd:root,maxBuffer:50e6}));
assert.deepEqual(maps.stages.filter(s=>JSON.stringify(s)!==JSON.stringify(old.stages.find(o=>o.stageId===s.stageId))).map(s=>s.stageId),[7,395]);
const stage=maps.stages.find(s=>s.stageId===395);
assert.equal(stage.monsters.length,47);assert.equal(stage.npcs.length,2);
assert.equal(stage.npcs.find(n=>n.id===12104).pic,6394);
assert.equal(stage.npcs.find(n=>n.id===12105).pic,6391);
assert.equal(maps.stages.find(s=>s.stageId===7).npcs.find(n=>n.id===12103).pic,6394);
assert(fs.existsSync(path.join(root,'assets/test-media/npc-portraits/n6394.png')));
for(const m of [...stage.monsters,...stage.npcs])assert(m.x>=0&&m.x<=stage.width&&m.y>=0&&m.y<=stage.height);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/asset_manifest.json')));
assert(manifest.itemIcons.includes('6898'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://preview.test/**',r=>{
    const file=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');
    return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
   });
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);await page.waitForFunction(()=>window.SZO_READY);
   await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();closeDrawer();});
   await page.locator('#mapStageSearch').fill('395');
   await page.locator('#mapStageChoices button').filter({hasText:'天外天密道'}).click();
   await page.waitForFunction(()=>{const i=document.getElementById('mapImage');return i?.complete&&i.naturalWidth===1120;});
   assert((await page.locator('#reader').innerText()).includes('密道刺客'));
   assert((await page.locator('#reader').innerText()).includes('江小魚'));
   await page.locator('[data-map-all="monster"]').click();
   await page.locator('[data-map-all="npc"]').click();
   assert.equal(await page.locator('.mapDot').count(),49);
   await page.screenshot({path:path.join(root,'outputs',`tianwaitian-${width}.png`)});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}: new map loaded, 49 markers, searchable monsters and NPCs, unrelated maps unchanged.`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

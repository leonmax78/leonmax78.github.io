const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process'),vm=require('vm');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),load=name=>JSON.parse(fs.readFileSync(path.join(root,`data/${name}.json`),'utf8'));
const maps=load('stage_maps'),items=load('items'),monsters=load('monsters'),reverse=load('drop_reverse'),jewels=load('jewels');
const old=JSON.parse(cp.execFileSync('git',['show','1b2e11f2:data/stage_maps.json'],{cwd:root,maxBuffer:50e6}));
assert.equal(jewels.slots.filter(s=>Number(s.NeedLv)<=5000).length,14);
assert.equal(jewels.slots.filter(s=>Number(s.NeedLv)<=20000).length,30);
for(const s of maps.stages){
 if(![6,7,8,381,400,401,402,403].includes(s.stageId))assert.deepEqual(s,old.stages.find(o=>o.stageId===s.stageId));
 if(s.stageId>=400&&s.stageId<=403){
  assert(s.monsters.length>50);assert(fs.existsSync(path.join(root,s.image)));
  for(const m of [...s.monsters,...s.npcs])assert(m.x>=0&&m.x<=s.width&&m.y>=0&&m.y<=s.height);
  for(const m of s.monsters)assert(fs.existsSync(path.join(root,`assets/test-media/monster-portraits/m${m.pic}.png`)));
 }
}
for(const m of monsters.filter(m=>m.DropRevision)){
 for(const iid of m.RemovedDrops)assert(!(reverse[iid]||[]).some(r=>String(r.monsterId)===m.ID));
 for(const iid of m.AnnouncedDrops)assert((reverse[iid]||[]).some(r=>String(r.monsterId)===m.ID&&r.rate===null));
}
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/item-contents.js'),'utf8'),ctx);
const packs=[['神州深淵錦囊',[0.0225,0.015,0.0275,0.05,0.065,0.065,0.065,0.065,0.065,1,1.96,5.55,6,7.5,8.6,9.45,10.65,11.8,15.55,21.5]],['絕代移花宮主錦囊',[0.02,0.02,0.025,0.025,0.05,0.05,0.05,0.5,3.65,1.51,1.85,4.9,5.95,5.95,5.95,9.5,11.5,14.5,14,20]]];
for(const [name,rates] of packs){
 const item=items.find(i=>i.Name===name),contents=ctx.window.SZO_ITEM_CONTENTS[item.ID];
 assert.equal(contents.ids.length,20);contents.ids.forEach((id,i)=>assert(Math.abs(contents.rates[id]-rates[i])<1e-8,name+' '+id));
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://preview.test/**',r=>{const file=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(8000);await page.waitForFunction(()=>window.SZO_READY);
   await page.evaluate(()=>setView('abyss'));
   assert((await page.locator('#abyssGemTotal').innerText()).includes('14 格'));
   assert((await page.locator('#abyssGemTotal').innerText()).includes('2,775'));
   await page.locator('#abyssLevel').fill('20000');
   assert((await page.locator('#abyssGemTotal').innerText()).includes('6,300'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await page.screenshot({path:path.join(root,`outputs/abyss-guide-${width}.png`)});
   await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await SZO_PREVIEW.open('item','32306');});
   await page.waitForTimeout(400);
   assert((await page.locator('#detailPreview').innerText()).includes('+65'));
   assert((await page.locator('#detailPreview').innerText()).includes('敖姬'));
   await page.screenshot({path:path.join(root,`outputs/abyss-gem-${width}.png`)});
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.getElementById('detailPreview').open);
   await page.evaluate(async()=>{await ensureMonsterPageLoaded();await ensureMonsterDataLoaded();await SZO_PREVIEW.open('monster-drops','5032');});
   assert((await page.locator('#detailPreview').innerText()).includes('改版機率待確認'));
   assert(!(await page.locator('#detailPreview').innerText()).includes('靈木'));
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.getElementById('detailPreview').open);
   await page.evaluate(()=>setView('map'));
   for(const id of [400,401,402,403]){
    await page.locator('#mapStageSearch').fill(String(id));
    await page.locator('#mapStageChoices button').filter({hasText:maps.stages.find(s=>s.stageId===id).stageName}).click();
    await page.waitForFunction(()=>{const img=document.getElementById('mapImage');return img?.complete&&img.naturalWidth>500;});
    await page.evaluate(async()=>{const img=document.getElementById('mapImage');await img.decode();const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;if(!pixels.some((v,i)=>i%4!==3&&v>40))throw new Error('Blank map image');});
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(root,`outputs/abyss-map-${id}-${width}.png`)});
   }
   assert.deepEqual(errors,[]);console.log('PASS '+width+': maps, gems, slots, exchanges, pending rates, responsive layout');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

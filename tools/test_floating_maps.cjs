const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.MAP_BASE||'https://preview.test';
  if(!process.env.MAP_BASE)await page.route(base+'/**',route=>{
   const file=path.join(root,decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//,'')||'index.html');
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{
   await ensureMapPageLoaded();await renderStageMapPage();closeDrawer();
   window.testReaderNodes=[...document.getElementById('reader').childNodes];
   await openMonsterMapLocations('5795','大狂猴');
  });
  await page.locator('#floatingMap .mapPage').waitFor();
  assert.equal(await page.locator('#reader .mapPage').count(),0);
  await page.screenshot({path:path.join(root,`outputs/floating-map-${mobile?'mobile':'desktop'}.png`)});
  assert(await page.locator('#floatingMap').evaluate(el=>el.getBoundingClientRect().right<=innerWidth));
  await page.locator('[data-map-window-close]').click();
  assert(await page.evaluate(()=>testReaderNodes.every((n,i)=>document.getElementById('reader').childNodes[i]===n)));
  await page.evaluate(()=>SZO_PREVIEW.open('item','23347'));
  await page.locator('#detailPreview [data-rev]').waitFor();
  await page.locator('#detailPreview [data-rev]').click();
  await page.waitForFunction(()=>document.querySelector('#detailPreview .detailPreviewBody').textContent.includes('取得來源'));
  await page.evaluate(()=>SZO_PREVIEW.open('monster','5795'));
  await page.locator('[data-preview-map]').click();
  await page.locator('#floatingMap .mapPage').waitFor();
  await page.locator('#floatingMap .mapDot[data-map-monster-dot]').first().click({force:true});
  await page.locator('#detailPreview [data-preview-map]').waitFor();
  await page.locator('#detailPreview [data-preview-map]').click();
  await page.locator('#floatingMap .mapPage').waitFor();
  await page.locator('[data-map-window-close]').click();
  assert(await page.locator('#detailPreview').evaluate(el=>el.open));
  await page.locator('[data-preview-close]').click();
  await page.waitForFunction(()=>!document.getElementById('detailPreview').open);
  assert(await page.evaluate(()=>testReaderNodes.every((n,i)=>document.getElementById('reader').childNodes[i]===n)));
  await page.evaluate(async()=>{await ensureCollectPageLoaded();await renderCollectBookPage('weapon');closeDrawer();});
  assert.equal(await page.locator('[data-collect-map-query="當鋪掌櫃"]').count(),2);
  assert.equal(await page.locator('[data-collect-shop-location="京城"],[data-collect-shop-location="祁州"],[data-collect-shop-location="玄州當舖商人"]').count(),0);
  const shop=page.locator('[data-collect-shop-location]').filter({hasText:'黑心狐'}).first();
  await shop.scrollIntoViewIfNeeded();
  await page.evaluate(()=>{
   window.collectBefore={nodes:[...document.getElementById('reader').childNodes],y:scrollY,
    forms:[...document.querySelectorAll('.formBox')].map(e=>e.className),
    nav:[...document.querySelectorAll('.navBtn[data-view]')].map(e=>e.className)};
  });
  await shop.click();
  await page.locator('#floatingMap .mapPage').waitFor();
  await page.locator('[data-map-window-close]').click();
  assert(await page.evaluate(()=>collectBefore.nodes.every((n,i)=>document.getElementById('reader').childNodes[i]===n)));
  assert(await page.evaluate(()=>Math.abs(scrollY-collectBefore.y)<2));
  assert(await page.evaluate(()=>JSON.stringify(collectBefore.forms)===JSON.stringify([...document.querySelectorAll('.formBox')].map(e=>e.className))));
  assert(await page.evaluate(()=>JSON.stringify(collectBefore.nav)===JSON.stringify([...document.querySelectorAll('.navBtn[data-view]')].map(e=>e.className))));
  await page.evaluate(()=>renderCollectBookPage('artifact'));
  const bounty=page.locator('[data-collect-map-query="賞金獵人"]');
  assert.equal(await bounty.count(),3);
  for(let i=0;i<3;i++){
   assert.equal(await bounty.nth(i).textContent(),'賞金獵人');
   await bounty.nth(i).click();
   await page.locator('#floatingMap .mapPage').waitFor();
   assert.equal(await page.locator('#floatingMap #mapSearchInput').inputValue(),'賞金獵人');
   assert.equal(await page.locator('#floatingMap #mapStageSelect option').count(),5);
   assert(!(await page.locator('#floatingMap').textContent()).includes('塔干沙漠'));
   assert(await page.locator('#floatingMap .mapDot.npc').count()>0);
   await page.locator('[data-map-window-close]').click();
   assert.equal(await bounty.count(),3);
  }
  const dropButton=page.locator('[data-collect-reverse]').first();
  await dropButton.scrollIntoViewIfNeeded();
  await page.evaluate(()=>window.dropBefore={nodes:[...document.getElementById('reader').childNodes],y:scrollY});
  await dropButton.click();
  await page.locator('#detailPreview .collectDropDetailList').waitFor();
  assert(await page.evaluate(()=>dropBefore.nodes.every((n,i)=>document.getElementById('reader').childNodes[i]===n)));
  await page.locator('#detailPreview [data-preview-close]').click();
  await page.waitForFunction(()=>!document.getElementById('detailPreview').open);
  assert(await page.evaluate(()=>Math.abs(scrollY-dropBefore.y)<2));
  await page.reload();await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureQaPageLoaded();await renderQaPage();closeDrawer();});
  assert(await page.evaluate(()=>typeof window.renderReversePreviewHTML==='undefined'));
  for(const [query,selector] of [['誅仙','[data-qa-reverse]'],['誅仙','[data-qa-shop-item]'],['誅仙','[data-qa-item]'],['大狂猴','[data-qa-monster]']]){
   await page.locator('#qaInput').fill(query);
   await page.locator('#qaInput').press('Enter');
   const result=page.locator('#reader '+selector).first();
   await result.waitFor();
   await page.evaluate(()=>window.qaBefore=[...document.getElementById('reader').childNodes]);
   await result.click();
   await page.locator('#detailPreview').waitFor();
   await page.waitForFunction(()=>document.querySelector('#detailPreview .detailPreviewBody').textContent!=='資料載入中…');
   const content=await page.locator('#detailPreview .detailPreviewBody').textContent();
   assert(!/not a function|載入失敗|找不到這個/.test(content),content);
   assert(content.length>30,content);
   assert(await page.evaluate(()=>qaBefore.every((n,i)=>document.getElementById('reader').childNodes[i]===n)));
   await page.locator('#detailPreview [data-preview-close]').click();
   await page.waitForFunction(()=>!document.getElementById('detailPreview').open);
   assert.equal(await page.locator('#qaInput').inputValue(),query);
  }
  assert.deepEqual(errors,[]);
  console.log(mobile?'Mobile floating workflow passed':'Desktop floating workflow passed');
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

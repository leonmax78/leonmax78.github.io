const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.STATUS_BASE||'https://preview.test';
  if(!process.env.STATUS_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await renderItemPage('item');closeDrawer();});
  const check=await page.evaluate(()=>{
   const entries=Object.entries(SZO_APPROVED_STATUS_DESCRIPTIONS);
   return {count:entries.length,all:entries.every(([id,e])=>{const dom=document.createElement('div');dom.innerHTML=itemDetailBodyHTML({ID:'test',Name:'test',ExtraStatus:id});return e.lines.every(line=>dom.querySelector('[data-status-description]')?.textContent.includes(line));}),unknown:itemApprovedStatusHTML({ExtraStatus:'12'}),remove:itemApprovedStatusHTML({ExtraStatus:'146',StatusParam:'EFFECT_REMOVE'})};
  });
  assert.equal(check.count,12);assert(check.all);assert.equal(check.unknown,'');assert.equal(check.remove,'');
  for(const [id,label] of [['23347','真勇猛'],['23348','匯神']]){
   await page.evaluate(id=>showItem(id),id);
   assert((await page.locator('#reader [data-item-section="special"]').innerText()).includes(label));
   if(id==='23348')assert((await page.locator('#reader [data-status-description="76"]').innerText()).includes('+50%'));
   if(id==='23347')assert.equal(await page.locator('#reader [data-status-description="80"]').innerText(),'物理傷害輸出 +50%');
   await page.evaluate(id=>SZO_PREVIEW.open('item',id),id);
   assert((await page.locator('#detailPreview [data-item-section="special"]').innerText()).includes(label));
   if(id==='23347')assert.equal(await page.locator('#detailPreview [data-status-description="80"]').innerText(),'物理傷害輸出 +50%');
   await page.keyboard.press('Escape');
  }
  await page.evaluate(()=>showItem('28949'));
  const lines=page.locator('#reader [data-status-description="146"]');
  assert((await lines.innerText()).includes('物理傷害輸出 +75%'));
  assert((await lines.innerText()).includes('承受物理傷害 +60%'));
  const original=await lines.innerText();
  await page.screenshot({path:path.join(root,`outputs/approved-status-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  await page.evaluate(async()=>{await ensureShopPageLoaded();await showShopItem('28949');});
  assert.equal(await page.locator('#reader [data-status-description="146"]').innerText(),original);
  await page.evaluate(()=>SZO_PREVIEW.open('item','28949'));
  await page.locator('dialog [data-status-description="146"]').waitFor();
  assert.equal(await page.locator('dialog [data-status-description="146"]').innerText(),original);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log(`${mobile?'WebKit mobile':'Chromium desktop'}: approved-only descriptions, variant IDs, removal exclusions, item/shop/preview parity passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

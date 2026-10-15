const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.UPDATE_BASE||'https://preview.test';
  if(!process.env.UPDATE_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await renderItemPage('item');closeDrawer();});
  await page.locator('#itemCategory').selectOption('寶石');
  assert(await page.evaluate(()=>itemResultRows.length===600&&itemResultRows.every(x=>x.Type==='GEM')));
  assert(await page.locator('#itemMode').evaluate(el=>el.closest('.kv').hidden));
  await page.screenshot({path:path.join(root,`outputs/gems-1015-${mobile?'mobile':'desktop'}.png`)});
  await page.locator('#itemCategory').selectOption('道具');
  assert(await page.evaluate(()=>itemResultRows.every(x=>x.Type!=='GEM')));
  await page.evaluate(()=>showItem('32201'));
  assert((await page.locator('#reader').innerText()).includes('寶石'));
  assert((await page.locator('#reader').innerText()).includes('體魄'));
  await page.evaluate(async()=>{await ensureItemOptionalData('');showItem('32843');});
  assert((await page.locator('#reader').innerText()).includes('絕代移花宮主錦囊'));
  assert(await page.locator('#reader .itemContentsUnavailable').count());
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();});
  await page.locator('#mapStageSearch').fill('186');
  await page.locator('#mapStageChoices button').filter({hasText:'七寶仙境'}).click();
  await page.waitForFunction(()=>document.querySelector('#reader').textContent.includes('此地圖禁止交易'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'}: 600 GEM category, item details, crossover container and map restriction passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

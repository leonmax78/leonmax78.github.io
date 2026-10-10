const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.CONTENTS_BASE||'https://preview.test';
  if(!process.env.CONTENTS_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await ensureItemOptionalData('');showItem('30943');});
  const expected=['26416','26417','26092','26638','23993','23994','21233','21237','20705','20758','20798','21114','23578','23579','23581','23585'];
  assert.equal(await page.locator('#reader .itemContents summary').innerText(),'查看內容物（16 項）');
  await page.locator('#reader .itemContents summary').click();
  assert.deepEqual(await page.locator('#reader .itemContents [data-item]').evaluateAll(nodes=>nodes.map(n=>n.dataset.item)),expected);
  await page.screenshot({path:path.join(root,`outputs/item-contents-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  await page.locator('#reader .itemContents [data-item]').first().click();
  await page.waitForFunction(()=>document.querySelector('#detailPreview[open]')?.textContent.includes('26416')||location.hash==='#item-26416');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>SZO_PREVIEW.open('item','30943'));
  await page.locator('#detailPreview .itemContents summary').click();
  assert.equal(await page.locator('#detailPreview .itemContents [data-item]').count(),16);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>showItem('22339'));assert.equal(await page.locator('#reader .itemContentsUnavailable').count(),1);
  await page.evaluate(()=>showItem('31835'));assert.equal(await page.locator('#reader .itemContents').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'}: container contents, linked item, preview and unavailable data passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

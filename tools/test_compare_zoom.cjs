const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,width){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.MAP_BASE||'https://preview.test';
  if(!process.env.MAP_BASE)await page.route(base+'/**',route=>{
   const file=path.join(root,decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//,'')||'index.html');
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureItemPageLoaded();localStorage.setItem('sihai-equipment-compare-v1',JSON.stringify({A:'20766',B:'30160',C:'31523'}));await SZO_EQUIPMENT_COMPARE.open();});
  await page.locator('[data-equipment-zoom-fit]').click();
  assert(await page.locator('.equipmentCompareScroll').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
  const fit=await page.locator('[data-equipment-zoom]').inputValue();
  assert(Number(fit)<=100);
  await page.locator('[data-equipment-differences]').check();
  assert.equal(await page.locator('[data-equipment-zoom]').inputValue(),fit);
  await page.locator('[data-equipment-differences]').uncheck();
  await page.screenshot({path:path.join(root,`outputs/compare-zoom-${engine===webkit?'webkit':'edge'}-${width}.png`)});
  await page.locator('[data-equipment-zoom-reset]').click();
  assert.equal(await page.locator('[data-equipment-zoom]').inputValue(),'100');
  await page.locator('[data-equipment-zoom-in]').click();
  assert.equal(await page.locator('[data-equipment-zoom]').inputValue(),'110');
  await page.locator('[data-equipment-zoom-out]').click();
  await page.locator('[data-equipment-zoom]').fill('35');
  assert(await page.locator('[data-equipment-zoom-out]').isDisabled());
  await page.locator('[data-equipment-zoom]').fill('150');
  assert(await page.locator('[data-equipment-zoom-in]').isDisabled());
  await page.locator('[data-equipment-close]').click();
  assert.deepEqual(errors,[]);
  console.log(`${engine===webkit?'WebKit':'Edge'} ${width}: zoom, fit, reset, difference toggle and limits passed`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,390);await run(webkit,360);await run(chromium,1440);})().catch(e=>{console.error(e);process.exit(1);});

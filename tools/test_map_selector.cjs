const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const base=process.env.MAP_BASE||'https://preview.test';
  if(!process.env.MAP_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();closeDrawer();});
  const input=page.locator('#mapStageSearch');await input.fill('086');
  await page.locator('#mapStageChoices button').filter({hasText:'鳳凰台'}).click();
  await input.click();
  assert(await page.locator('#mapStageChoices').evaluate(list=>{const selected=list.querySelector('[aria-selected="true"]'),s=selected.getBoundingClientRect(),r=list.getBoundingClientRect();return selected.textContent.includes('086')&&list.scrollTop>0&&s.top>=r.top&&s.bottom<=r.bottom;}));
  await input.press('Escape');await input.press('ArrowDown');
  assert((await page.evaluate(()=>document.activeElement.textContent)).includes('086'));
  await input.fill('001');assert((await page.locator('#mapStageChoices button').first().innerText()).includes('001'));
  await input.press('Escape');assert((await input.inputValue()).includes('086'));
  console.log(`${mobile?'Mobile':'Desktop'}: map selector selected position and search passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

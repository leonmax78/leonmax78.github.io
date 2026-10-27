const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://preview.test/**',r=>{
   const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).slice(1)||'index.html');
   return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
  });
  await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
  await page.evaluate(async()=>{await ensureMonsterPageLoaded();await ensureMonsterDataLoaded();setMonsterQueryMode('beast');closeDrawer();});
  await page.locator('#monsterResultsMain .resultItem').first().waitFor();
  const name=await page.locator('#monsterResultsMain .rName').first().innerText();
  await page.locator('#monsterQMain').fill(name);
  const reader=await page.locator('#reader').innerText(),url=page.url();
  await page.evaluate(()=>window.testReaderNode=document.querySelector('#reader').firstElementChild);
  await page.locator('#monsterResultsMain .resultItem').first().click();
  await page.locator('#detailPreview h1').waitFor();
  assert.equal(await page.locator('#reader').innerText(),reader);assert.equal(page.url(),url);
  assert(await page.evaluate(()=>document.querySelector('#reader').firstElementChild===testReaderNode));
  for(const [value,label] of [[1,'最慢'],[2,'慢'],[3,'普通'],[4,'快'],[5,'最快']]){
   const labels=await page.evaluate(({value})=>{
    const index=beastRows().findIndex(row=>monsters.some(m=>String(m.ID)===String(row.monsterId)));
    const m=monsters.find(m=>String(m.ID)===String(beastRows()[index].monsterId));
    const old={Move:m.Move,Attack:m.Attack};
    try{m.Move=value;m.Attack=value;const el=document.createElement('div');el.innerHTML=beastDetailHTML(index);return [...el.querySelectorAll('.kv')].filter(e=>['移動速度','攻擊速度'].includes(e.querySelector('.k').textContent)).map(e=>e.querySelector('.v').textContent);}finally{Object.assign(m,old);}
   },{value});assert.deepEqual(labels,[label,label]);
  }
  await page.screenshot({path:path.join(root,`outputs/beast-floating-${width}.png`)});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#detailPreview').open);
  assert.equal(await page.locator('#monsterQMain').inputValue(),name);
  await page.goForward();await page.locator('#detailPreview h1').waitFor();
  await page.goBack();await page.waitForFunction(()=>!document.querySelector('#detailPreview').open);
  await page.evaluate(()=>showBeastDetail(beastRows().findIndex(row=>row.captureLocations?.length)));
  await page.locator('#detailPreview .beastCaptureLinks button').first().click();
  await page.locator('#floatingMap .mapPage').waitFor();
  await page.locator('[data-map-window-close]').click();
  assert(await page.locator('#detailPreview').evaluate(el=>el.open));
  await page.locator('[data-preview-close]').click();await page.waitForFunction(()=>!document.querySelector('#detailPreview').open);
  assert.equal(await page.locator('#monsterQMain').inputValue(),name);
  await page.evaluate(async()=>{await ensureItemDataLoaded();window.testDropMonster=monsters.find(m=>monsterDropRows(m).length);showMonsterDropPage(testDropMonster.ID);});
  await page.locator('#detailPreview [data-item]').first().waitFor();
  assert.equal(await page.locator('#reader').innerText(),reader);
  await page.locator('#detailPreview [data-item]').first().click();await page.locator('[data-preview-full="item"]').waitFor();
  await page.locator('[data-preview-back]').click();await page.locator('#detailPreview [data-item]').first().waitFor();
  await page.locator('[data-preview-close]').click();await page.waitForFunction(()=>!document.querySelector('#detailPreview').open);
  await page.evaluate(async()=>{
   await ensureMapPageLoaded();window.__szoMapMonsterMarker={id:testDropMonster.ID};
   const button=document.createElement('button');button.setAttribute('data-map-monster-open-detail','');document.body.append(button);button.click();button.remove();
  });
  await page.locator('[data-preview-full="monster"]').waitFor();assert.equal(await page.locator('#reader').innerText(),reader);
  assert(await page.locator('#detailPreview').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('[data-preview-close]').click();await page.waitForFunction(()=>!document.querySelector('#detailPreview').open);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+': beast modal, speed labels, preserved filters, history, nested drops and map details');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

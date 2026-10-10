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
  assert.equal(await page.locator('#reader .itemContents [data-item="26416"] .itemContentRate').innerText(),'機率 3.75%');
  assert(await page.evaluate(()=>Object.values(SZO_ITEM_CONTENTS).every(c=>Object.values(c.rates).every(n=>n>0&&n<=100)&&Math.abs(Object.values(c.rates).reduce((a,b)=>a+b,0)-100)<1e-6)));
  await page.screenshot({path:path.join(root,`outputs/item-contents-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  await page.locator('#reader .itemContents [data-item]').first().click();
  await page.waitForFunction(()=>document.querySelector('#detailPreview[open]')?.textContent.includes('26416')||location.hash==='#item-26416');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!history.state?.szoPreview&&!document.querySelector('#detailPreview[open]'));
  await page.evaluate(()=>SZO_PREVIEW.open('item','30943'));
  await page.locator('#detailPreview .itemContents summary').click();
  assert.equal(await page.locator('#detailPreview .itemContents [data-item]').count(),16);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!history.state?.szoPreview&&!document.querySelector('#detailPreview[open]'));
  await page.evaluate(()=>showItem('22339'));assert.equal(await page.locator('#reader .itemContentsUnavailable').count(),1);
  await page.evaluate(()=>showItem('31835'));assert.equal(await page.locator('#reader .itemContents').count(),0);
  await page.evaluate(()=>renderItemPage('item'));
  await page.locator('#itemCategory').selectOption('錦囊');
  assert(await page.evaluate(()=>itemResultRows.length===items.filter(i=>i.Type==='BONUS').length&&itemResultRows.every(i=>i.Type==='BONUS')));
  await page.locator('#itemCategory').selectOption('道具');assert(await page.evaluate(()=>itemResultRows.every(i=>i.Type!=='BONUS')));
  await page.evaluate(()=>showItem('25137'));
  assert.equal(await page.locator('#reader .itemRecipeFlow li').count(),3);
  assert.equal(await page.locator('#reader .itemRecipeFailure').innerText(),'失敗率：80%');
  const stepBoxes=await page.locator('#reader .itemRecipeFlow li').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
  assert(mobile?stepBoxes[1].y>stepBoxes[0].y:stepBoxes.every(b=>Math.abs(b.y-stepBoxes[0].y)<1));
  assert.equal(await page.locator('#reader .itemRecipeOutput [data-item]').getAttribute('data-item'),'20511');
  const raw=require('../data/compound.json'),recipe=raw.find(r=>r.Item==='25137');
  for(let n=1;n<=3;n++){
   const step=raw.find(r=>!r.Item&&r.ID===recipe['Step'+n]);
   const expected=Object.keys(step).filter(k=>/^InputItem\d+$/.test(k)).map(k=>({id:step[k],qty:step['InputNum'+k.slice(9)]}));
   assert.deepEqual(await page.locator('#reader .itemRecipeFlow li').nth(n-1).locator('tbody tr').evaluateAll(rows=>rows.map(r=>({id:r.querySelector('[data-item]').dataset.item,qty:r.lastElementChild.textContent}))),expected);
  }
  await page.screenshot({path:path.join(root,`outputs/recipe-flow-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  assert(await page.locator('#reader .itemRecipeFlow .tableWrap').evaluateAll(tables=>tables.every(t=>t.scrollWidth<=t.clientWidth+1)));
  await page.evaluate(()=>SZO_PREVIEW.open('item','25137'));
  const previewSteps=await page.locator('#detailPreview .itemRecipeFlow li').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));
  assert(mobile?previewSteps[1]>previewSteps[0]:previewSteps.every(y=>Math.abs(y-previewSteps[0])<1));
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!history.state?.szoPreview&&!document.querySelector('#detailPreview[open]'));
  await page.evaluate(()=>showItem('25221'));assert.equal(await page.locator('#reader .itemRecipeFlow').count(),1);
  await page.evaluate(()=>showItem('25000'));assert.equal(await page.locator('#reader .itemRecipeOutput').count(),0);assert.equal(await page.locator('#reader .itemRecipeFlow [data-item="32000"]').count(),0);
  assert.equal(await page.locator('#reader .itemRecipeConditions').count(),0);
  await page.evaluate(()=>showItem('25203'));
  assert.equal(await page.locator('#reader .itemRecipeStable').innerText(),'安定值：4');
  assert.equal(await page.locator('#reader .itemRecipeFailure').innerText(),'失敗率：30%');
  await page.evaluate(()=>showItem('25265'));assert.equal(await page.locator('#reader .itemRecipeConditions').count(),0);
  await page.evaluate(()=>SZO_PREVIEW.open('item','25031'));
  assert((await page.locator('#detailPreview .itemRecipeOutput').innerText()).includes('99'));
  await page.locator('#detailPreview .itemRecipeOutput [data-item]').click();
  await page.waitForFunction(()=>document.querySelector('#detailPreview[open]')?.textContent.includes('20397')||location.hash==='#item-20397');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'}: container contents, linked item, preview and unavailable data passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

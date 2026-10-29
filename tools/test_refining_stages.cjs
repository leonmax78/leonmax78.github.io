const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://preview.test/**',r=>{const file=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
  await page.evaluate(async()=>{await ensureCompoundDataLoaded();await loadScriptGroupOnce('features_equipment');eqState.uid=eqEquipList().find(e=>e.display_type==='劍').uid;eqRenderPreview();closeDrawer();});
  const low=page.locator('[data-eq-recipe-select="stable_50"]'),high=page.locator('[data-eq-recipe-select="stable_99"]');
  assert(await low.locator('option[value="580:stable_50"]').count());
  assert(await low.locator('option[value="548:stable_50"]').count());
  assert.equal(await high.locator('option[value^="548:"]').count(),0);
  await low.selectOption('580:stable_50');await high.selectOption('580:stable_99');
  const lowCount=page.locator('[data-eq-recipe-count="580:stable_50"]'),highCount=page.locator('[data-eq-recipe-count="580:stable_99"]');
  assert.equal(await highCount.inputValue(),'49');
  const originalLow=await lowCount.inputValue();
  await page.evaluate(()=>eqSetRecipeCount('580:stable_99',7));
  assert.equal(await lowCount.inputValue(),originalLow);
  await page.evaluate(()=>eqSetRecipeCount('580:stable_99',49));
  const calculation=await page.evaluate(()=>{
   const picks=eqSelectedRecipes(),r=eqRecipeById(580),count=picks.reduce((n,p)=>n+p.count,0),acc=eqEffectAccumulator();
   const expected=r.effects.filter(e=>e.stackable!==false).map(e=>({stat:e.stat,min:e.min!==undefined?e.min*count:null,value:e.value!==undefined?e.value*count:null}));
   return {picks:picks.map(p=>({group:p.selectionGroup,count:p.count})),expected,acc,materials:eqMaterials(r,49).map(m=>`${m.name} × ${fmt(m.qty)}`)};
  });
  assert.deepEqual(calculation.picks.map(p=>p.group),['stable_50','stable_99']);
  for(const e of calculation.expected){if(e.min!==null)assert.equal(calculation.acc[e.stat].min,e.min);if(e.value!==null)assert.equal(calculation.acc[e.stat].value,e.value);}
  const rowText=await highCount.locator('xpath=ancestor::tr').innerText();
  for(const text of calculation.materials)assert(rowText.includes(text));
  await highCount.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,`outputs/refining-stages-${width}.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#eqShowMaterials').click();
  const totals=await page.evaluate(()=>eqMaterials(eqRecipeById(580),eqSelectedRecipes().reduce((n,p)=>n+p.count,0)).map(m=>[m.name,fmt(m.qty)]));
  assert.deepEqual(await page.locator('.eqMatTotals tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent))),totals);
  assert((await page.locator('#reader').innerText()).includes('× 49'));
  await page.locator('#eqBackToSim').click();
  await page.locator('[data-eq-recipe="580:stable_99"]').click();
  assert.equal(await lowCount.inputValue(),originalLow);assert.equal(await highCount.count(),0);
  await page.evaluate(()=>{eqState.uid=eqEquipList().find(e=>e.display_type==='仙器'||e.item_type_raw==='UNDER_BOOT').uid;eqState.recipeCounts={};eqRenderPreview();});
  await page.locator('[data-eq-recipe-select="stable_70"]').selectOption('573:stable_70');
  await page.locator('[data-eq-recipe-select="stable_99"]').selectOption('573:stable_99');
  assert.equal(await page.locator('[data-eq-recipe-count="573:stable_70"]').inputValue(),'70');
  assert.equal(await page.locator('[data-eq-recipe-count="573:stable_99"]').inputValue(),'29');
  const artifact=await page.evaluate(()=>({picks:eqSelectedRecipes().map(p=>p.count),acc:eqEffectAccumulator(),effects:eqRecipeById(573).effects,mats:eqMaterials(eqRecipeById(573),29).map(m=>`${m.name} × ${fmt(m.qty)}`)}));
  assert.deepEqual(artifact.picks,[70,29]);
  for(const e of artifact.effects.filter(e=>e.stackable!==false)){if(e.min!==undefined)assert.equal(artifact.acc[e.stat].min,e.min*99);if(e.value!==undefined)assert.equal(artifact.acc[e.stat].value,e.value*99);}
  const artifactRow=await page.locator('[data-eq-recipe-count="573:stable_99"]').locator('xpath=ancestor::tr').innerText();
  for(const text of artifact.mats)assert(artifactRow.includes(text));
  await page.locator('[data-eq-recipe-count="573:stable_70"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,`outputs/artifact-stages-${width}.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS '+width+': equipment 50+49 and artifact 70+29, materials and effects');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

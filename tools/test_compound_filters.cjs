const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.COMPOUND_BASE||'https://preview.test';
  if(!process.env.COMPOUND_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  assert(await page.evaluate(()=>ensureCompoundDataLoaded()));
  await page.evaluate(()=>renderEquipmentCompoundPage());
  assert.equal(await page.locator('#reader h1').innerText(),'常用配方合成模擬');
  assert.deepEqual(await page.locator('#eqMain option').allTextContents(),['全部大類','武器','防具','仙器','飾品']);
  const check=await page.evaluate(()=>{
   const list=eqEquipList(),expected=items.filter(i=>['武器','防具','仙器','特殊飾品'].includes(SZO_EQUIPMENT_TAXONOMY.byId[i.ID]?.category)&&!String(i.Flag||'').split(',').includes('ITEM_NO_REFINE')&&!String(i.Class||'').split(',').includes('CLASS_PET'));
   return {actual:list.length,expected:expected.length,unique:new Set(list.map(e=>e.item_id)).size,noRefine:list.every(e=>!String(e.raw_item.Flag).includes('ITEM_NO_REFINE')),newSword:list.some(e=>e.item_id==='31835'),blocked:list.some(e=>['31607','31523'].includes(e.item_id)),recipes:eqData().recipes.every(r=>(compoundConfigData.recipes||[]).some(c=>c.name===r.name||c.item_id===r.item_id))};
  });
  assert.equal(check.actual,check.expected);assert.equal(check.unique,check.actual);assert(check.noRefine&&check.newSword&&!check.blocked&&check.recipes);
  await page.locator('#eqMore').click();assert.equal(await page.locator('#eqList [data-eq-uid]').count(),360);
  await page.evaluate(()=>{openEquipmentSim('item_31607');});assert.equal(await page.locator('#eqList').count(),1);
  await page.locator('#eqMain').selectOption('防具');await page.locator('#eqSeries').selectOption('聖甲');await page.locator('#eqTier').selectOption('初代系列');
  assert(await page.evaluate(()=>eqFilteredEquipment().length>0));
  await page.locator('#eqSeries').selectOption('');assert.equal(await page.locator('#eqTier').inputValue(),'');
  await page.locator('#eqMain').selectOption('武器');await page.locator('#eqQ').fill('31835');
  assert.equal(await page.locator('#eqList [data-eq-uid]').count(),1);
  await page.locator('#eqList [data-eq-uid]').click();
  assert((await page.locator('#reader').innerText()).includes('睚眥龍吞劍'));
  assert.equal(await page.evaluate(()=>eqBaseStatsWithRaw(eqSelected()).attack.value),5);
  const recipe=await page.evaluate(()=>eqAllowedRecipes().find(r=>r.effects?.length)?.id);assert(recipe);
  await page.evaluate(id=>eqAddRecipe(id),recipe);
  assert(await page.evaluate(()=>eqSelectedRecipes().length===1&&Object.keys(eqEffectAccumulator()).length>0));
  await page.evaluate(()=>renderEquipmentCompoundPage());await page.locator('#eqClearFilters').click();
  await page.locator('#eqMainSearch').fill('仙器');await page.getByRole('option',{name:'仙器',exact:true}).click();
  assert(await page.evaluate(()=>eqFilteredEquipment().length>0&&eqFilteredEquipment().every(e=>e.main_category==='仙器')));
  await page.locator('#eqList [data-eq-uid]').first().click();
  assert(await page.evaluate(()=>eqAllowedRecipes().every(r=>r.group==='stable_70')));
  await page.evaluate(()=>renderEquipmentCompoundPage());await page.locator('#eqClearFilters').click();
  await page.screenshot({path:path.join(root,`outputs/compound-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'}: ${check.actual} refinable items, taxonomy, no-refine exclusions and recipe restrictions passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

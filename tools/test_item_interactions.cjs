const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.INTERACTION_BASE||'https://preview.test';
  if(!process.env.INTERACTION_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  const ready=async()=>{await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await renderItemPage('item');closeDrawer();});};
  const click=async locator=>mobile?locator.tap():locator.click();
  await ready();
  await click(page.locator('#itemSpecialSearch'));await page.locator('#itemSpecialSearch').fill('勇猛');
  assert.equal(await page.locator('.itemFilterChoices').count(),1);
  assert(await page.locator('.itemFilterChoices [role="option"]').count()>0);
  assert((await page.locator('.itemFilterChoices').innerText()).includes('小勇猛'));
  await click(page.locator('.itemFilterChoices').getByRole('option',{name:'小勇猛',exact:true}));
  assert.equal(await page.locator('#itemSpecial').inputValue(),'小勇猛');assert.equal(await page.locator('.itemFilterChoices').count(),0);
  assert(await page.locator('#itemResults [data-item]').count()>0);
  await click(page.locator('#itemCategorySearch'));await page.locator('#itemCategorySearch').fill('防具');
  await page.locator('#itemCategorySearch').press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#itemCategory').inputValue(),'防具');
  await click(page.locator('#itemFamilySearch'));await page.locator('#itemFamilySearch').fill('聖');
  await page.screenshot({path:path.join(root,`outputs/item-searchable-${mobile?'mobile':'desktop'}.png`)});
  await click(page.locator('.itemFilterChoices').getByRole('option',{name:'聖甲',exact:true}));
  await click(page.locator('#itemCollectionSearch'));await page.locator('#itemCollectionSearch').fill('初代');
  await click(page.locator('.itemFilterChoices').getByRole('option',{name:'初代系列',exact:true}));
  await click(page.locator('#itemFamilySearch'));await page.locator('#itemFamilySearch').fill('全部');
  await click(page.locator('.itemFilterChoices').getByRole('option',{name:'全部系列',exact:true}));
  assert.equal(await page.locator('#itemCollection').inputValue(),'');
  await click(page.locator('#itemSpecialSearch'));await page.locator('#itemSpecialSearch').fill('完全不存在');
  assert((await page.locator('.itemFilterChoices').innerText()).includes('沒有符合'));
  await page.locator('#itemSpecialSearch').press('Escape');assert.equal(await page.locator('#itemSpecialSearch').inputValue(),'全部特殊效果');
  for(const [slot,id] of [['A','28949'],['B','29681'],['C','29940']]){
   await page.evaluate(id=>showItem(id),id);
   await click(page.locator(`[data-equipment-save="${slot}"]`));
   assert((await page.locator('.equipmentSaveFeedback').innerText()).includes('已存入 '+slot));
  }
  for(const name of ['昊．勇者聖甲','皇．勇者聖甲','終極勇者聖甲'])assert((await page.locator('.equipmentSavedSlots').innerText()).includes(name));
  await page.screenshot({path:path.join(root,`outputs/equipment-saved-slots-${mobile?'mobile':'desktop'}.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await click(page.locator('[data-equipment-compare]'));
  const dialog=page.locator('.equipmentCompareDialog');await dialog.waitFor();
  for(const name of ['昊．勇者聖甲','皇．勇者聖甲','終極勇者聖甲'])assert((await dialog.innerText()).includes(name));
  assert((await dialog.innerText()).includes('物理傷害輸出 +75%'));
  await page.screenshot({path:path.join(root,`outputs/equipment-compare-${mobile?'mobile':'desktop'}.png`)});
  const before=await dialog.locator('tbody tr').count();await dialog.locator('[data-equipment-differences]').check();assert(await dialog.locator('tbody tr').count()<before);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.keyboard.press('Escape');assert(!await dialog.isVisible());
  await ready();await click(page.locator('[data-equipment-compare]'));assert((await dialog.innerText()).includes('終極勇者聖甲'));
  await click(dialog.locator('[data-equipment-clear="B"]'));assert(!(await dialog.innerText()).includes('皇．勇者聖甲'));
  await click(dialog.locator('[data-equipment-close]'));
  await page.evaluate(()=>showItem('29681'));
  assert((await page.locator('.equipmentSavedSlots').innerText()).includes('尚未存檔'));
  assert(!(await page.locator('.equipmentSavedSlots').innerText()).includes('皇．勇者聖甲'));
  await page.evaluate(()=>SZO_PREVIEW.open('item','29681'));await page.locator('dialog [data-equipment-save="A"]').waitFor();
  await click(page.locator('#detailPreview [data-equipment-save="A"]'));await click(page.locator('#detailPreview [data-equipment-compare]'));
  assert((await dialog.innerText()).includes('皇．勇者聖甲'));
  await click(dialog.locator('[data-equipment-close]'));
  await page.keyboard.press('Escape');
  for(const [slot,id] of [['A','31835'],['B','31552'],['C','31607']]){
   await page.evaluate(id=>showItem(id),id);
   await click(page.locator(`#reader [data-equipment-save="${slot}"]`));
  }
  await click(page.locator('#reader [data-equipment-compare]'));
  for(const differences of [false,true]){
   await dialog.locator('[data-equipment-differences]').setChecked(differences);
   const labels=await dialog.locator('tbody th').allTextContents();
   for(const label of ['火傷','火傷機率','冥傷','冥傷機率'])assert(labels.indexOf(label)>=0&&labels.indexOf(label)<labels.indexOf('說明'));
   for(const label of ['火傷','雷傷','冥傷'])assert.equal(labels.indexOf(label+'機率'),labels.indexOf(label)+1);
  }
  assert.deepEqual(errors,[]);console.log(`${mobile?'WebKit mobile':'Chromium desktop'}: searchable choices, keyboard/touch, cascade reset and persistent A/B/C comparisons passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

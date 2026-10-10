const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),context={window:{}};
for(const name of ['equipment-taxonomy','item-buffs'])vm.runInNewContext(fs.readFileSync(path.join(root,'data',name+'.js'),'utf8'),context);
const taxonomy=context.window.SZO_EQUIPMENT_TAXONOMY,buffs=context.window.SZO_ITEM_BUFFS;
assert.equal(buffs.fields.Dex,'靈敏');
assert.equal(taxonomy.byId['21182'].category,'防具');
assert.equal(taxonomy.byId['21183'].category,'特殊飾品');
assert.equal(Object.keys(taxonomy.byId).length,require('../data/items.json').length);
assert.equal(new Set(taxonomy.sources.filter(x=>x.family==='世貿系列').map(x=>x.collection)).size,18);
assert(taxonomy.sources.every(s=>!s.error&&s.matchedIds.length));
assert(buffs.byId['30652'].some(e=>e.key==='All'&&e.value===365&&e.source==='MAGIC:894'));
assert(!buffs.byId['20069'].some(e=>e.key==='HP'));
assert(buffs.byId['20069'].some(e=>e.key==='RestoreHP'&&e.value===30));
assert(!buffs.byId['20075']);
assert(buffs.specialById['20075'].some(e=>e.label==='解除萬蠱毒'));
async function run(engine,mobile){
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.FILTER_BASE||'https://preview.test';
  if(!process.env.FILTER_BASE)await page.route(base+'/**',r=>{const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
  await page.evaluate(async()=>{await ensureItemPageLoaded();await ensureItemDataLoaded();await renderItemPage('item');closeDrawer();});
  const select=(id,value)=>page.selectOption('#'+id,value);
  assert(!await page.locator('#itemFamily').isVisible());assert(!await page.locator('#itemMode').isVisible());
  assert(!await page.locator('#itemKind').isVisible());
  assert(await page.locator('#itemSpecial').isVisible());
  await page.screenshot({path:path.join(root,`outputs/filter-initial-${mobile?'mobile':'desktop'}.png`),fullPage:true});
  await select('itemCategory','武器');assert(await page.locator('#itemFamily').isVisible());
  assert(await page.locator('#itemKind').isVisible());
  await page.locator('#itemKind').selectOption({index:1});
  await select('itemCategory','道具');assert(!await page.locator('#itemKind').isVisible());assert.equal(await page.locator('#itemKind').inputValue(),'');
  const categories=await page.locator('#itemCategory option').allTextContents();
  assert(categories.includes('藥品／道具／符咒'));assert(!categories.includes('藥品')&&!categories.includes('符咒')&&!categories.includes('道具'));
  await select('itemCategory','武器');
  for(const category of ['武器','防具','仙器','特殊飾品']){
   await select('itemCategory',category);
   assert.equal(await page.locator('#itemProfession option[value="CLASS_PET"]').count(),0);
  }
  await select('itemCategory','武器');
  await select('itemProfession','');
  await page.locator('#itemMin').fill('999');await select('itemProfession','CLASS_SWORDMAN');
  await select('itemCategory','寵物裝備');
  assert.equal(await page.locator('#itemCategory option:checked').innerText(),'封獸裝備');
  for(const field of ['itemFamily','itemProfession','itemType','itemMin','itemMax','itemKind','itemSpecial']){
   assert(!await page.locator('#'+field).isVisible());assert.equal(await page.locator('#'+field).inputValue(),'');
  }
  const petOrder=await page.evaluate(()=>itemResultRows.map(i=>SZO_EQUIPMENT_TAXONOMY.byId[i.ID].order));
  assert(petOrder.length>0&&petOrder.every((v,i)=>i===0||v<=petOrder[i-1]));
  assert.deepEqual(await page.locator('#itemCollection option').allTextContents(),['全部部位','武器','防具','飾品']);
  for(const [part,example] of [['武器','21181'],['防具','21182'],['特殊飾品','21183']]){
   await select('itemCollection',part);
   const results=await page.evaluate(()=>itemResultRows.map(i=>({id:i.ID,...SZO_EQUIPMENT_TAXONOMY.byId[i.ID]})));
   assert(results.some(i=>i.id===example));
   assert(results.every(i=>i.category===part&&i.class.includes('CLASS_PET')));
  }
  await select('itemCollection','');
  await page.screenshot({path:path.join(root,`outputs/filter-pet-${mobile?'mobile':'desktop'}.png`)});
  await select('itemCategory','武器');
  assert(!(await page.locator('#itemFamily option').allTextContents()).includes('寵物裝備'));
  await select('itemFamily','世貿系列');
  assert(await page.locator('#itemMin').isVisible());assert(await page.locator('#itemProfession').isVisible());
  await select('itemCollection','300級龍涉大川繼鱗武匣');
  assert.equal(await page.locator('#itemResults [data-item]').count(),20);
  assert(await page.evaluate(()=>itemResultRows.every((it,i)=>i===0||SZO_EQUIPMENT_TAXONOMY.byId[it.ID].order<=SZO_EQUIPMENT_TAXONOMY.byId[itemResultRows[i-1].ID].order)));
  await select('itemFamily','玄宙');
  const allTypes=await page.locator('#itemType option').count();
  await select('itemProfession','CLASS_SWORDMAN');
  assert(await page.locator('#itemType option').count()<allTypes);
  assert(await page.evaluate(()=>Array.from(document.querySelector('#itemType').options).every(o=>!o.value||itemResultRows.some(i=>i.Type===o.value))));
  assert(await page.evaluate(()=>Array.from(document.querySelector('#itemKind').options).every(o=>!o.value||itemResultRows.some(i=>itemMatchesKind(i,o.value)))));
  const incompatible=await page.evaluate(()=>{const current=new Set(Array.from(document.querySelector('#itemType').options,o=>o.value));SZO_ITEM_FILTERS.profession='';SZO_ITEM_TAXONOMY.refresh();return Array.from(document.querySelector('#itemType').options,o=>o.value).find(v=>v&&!current.has(v));});
  assert(incompatible);await select('itemType',incompatible);
  await select('itemProfession','CLASS_SWORDMAN');assert.equal(await page.locator('#itemType').inputValue(),'');
  await page.locator('#itemQ').fill('不存在的裝備測試');await page.evaluate(()=>searchItems());
  assert.deepEqual(await page.locator('#itemKind option').allTextContents(),['全部專剋']);
  await page.locator('#itemQ').fill('');await page.evaluate(()=>searchItems());
  await select('itemCategory','防具');await select('itemFamily','聖甲');await select('itemCollection','昊系列');
  assert((await page.locator('#itemResults').innerText()).includes('勇者聖甲'));
  await select('itemFamily','玄宙');await select('itemCollection','職業防具');
  assert(!(await page.locator('#itemCollection').innerText()).includes('職業防具 /'));
  const allArmor=await page.locator('#itemResults [data-item]').count();
  await select('itemProfession','CLASS_SWORDMAN');
  const swordArmor=await page.evaluate(()=>itemResultRows.map(i=>i.Class));
  assert(swordArmor.length>0&&swordArmor.length<allArmor&&swordArmor.every(c=>c?.includes('CLASS_SWORDMAN')));
  await select('itemProfession','CLASS_WARRIOR');assert(await page.locator('#itemResults [data-item]').count()>0);
  assert.deepEqual((await page.locator('#itemCollection option').allTextContents()).sort(),['全部細分類','特仕','職業防具'].sort());
  await select('itemCollection','特仕');
  assert.deepEqual((await page.locator('#itemProfession option').allTextContents()).sort(),['全部特仕系列','靜月','宿星','狂陽'].sort());
  await select('itemProfession','series:靜月');
  assert(await page.locator('#itemResults [data-item]').count()>0);
  assert(await page.evaluate(()=>itemResultRows.every(i=>SZO_EQUIPMENT_TAXONOMY.byId[i.ID].tags.some(t=>t.family==='玄宙'&&t.collection==='特仕'&&t.variant==='靜月'))));
  await page.screenshot({path:path.join(root,`outputs/filter-special-${mobile?'mobile':'desktop'}.png`)});
  await select('itemCategory','道具');assert(!await page.locator('#itemFamily').isVisible());assert(await page.locator('#itemMode').isVisible());
  await select('itemMode','hp');assert(!await page.locator('#itemBuffEffect').isVisible());
  assert.equal(await page.locator('#itemBuffUnit').inputValue(),'number');
  assert(!(await page.locator('#itemBuffUnit option').allTextContents()).some(t=>t.includes('分組')||t==='倍率'));
  assert((await page.locator('#itemResults').innerText()).includes('補血 +'));
  await select('itemMode','buff');assert(await page.locator('#itemBuffEffect').isVisible());
  assert(await page.locator('#itemBuffTarget').isVisible());
  assert.deepEqual(await page.locator('#itemBuffTarget option').allTextContents(),['全部使用對象','人物','封獸']);
  await select('itemBuffTarget','pet');
  for(const mode of ['hp','mp','remove','']){
   await select('itemMode',mode);
   assert(!await page.locator('#itemBuffTarget').isVisible());
   assert.equal(await page.evaluate(()=>SZO_ITEM_FILTERS.target),'');
  }
  await select('itemMode','buff');
  assert(await page.locator('#itemResults [data-item]').count()>0);
  await select('itemCategory','道具');await select('itemMode','buff');
  const result=await page.evaluate(()=>({names:itemResultRows.map(i=>i.Name),types:[...new Set(itemResultRows.map(i=>i.Type))]}));
  assert(result.types.includes('POTION')&&result.types.includes('MAGIC_FIGURE')&&result.types.includes('MATERIAL'));
  assert(!result.names.includes('激獸源符'));assert(result.names.includes('仙帝十倍練功符'));
  await select('itemBuffEffect','Drop');assert((await page.locator('#itemResults').innerText()).includes('30 分鐘'));assert(!(await page.locator('#itemResults').innerText()).includes('1800 秒'));
  assert.deepEqual(await page.locator('#itemBuffUnit option').allTextContents(),['倍率']);
  assert.equal(await page.locator('#itemBuffUnit').inputValue(),'multiplier');
  await select('itemBuffEffect','All');
  await select('itemBuffTarget','pet');assert((await page.locator('#itemResults [data-item]').first().innerText()).includes('激獸源符'));
  await select('itemBuffTarget','person');await select('itemBuffEffect','Str');await select('itemBuffUnit','number');
  const values=await page.evaluate(()=>itemResultRows.map(i=>Math.max(...SZO_ITEM_BUFFS.byId[i.ID].filter(e=>e.key==='Str'&&e.unit==='number').map(e=>e.value))));
  assert(values.length>10&&values.every((v,i)=>i===0||v<=values[i-1]));
  for(const attribute of ['Str','Dex','Con','Int']){
   await select('itemBuffEffect',attribute);
   assert(await page.evaluate(()=>itemResultRows.length>0&&itemResultRows.every(i=>!SZO_ITEM_BUFFS.byId[i.ID].some(e=>e.key==='All'))));
  }
  await select('itemBuffEffect','');assert.equal(await page.locator('#itemBuffEffect').inputValue(),'');
  await select('itemBuffEffect','All');
  assert(await page.evaluate(()=>itemResultRows.length>0&&itemResultRows.every(i=>SZO_ITEM_BUFFS.byId[i.ID].some(e=>e.key==='All'))));
  await page.screenshot({path:path.join(root,`outputs/filter-buffs-${mobile?'mobile':'desktop'}.png`),fullPage:false});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await select('itemMode','remove');assert((await page.locator('#itemResults').innerText()).includes('解除萬蠱毒'));
  await page.evaluate(()=>clearItemSearchFilters());await select('itemSpecial','解除定身');
  assert((await page.locator('#itemResults').innerText()).includes('通血丸'));
  await page.evaluate(()=>clearItemSearchFilters());await select('itemCategory','配方');
  assert.equal(await page.locator('#itemResults [data-item]').count(),180);
  await page.getByRole('button',{name:'顯示更多',exact:true}).click();assert(await page.locator('#itemResults [data-item]').count()>180);
  await page.evaluate(()=>clearItemSearchFilters());await select('itemCategory','武器');
  assert.equal((await page.locator('#itemType option').allTextContents()).filter(x=>x==='暗器').length,1);
  await page.evaluate(()=>clearItemSearchFilters());await select('itemCategory','道具');await select('itemMode','buff');
  await page.evaluate(()=>ensureItemSearchIndexLoaded());
  const parity=await page.evaluate(()=>{const index=filterItemIndexList('','','','','','').map(i=>i.id).sort();return {index,full:itemResultRows.map(i=>i.ID).sort()};});
  assert.deepEqual(parity.index,parity.full);assert.deepEqual(errors,[]);
  console.log(`${mobile?'WebKit mobile':'Chromium desktop'}: cascading categories, buffs, recovery, sorting, pagination and index parity passed.`);
 }finally{await browser.close();}
}
(async()=>{await run(chromium,false);await run(webkit,true);})().catch(e=>{console.error(e);process.exit(1);});

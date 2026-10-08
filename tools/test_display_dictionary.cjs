const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function route(page){await page.route('https://preview.test/**',r=>{const p=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(p)&&fs.statSync(p).isFile()?r.fulfill({path:p}):r.fulfill({status:404,body:''});});}
async function ready(page){await page.goto('https://preview.test/');await page.waitForTimeout(1500);await page.waitForFunction(()=>window.SZO_READY);}
const rows=page=>page.locator('#reader .kv').evaluateAll(nodes=>nodes.map(n=>[n.querySelector('.k')?.textContent,n.querySelector('.v')?.textContent]));
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);await ready(page);
  await page.evaluate(async()=>{await ensureShopPageLoaded();await showShopItem('20399');});
  const shop=await rows(page);assert(!shop.some(r=>['Flag','GIcon','Log','Attack'].includes(r[0])));
  await page.waitForFunction(()=>[...document.querySelectorAll('#reader img')].some(img=>img.naturalWidth>0));
  await page.screenshot({path:path.join(root,'outputs/shared-shop-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>closeDrawer());await page.waitForTimeout(500);await page.screenshot({path:path.join(root,'outputs/shared-shop-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>showItem('20399'));assert.deepEqual(await rows(page),shop);
  await page.evaluate(async()=>{await showShopItem('20469');});const status=await rows(page);
  await page.evaluate(()=>showItem('20469'));assert.deepEqual(await rows(page),status);
  const translated=await page.evaluate(()=>({labels:['m_attack','術攻','MagicAttack','m_def','術防','防禦','LightningDef','暗防'].map(k=>SZO_DISPLAY.label(k)),speed:[1,2,3,4,5].map(n=>SZO_DISPLAY.value('Attack',n))}));
  assert.deepEqual(translated.speed,['最慢','次慢','普通','次快','最快']);assert.deepEqual(translated.labels,['術法攻擊','術法攻擊','術法攻擊','術法防禦','術法防禦','物理防禦','雷防','冥防']);
  await page.evaluate(async()=>{await ensureCompoundDataLoaded();});
  const compound=await page.evaluate(()=>({labels:['m_attack','m_def','dark_def','lightning_def','hp'].map(k=>eqStatLabel(k)),speed:[1,2,3,4,5].map(n=>eqDisplayStatText('attack',{value:n})),rank:eqCLevelText(3)}));
  assert.deepEqual(compound.labels,['術法攻擊','術法防禦','冥防','雷防','血量']);assert.deepEqual(compound.speed,translated.speed);assert.equal(compound.rank,'三轉');
  await page.evaluate(async()=>{await ensureJiangshenToolLoaded();calcStars();});
  const heads=await page.locator('#reader th').allTextContents();assert(heads.includes('術法攻擊'));assert(heads.includes('物理防禦'));assert(!heads.includes('術攻'));
  assert.deepEqual(errors,[]);
  const check=await browser.newPage({viewport:{width:1366,height:900}});await route(check);await check.goto('https://preview.test/planning/item-fields.html');await check.waitForSelector('[data-visible="Attack"]');
  assert.equal(await check.locator('[data-visible]').count(),66);assert.equal(await check.locator('[data-visible]:checked').count(),29);
  await check.locator('[data-visible="Attack"]').check();await check.locator('[data-label="Attack"]').first().fill('攻擊速度');
  await check.locator('[data-values="Attack"]').click();await check.waitForSelector('[data-value-index]');
  assert.equal(await check.locator('#valueRows tr').count(),5);assert((await check.locator('#valueRows').innerText()).includes('最慢'));
  await check.locator('[data-value-index="0"]').fill('最慢（確認）');await check.locator('#closeValues').click();
  await check.reload();await check.waitForSelector('[data-visible="Attack"]');assert(await check.locator('[data-visible="Attack"]').isChecked());assert.equal(await check.locator('[data-label="Attack"]').first().inputValue(),'攻擊速度');
  await check.locator('[data-values="Flag"]').click();await check.waitForSelector('[data-value-index]');await check.locator('#valueMode').selectOption('tokens');assert((await check.locator('#valueRows').innerText()).includes('ITEM_'));await check.locator('#closeValues').click();
  const download=check.waitForEvent('download');await check.locator('#export').click();const d=await download;const json=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(json.fields.length,66);assert.equal(json.confirmedValueChanges.Attack['1'],'最慢（確認）');assert.equal(json.status,'draft-not-applied');
  await check.screenshot({path:path.join(root,'outputs/field-checklist-desktop.png'),fullPage:true});
  await check.setViewportSize({width:390,height:844});await check.screenshot({path:path.join(root,'outputs/field-checklist-mobile.png'),fullPage:true});assert(await check.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await check.locator('[data-values="Attack"]').click();await check.waitForSelector('[data-value-index]');assert(await check.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().right<=innerWidth));
  console.log('PASS item/shop entry parity, special status, shared labels, hero labels, checklist 66 fields, codes, persistence, export, mobile layout');
 }finally{await browser.close();}
 const safari=await webkit.launch();
 try{const page=await safari.newPage({...devices['iPhone 13']});await route(page);await page.goto('https://preview.test/planning/item-fields.html');await page.waitForSelector('[data-visible="Attack"]');await page.locator('[data-visible="Attack"]').check();await page.locator('[data-values="Attack"]').tap();await page.waitForSelector('[data-value-index]');assert.equal(await page.locator('#valueRows tr').count(),5);await page.locator('#closeValues').tap();console.log('PASS WebKit mobile checkbox and values dialog');}finally{await safari.close();}
})().catch(e=>{console.error(e);process.exit(1)});

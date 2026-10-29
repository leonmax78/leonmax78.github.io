const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://preview.test/**',r=>{const p=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');return fs.existsSync(p)&&fs.statSync(p).isFile()?r.fulfill({path:p}):r.fulfill({status:404,body:''});});
 await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(8000);await page.waitForFunction(()=>window.SZO_READY);
 assert.equal(await page.locator('[data-view=abyss]').count(),0);
 await page.evaluate(()=>setView('jiang'));await page.locator('#reader [data-view=gems]').click();await page.waitForSelector('#gemLevel');
 assert((await page.locator('#gemOpened').innerText()).includes('14 / 30'));
 await page.locator('#gemLevel').fill('20000');
 for(let i=1;i<=5;i++){await page.locator('#gemBatch'+i).selectOption(String(32306+(i-1)*10));await page.locator(`[data-fill-shape="${i}"]`).click();}
 assert((await page.locator('#gemTotal').innerText()).includes('智慧 +6,300'));
 await page.locator('#gemLevel').fill('5000');assert((await page.locator('#gemTotal').innerText()).includes('智慧 +2,775'));
 assert.equal(await page.locator('[data-gem-slot]:disabled').count(),16);
 assert.equal(await page.locator('[data-gem-slot="1"] option[value="32316"]').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(500);await page.screenshot({path:path.join(root,`outputs/gem-calc-${width}.png`)});
 await page.locator('[data-gem-tab=recipes]').click();await page.locator('[data-powder="32802"]').click();
 assert.equal(await page.locator('.gemRecipe').count(),100);
 assert((await page.locator('.gemRecipe').first().innerText()).includes('尋常寶石粉'));
 await page.locator('#gemRecipeSearch').fill('');await page.locator('#gemProcess').selectOption('recreate');assert.equal(await page.locator('.gemRecipe').count(),7);
 await page.locator('#gemRecipeCount').fill('2');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(root,`outputs/gem-recipes-${width}.png`)});
 await page.locator('.gemRecipe [data-item]').first().click();await page.waitForSelector('#detailPreview[open]');await page.keyboard.press('Escape');
 await page.locator('[data-gem-tab=calc]').click();assert((await page.locator('#gemTotal').innerText()).includes('智慧 +2,775'));
 await page.locator('#gemClear').click();assert((await page.locator('#gemTotal').innerText()).includes('智慧 +0'));
 assert.deepEqual(errors,[]);console.log('PASS '+width+': navigation, shape constraints, levels, totals, recipes, powder sources, preview');await page.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

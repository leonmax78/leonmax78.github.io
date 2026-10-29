const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),souls=JSON.parse(fs.readFileSync(path.join(root,'data/soul.json'),'utf8'));
assert.equal(souls.length,71);
for(const soul of souls)assert(fs.existsSync(path.join(root,`assets/test-media/soul-portraits/s${soul.ID}.png`)),soul.Name);
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://preview.test/**',r=>{const p=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');return fs.existsSync(p)&&fs.statSync(p).isFile()?r.fulfill({path:p}):r.fulfill({status:404,body:''});});
 await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(8000);await page.waitForFunction(()=>window.SZO_READY);
 await page.evaluate(()=>setView('soul'));await page.waitForSelector('#soulSelect');
 assert.equal(await page.locator('#soulSelect option').count(),71);
 for(const id of [67,68,70,71]){
  await page.locator('#soulSelect').selectOption(String(id));
  await page.waitForFunction(id=>{const img=document.querySelector(`[data-soul-portrait="${id}"] img`);return img?.complete&&img.naturalWidth>0;},id);
  assert((await page.locator('#soulResult').innerText()).includes(souls.find(s=>s.ID===id).Name));
 }
 await page.getByRole('button',{name:'滿收藏',exact:true}).click();assert.equal(await page.locator('#soulCount').inputValue(),'71');
 assert((await page.locator('#soulResult').innerText()).includes('175%'));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({path:path.join(root,`outputs/complete-souls-${width}.png`)});
 assert.deepEqual(errors,[]);console.log('PASS '+width+': 71 souls, new portraits, full collection bonus');await page.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

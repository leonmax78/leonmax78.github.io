const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  for(const width of [1440,980,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://preview.test/**',r=>{
    const file=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');
    return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
   });
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
   await page.locator('[data-language="cn"]').click();
   await page.waitForFunction(()=>document.documentElement.lang==='zh-Hans');
   assert.equal(await page.locator('#globalSearchInput').getAttribute('placeholder'),'全站搜寻');
   await page.evaluate(()=>{
    const el=document.createElement('div');el.id='languageFixture';
    el.innerHTML='<span>乾坤裝備與技能</span><input value="裝備" placeholder="選擇裝備"><select><option>仙器</option><option value="劍">劍</option></select><b translate="no">保留繁體</b>';
    document.body.append(el);
   });
   await page.waitForFunction(()=>document.querySelector('#languageFixture span').textContent==='乾坤装备与技能');
   assert.equal(await page.locator('#languageFixture input').inputValue(),'裝備');
   assert.equal(await page.locator('#languageFixture option').nth(1).getAttribute('value'),'劍');
   assert.equal(await page.locator('#languageFixture b').innerText(),'保留繁體');
   await page.locator('[data-language="tw"]').click();
   assert.equal(await page.locator('#languageFixture span').innerText(),'乾坤裝備與技能');
   await page.evaluate(()=>document.getElementById('languageFixture').remove());
   await page.locator('[data-language="cn"]').click();
   await page.reload();await page.waitForFunction(()=>window.SZO_READY);
   assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hans');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const boxes=await page.locator('.languageTools button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
   assert(boxes.every(b=>b.x>=0&&b.right<=width));
   const search=await page.locator('.topSearch').boundingBox();
   const toolbar=await page.locator('.languageTools').boundingBox();
   assert(search.x+search.width<=toolbar.x+1||search.y+search.height<=toolbar.y+1,'Search overlaps toolbar');
   for(let i=1;i<boxes.length;i++)assert(boxes[i].x>=boxes[i-1].right-1,JSON.stringify(boxes));
   await page.screenshot({path:path.join(root,'outputs',`language-${width}.png`)});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}: dynamic text, exact restoration, values preserved, preference remembered, header fits.`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

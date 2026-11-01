const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),sample=fs.readFileSync(process.argv[2]);
const items=require('../data/items.json');
async function test(engine,channel,width){
 const browser=await engine.launch(channel?{channel}:{});
 try{
 const page=await browser.newPage({viewport:{width,height:1000}});let alerts=0,posts=0,promptName='';const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(d.type()==='alert')alerts++;await d.accept(d.type()==='prompt'?promptName:undefined);});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(r.request().method()!=='GET')posts++;if(u.origin!=='https://preview.test')return r.abort();const file=path.join(root,decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html');return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.ae-page')?.hasAttribute('aria-busy'));
 const click=async id=>{await page.locator('#ae-'+id).click();await idle();};
 await page.goto('https://preview.test');await page.waitForTimeout(2500);await page.waitForFunction(()=>window.SZO_READY);
 assert.equal(await page.evaluate(()=>typeof AutoDataCore),'undefined');
 assert.equal(await page.locator('[data-view="autodata"]').isVisible(),width>=768);
 await page.evaluate(()=>setView('autodata'));
 if(width<768){
  await page.locator('.ae-notice').waitFor();
  assert.equal(await page.locator('.ae-notice').innerText(),'請使用電腦端操作');
  assert.equal(await page.locator('.ae-page input,.ae-page button,.ae-page a[download]').count(),0);
  assert.equal(posts,0);assert.deepEqual(errors,[]);
  console.log('PASS',channel||'webkit',width,'desktop-only notice, no file controls or offline download');return;
 }
 await page.waitForFunction(()=>document.querySelector('#ae-map option[value="12"]'));
 assert.equal(await page.locator('.ae-page a[href*="autodata-editor-v10"]').count(),0);
 assert(await page.locator('#ae-open').isDisabled());assert(await page.locator('#ae-file').isDisabled());
 assert.equal(await page.locator('#ae-open').innerText(),'上傳檔案');
 assert.equal(await page.locator('#ae-overwrite').innerText(),'儲存並覆蓋遊戲 DATA');
 assert.equal(await page.locator('.ae-search-options #ae-fuzzy,.ae-search-options #ae-warning').count(),2);
 assert.deepEqual(await page.locator('#ae-plan option').allTextContents(),[1,2,3,4,5].map(i=>`${i}. 自訂方案 (0)`));
 assert.equal(await page.locator('#ae-source,#ae-csv-target,#ae-plan-mode,#ae-discard-apply,#ae-download,#ae-settings-import,#ae-settings-file').count(),0);
 await page.locator('#ae-offline').check();
 assert(await page.locator('#ae-open').isEnabled());
 await page.locator('#ae-file').setInputFiles({name:'test_3.data',mimeType:'application/octet-stream',buffer:sample});await idle();
 assert((await page.locator('#ae-row-count').innerText()).includes('39 / 251'));
 assert(await page.locator('#ae-overwrite').isEnabled());
 await click('tab-map');await page.locator('#ae-map-query').fill('12');await page.locator('#ae-map').selectOption('12');
 assert(await page.locator('#ae-catalog tr').count()>0);assert((await page.locator('#ae-map-info').innerText()).includes('古皇陵近郊'));
 const mapIds=await page.locator('#ae-catalog tr').evaluateAll(rows=>rows.map(r=>r.dataset.id));assert.equal(mapIds.length,new Set(mapIds).size);
 await page.locator('#ae-map-query').fill('400');await page.locator('#ae-map').selectOption('400');assert((await page.locator('#ae-map-info').innerText()).includes('不代表沒有掉落物'));
 await click('tab-all');
 const rows=page.locator('#ae-catalog tr');await rows.nth(0).click();await rows.nth(1).click({modifiers:['Control']});await rows.nth(3).click({modifiers:['Shift']});
 assert.equal(await page.locator('#ae-catalog tr.chosen').count(),3);
 await click('favorite-add');await click('tab-common');assert.equal(await rows.count(),3);await click('tab-all');
 await rows.nth(0).click();await click('add');assert(!(await page.locator('#ae-row-count').innerText()).includes('39 / 251'));
 const high=items.find(i=>Number(i.Value)>500000&&Number(i.ID)>20000);await page.locator('#ae-query').fill(String(high.ID));
 await page.locator(`#ae-catalog tr[data-id="${high.ID}"]`).click();const before=alerts;await click('add');assert(alerts>before);
 await page.locator('#ae-warning').uncheck();await idle();
 for(let i=0;i<5;i++){await page.locator('#ae-plan').selectOption(String(i));promptName='方案'+i;await click('plan-rename');await click('plan-save');}
 await click('clear');assert((await page.locator('#ae-row-count').innerText()).includes('0 / 251'));await click('plan-load');assert(!(await page.locator('#ae-row-count').innerText()).includes('0 / 251'));
 const first=items.find(r=>r.Name==='靈木')||items[0];
 const csv=`\ufeffItemID,ItemName,Action\r\n${first.ID},"名稱,含\n換行",保存\r\n${first.ID},重複,丟棄\r\n999999,未知,保存`;
 await page.locator('#ae-csv-file').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await idle();
 assert((await page.locator('#ae-csv-summary').innerText()).includes('有效 1 筆；略過 2 筆'));
 await click('csv-apply');await click('plan-load');assert.equal(await page.locator('#ae-rows tr').count(),1);
 const csvDownloaded=page.waitForEvent('download');await click('csv-export');const csvFile=await csvDownloaded;
 assert(fs.readFileSync(await csvFile.path(),'utf8').startsWith('\ufeffItemID,ItemName,Action'));
 await page.locator('.languageControl [data-language="cn"]').click();await page.waitForFunction(()=>document.documentElement.lang==='zh-Hans');
 assert((await page.locator('.ae-page h1').innerText()).includes('离线'));
 await page.locator('.languageControl [data-language="tw"]').click();
 // File System Access handles are simulated; real user save is never written.
 await page.evaluate(source=>{
  window.__sample=source;window.__backups=[];window.__pickerCount=0;
  function handle(bytes,name){return {kind:'file',name,time:Date.now(),data:Uint8Array.from(bytes),async getFile(){return new File([this.data],name,{lastModified:this.time});},async requestPermission(){return 'granted';},async isSameEntry(other){return this===other;},async createWritable(){let pending;return {write:async b=>{pending=Uint8Array.from(b);},close:async()=>{this.data=pending;this.time=Date.now();},abort:async()=>{}};}};}
  window.__originalHandle=handle(source,'test_3.data');
  window.showOpenFilePicker=async()=>[window.__originalHandle];
  window.__backupDir={async *values(){yield* window.__backups;},getFileHandle:async name=>{const h=handle([],name);window.__backups.push(h);return h;}};
  window.showDirectoryPicker=async()=>{
   if(!navigator.userActivation.isActive)throw Error('Picker needs user gesture');
   window.__pickerCount++;
   return {name:'TestBackups',getDirectoryHandle:async(name,options)=>{if(name!=='SZO_AutoData_Backups'||!options.create)throw Error('Missing dedicated folder');return window.__backupDir;}};
  };
 },Array.from(sample));
 await click('open');await click('clear');await click('overwrite');
 assert(await page.locator('#ae-storage-confirm').isDisabled());
 assert.equal(await page.evaluate(()=>__pickerCount),0);
 await click('storage-choose');await click('storage-confirm');
 assert(await page.evaluate(()=>AutoDataCore.equal(__backups[0].data,new Uint8Array(__sample))&&AutoDataCore.parse(__originalHandle.data).arr.length===0));
 assert.equal(await page.locator('#ae-message').innerText(),'已完成物品清單覆蓋，可安心開啟角色。');
 await page.locator('#ae-offline').uncheck();assert(await page.locator('#ae-open').isDisabled());assert(await page.locator('#ae-overwrite').isDisabled());await page.locator('#ae-offline').check();
 await click('restore');assert(await page.locator('#ae-storage-confirm').isDisabled());
 // Re-selecting the dedicated folder must find existing backups without nesting it.
 await page.evaluate(()=>{window.__backupDir.name='SZO_AutoData_Backups';window.__backupDir.getDirectoryHandle=async()=>{throw Error('Unexpected nested backup folder');};window.showDirectoryPicker=async()=>window.__backupDir;});
 await click('storage-choose');
 assert.equal(await page.locator('#ae-storage-location').innerText(),'SZO_AutoData_Backups');
 assert.equal(await page.locator('#ae-storage-list option').count(),2);
 await page.locator('#ae-storage-list').selectOption('0');
 assert((await page.locator('#ae-storage-message').innerText()).includes('將還原'));
 await page.screenshot({path:path.join(root,`outputs/autodata-restore-${channel}.png`)});
 await click('storage-confirm');
 assert.equal(await page.evaluate(()=>__pickerCount),1);
 assert(await page.evaluate(()=>AutoDataCore.equal(__originalHandle.data,new Uint8Array(__sample))&&AutoDataCore.parse(__backups[1].data).arr.length===0));
 // A failed backup must never write the source or display the success message.
 await page.evaluate(()=>{window.__backupDir.getFileHandle=async()=>{throw Error('測試：備份失敗');};});
 await click('overwrite');await click('storage-confirm');assert((await page.locator('#ae-message').innerText()).includes('備份失敗'));await click('storage-cancel');
 assert(await page.evaluate(()=>AutoDataCore.equal(__originalHandle.data,new Uint8Array(__sample))));
 await page.evaluate(()=>{window.showSaveFilePicker=undefined;window.showOpenFilePicker=undefined;window.showDirectoryPicker=undefined;});
 const downloaded=page.waitForEvent('download');await click('overwrite');const d=await downloaded;const out=fs.readFileSync(await d.path());assert.deepEqual(out,sample);
 assert((await page.locator('#ae-message').innerText()).includes('尚未覆蓋'));
 await page.locator('#ae-query').fill('短劍');
 await page.evaluate(()=>{document.getElementById('reader').scrollTop=document.getElementById('reader').scrollHeight;window.scrollTo(0,document.documentElement.scrollHeight);});
 await page.locator('#ae-csv-import').scrollIntoViewIfNeeded();
 assert(await page.locator('#ae-csv-import').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.right-4,r.bottom-4));}));
 await page.screenshot({path:path.join(root,`outputs/autodata-bottom-${channel||'webkit'}-${width}.png`)});
 await page.screenshot({path:path.join(root,`outputs/autodata-${channel||'webkit'}-${width}.png`),fullPage:true});
 await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('reader').scrollTop=0;});
 await page.screenshot({path:path.join(root,`outputs/autodata-top-${channel||'webkit'}-${width}.png`)});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Re-entry keeps the in-memory draft and uses IndexedDB plans, not character bytes.
 await page.evaluate(()=>setView('home'));await page.evaluate(()=>setView('autodata'));await page.waitForFunction(()=>document.querySelector('#ae-plan option')?.textContent.includes('方案0'));
 await page.evaluate(()=>setView('monster'));assert.equal(await page.locator('#reader [data-view="monsterQuery"]').count(),1);assert.equal(await page.locator('#reader [data-view="beastQuery"]').count(),1);
 await page.evaluate(()=>setView('beastQuery'));await page.waitForSelector('.beastStarPicker');
 assert.equal(posts,0);assert.deepEqual(errors,[]);
 console.log('PASS',channel||'webkit',width,'UI/map/multiselect/price/favorites/plans/CSV/language/mocked FSA/fallback/menu/privacy');
 }finally{await browser.close();}
}
(async()=>{await test(chromium,'msedge',1440);await test(chromium,'chrome',1440);await test(chromium,'chrome',390);await test(webkit,null,390);})().catch(e=>{console.error(e);process.exit(1);});

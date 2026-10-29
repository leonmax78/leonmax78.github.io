const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const data=require('../data/stage_maps.json');
 const stage=data.stages.find(s=>s.stageId===284);
 assert.equal(stage.transfers.length,13);
 assert.deepEqual(stage.transfers.filter(p=>p.destination===284).map(p=>p.destinationFloor).sort((a,b)=>a-b),[2,3,4,5,6,7,8,9,10]);
 assert(data.stages.filter(s=>s.transfers?.length).every(s=>s.stageId===284));
 const browser=await chromium.launch({channel:'msedge'});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.route('https://preview.test/**',r=>{const f=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//,'')||'index.html');return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);
   await page.evaluate(async()=>{await loadScriptGroupOnce('page_map');await renderStageMapPage();closeDrawer();});
   await page.locator('#mapStageSearch').fill('284');await page.locator('#mapStageChoices button').first().click();
   await page.locator('#mapImage').evaluate(img=>img.decode());
   assert.equal(await page.locator('.mapTransferLabel').count(),13);
   const problems=await page.locator('.mapImageStage').evaluate(el=>{
    const box=el.getBoundingClientRect(),labels=[...el.querySelectorAll('.mapTransferLabel')];
    const issues=[];
    for(const label of labels){const a=label.getBoundingClientRect();if(a.left<box.left||a.right>box.right||a.top<box.top||a.bottom>box.bottom)issues.push(label.textContent);}
    const all=[...labels,...el.querySelectorAll('.mapAreaLabel')];
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<all.length;j++){const a=labels[i].getBoundingClientRect(),b=all[j].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)issues.push('overlap');}
    return issues;
   });assert.deepEqual(problems,[]);
   await page.screenshot({path:path.join(root,`outputs/tower1-transfers-${width}.png`),fullPage:true});
   if(width===1440){
    await page.locator('.mapImageStage').evaluate(el=>{const clone=el.cloneNode(true);document.body.replaceChildren(clone);document.body.style.cssText='display:block;margin:0;padding:0;overflow:visible;width:1680px;height:1080px';clone.style.cssText='position:relative;transform:none;width:1680px;height:1080px';});
    await page.setViewportSize({width:1680,height:1080});
    await page.locator('.mapImageStage').screenshot({path:path.join(root,'outputs/tower1-transfers-map.png')});
   }
   await page.close();console.log('PASS tower1 transfers',width);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

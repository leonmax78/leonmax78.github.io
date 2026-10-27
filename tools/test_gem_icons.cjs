const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const base=process.env.GEM_BASE||'https://preview.test';
  if(!process.env.GEM_BASE)await page.route(base+'/**',r=>{
   const file=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname).slice(1)||'index.html');
   return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
  });
  await page.goto(base);await page.waitForFunction(()=>window.SZO_READY);
  const check=await page.evaluate(async()=>{
   await ensureItemDataLoaded();
   const gems=Object.values(itemIndex).filter(it=>Number(it.Icon)>=29700&&Number(it.Icon)<=29759);
   const urls=[...new Set(gems.map(it=>SZO_ASSET_MEDIA.itemIconSrc(it)))];
   const images=await Promise.all(urls.map(async src=>{const img=new Image();img.src=src;await img.decode();return {src,width:img.naturalWidth,height:img.naturalHeight};}));
   await SZO_PREVIEW.open('item','32201');
   return {count:gems.length,images};
  });
  assert.equal(check.count,600);assert.equal(check.images.length,60);
  assert(check.images.every(img=>img.src.includes('assets-28000-gems-v639')&&img.width>0&&img.height>0));
  await page.locator('#detailPreview h1').waitFor();
  assert(await page.locator('#detailPreview img').first().evaluate(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:path.join(root,`outputs/gem-icon-${width}.png`)});
  await page.close();console.log(`PASS ${width}: 600 item mappings, 60 decoded icons and item preview`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

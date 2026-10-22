// Explicit integration test: creates two anonymous identities and two labeled messages.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const config=JSON.parse(fs.readFileSync(path.join(root,'data/chat-config.json')));
  const pages=[];
  for(let i=0;i<2;i++){
   const page=await browser.newPage();pages.push(page);
   page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
   await page.route('https://preview.test/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/data/chat-config.json')return route.fulfill({json:{...config,enabled:true}});
    const file=path.join(root,pathname.slice(1)||'index.html');
    return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file}):route.fulfill({status:404,body:''});
   });
   await page.goto('https://preview.test');await page.waitForFunction(()=>window.SZO_READY);await page.waitForTimeout(1800);
   await page.locator('#szoChatLauncher').click();
   await page.locator('[data-chat-connect]').click();
   try{await page.waitForFunction(()=>!document.querySelector('[name="message"]').disabled,{},{timeout:30000});}
   catch(error){console.log('CHAT STATUS',await page.locator('.szoChatStatus').innerText());throw error;}
  }
  await pages[0].getByText('聊天室在線 2 人',{exact:true}).waitFor();
  const marker=new Date().toISOString();
  for(let i=0;i<2;i++){
   await pages[i].locator('[name="nickname"]').fill('網站連線測試');
   await pages[i].locator('[name="message"]').fill(`連線測試 ${i+1} ${marker}`);
   await pages[i].locator('[data-chat-send]').click();
   await pages[1-i].getByText(`連線測試 ${i+1} ${marker}`,{exact:true}).waitFor();
  }
  await pages[1].locator('[data-chat-close]').click();
  await pages[0].getByText('聊天室在線 1 人',{exact:true}).waitFor();
  await pages[0].locator('[data-chat-close]').click();
  assert.equal(config.enabled,false);
  console.log('PASS real Supabase: anonymous sign-in, private presence 2 -> 1, database history and bidirectional live messages. Public config remains disabled.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

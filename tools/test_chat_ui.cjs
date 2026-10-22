const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
// This transport is used only in tests; production always uses the real SDK.
const stub=`window.supabase={createClient(){
 let active=null;
 return {auth:{getSession:async()=>({data:{session:{user:{id:window.testUid},access_token:'test'}}}),startAutoRefresh(){},stopAutoRefresh(){}},
 realtime:{setAuth:async()=>{}},
 from(){return {select(){return this},gte(){return this},order(){return this},limit:async()=>({data:await window.testHistory()})}},
 rpc:async(name,args)=>window.testSend(args),
 channel(){
  const handlers=[];
  active={on(type,filter,cb){handlers.push({type,cb});return this},subscribe(cb){setTimeout(()=>cb('SUBSCRIBED'),0);return this},
   track:async()=>{await window.testJoin();return 'ok'},presenceState:()=>window.testPresence||{}};
  window.testEmit=(row)=>handlers.filter(h=>h.type==='postgres_changes').forEach(h=>h.cb({eventType:'INSERT',new:row}));
  window.testSync=(state)=>{window.testPresence=state;handlers.filter(h=>h.type==='presence').forEach(h=>h.cb())};
  return active;
 },removeChannel:async()=>{await window.testLeave();return 'ok'}};
}};`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 const pages=[],members=new Set(),messages=new Map(),errors=[];
 async function sync(){
  const state=Object.fromEntries([...members].map(id=>[id,[{}]]));
  for(const p of pages)if(!p.isClosed())await p.evaluate(s=>window.testSync?.(s),state);
 }
 async function setup(width,enabled){
  const p=await browser.newPage({viewport:{width,height:844}});pages.push(p);
  const uid=require('crypto').randomUUID();let failAfterWrite=false;
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(uid=>{window.testUid=uid;},uid);
  await p.exposeFunction('testHistory',()=>[...messages.values()]);
  await p.exposeFunction('testJoin',async()=>{members.add(uid);await sync();});
  await p.exposeFunction('testLeave',async()=>{members.delete(uid);await sync();});
  await p.exposeFunction('testTimeoutNext',()=>{failAfterWrite=true;});
  await p.exposeFunction('testSend',async args=>{
   if(args.p_body==='rate-limit')return {error:{message:'CHAT_RATE_LIMIT'}};
   let row=messages.get(args.p_id);
   if(!row){row={id:args.p_id,user_id:uid,nickname:args.p_nickname,body:args.p_body,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_removed:false};messages.set(row.id,row);}
   for(const page of pages)if(!page.isClosed())await page.evaluate(r=>window.testEmit?.(r),row);
   if(failAfterWrite){failAfterWrite=false;return {error:{message:'timeout'}};}
   return {data:row};
  });
  await p.route('https://preview.test/**',r=>{
   const pathname=new URL(r.request().url()).pathname;
   if(pathname==='/data/chat-config.json')return r.fulfill({json:{enabled,url:'https://test-project.supabase.co',publishableKey:'sb_publishable_test'}});
   if(pathname.endsWith('/supabase-2.118.0.js'))return r.fulfill({contentType:'application/javascript',body:stub});
   const file=path.join(root,pathname.slice(1)||'index.html');
   return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({status:404,body:''});
  });
  await p.goto('https://preview.test');await p.waitForFunction(()=>window.SZO_READY);await p.waitForTimeout(1800);
  await p.locator('#szoChatLauncher').click();
  return p;
 }
 try{
  const inactive=await setup(390,false);
  await inactive.getByText('聊天室準備中，尚未開放連線。').waitFor();
  assert(await inactive.locator('[data-chat-connect]').isDisabled());
  assert.equal(await inactive.locator('.szoChatMessage').count(),0);
  await inactive.screenshot({path:path.join(root,'outputs/chat-unconfigured-mobile.png')});
  await inactive.close();
  const a=await setup(1440,true),b=await setup(390,true);
  for(const p of [a,b]){await p.locator('[data-chat-connect]').click();await p.waitForFunction(()=>!document.querySelector('.szoChatComposer textarea').disabled);}
  await a.getByText('聊天室在線 2 人',{exact:true}).waitFor();
  await a.locator('[name="nickname"]').fill('尼扣扣');
  await a.locator('[name="message"]').fill('<img src=x onerror=alert(1)> 繁體內容');
  await a.locator('[data-chat-send]').click();
  await b.getByText('<img src=x onerror=alert(1)> 繁體內容',{exact:true}).waitFor();
  assert.equal(await b.locator('.szoChatMessages img').count(),0);
  await a.locator('[data-language="cn"]').click();
  assert((await a.locator('.szoChatMessage p').first().innerText()).includes('繁體內容'));
  await a.locator('[data-language="tw"]').click();
  await b.locator('[name="nickname"]').fill('測試玩家');
  await b.locator('[name="message"]').fill('rate-limit');
  await b.locator('[data-chat-send]').click();
  await b.getByText('發言太快，請隔 3 秒再送出。').waitFor();
  assert.equal(await b.locator('[name="message"]').inputValue(),'rate-limit');
  await b.evaluate(()=>window.testTimeoutNext());
  await b.locator('[name="message"]').fill('連線測試');
  await b.locator('[data-chat-send]').click();
  await b.getByText('送出結果尚未確認，可再按送出重試；不會重複刊登。').waitFor();
  await b.locator('[data-chat-send]').click();
  await b.waitForFunction(()=>document.querySelector('[name="message"]').value==='');
  assert.equal(messages.size,2);
  await b.evaluate(()=>window.dispatchEvent(new Event('offline')));
  assert(await b.locator('[data-chat-send]').isDisabled());
  await b.locator('[data-chat-connect]').click();
  await b.waitForFunction(()=>!document.querySelector('.szoChatComposer textarea').disabled);
  for(const p of [a,b]){
   const box=await p.locator('#szoChatPanel').boundingBox(),v=p.viewportSize();
   assert(box.x>=0&&box.y>=0&&box.x+box.width<=v.width&&box.y+box.height<=v.height);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.screenshot({path:path.join(root,`outputs/chat-${v.width}.png`)});
  }
  await b.setViewportSize({width:390,height:420});
  const sendBox=await b.locator('[data-chat-send]').boundingBox();
  assert(sendBox.y>=0&&sendBox.y+sendBox.height<=420);
  await b.screenshot({path:path.join(root,'outputs/chat-small-height.png')});
  await b.locator('[data-chat-close]').click();
  await a.getByText('聊天室在線 1 人',{exact:true}).waitFor();
  await a.locator('[data-chat-close]').click();
  assert.equal(members.size,0);
  assert.deepEqual(errors,[]);
  console.log('PASS: unconfigured/offline UI, two-client mock sync, presence, safe text, error draft, idempotent retry, reconnect, leave, desktop/mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

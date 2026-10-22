const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage();
  await page.route('https://chat.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  await page.goto('https://chat.test');
  await page.route('**/chat-config.json',r=>r.fulfill({json:{enabled:true,url:'https://test.supabase.co',publishableKey:'test',turnstileSiteKey:'test'}}));
  await page.route('**/supabase-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>({auth:{startAutoRefresh(){},stopAutoRefresh(){},getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>({error:{code:'captcha_failed',message:'sitekey-secret-mismatch'}})}})};`}));
  // Mock only the widget contract; never automate a real CAPTCHA challenge.
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:`window.turnstile={render:(node,options)=>{window.challenge=options;return 'mock';},remove(){},reset(){}};`}));
  await page.addScriptTag({path:path.resolve(__dirname,'../js/core/chat.js')});
  await page.locator('#szoChatLauncher').click();
  const join=page.locator('[data-chat-connect]');
  await join.click();
  await page.waitForFunction(()=>!!window.challenge);
  assert(await join.isDisabled());
  await page.evaluate(()=>window.challenge.callback('mock-token'));
  assert(await join.isEnabled());
  await join.click();
  await page.getByText(/網站的人機驗證金鑰不相符/).waitFor();
  assert(await join.isEnabled());
  await join.click();
  await page.evaluate(()=>window.challenge['error-callback']('110200'));
  await page.getByText(/人機驗證失敗（110200）/).waitFor();
  console.log('PASS CAPTCHA waiting, success, server rejection and widget errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

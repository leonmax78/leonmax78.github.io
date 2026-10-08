const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium,webkit,devices}=require('C:/Users/leonm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),base=process.env.REVIEW_BASE||'http://127.0.0.1:8790';
(async()=>{
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage();await page.goto(base+'/planning/item-fields.html');await page.waitForSelector('[data-visible="Damage"]');
  await page.evaluate(()=>localStorage.setItem('sihai-item-field-draft-v1',JSON.stringify({fields:{DamageMin:{visible:true},DamageMax:{visible:true},Time:{label:'作用時間(秒)'}},values:{Type:{BONUS:'獎勵禮包',AXE:'測試斧頭'}}})));
  await page.reload();await page.waitForSelector('[data-visible="Damage"]');assert.equal(await page.locator('[data-visible="DamageMin"]').count(),0);
  await page.locator('#statusTab').click();const frame=page.frameLocator('#statusFrame');await frame.locator('#search').fill('昊．勇者聖甲');await frame.locator('[data-description="146"]').waitFor();
  assert((await frame.locator('[data-description="146"]').inputValue()).includes('+75%'));
  await frame.locator('[data-description="146"]').fill('自身物理傷害 +75%\n承受物理傷害 +60%');await frame.locator('[data-approve="146"]').check();
  await page.screenshot({path:path.join(root,'outputs/status-review-desktop.png'),fullPage:true});
  const event=page.waitForEvent('download');await page.locator('#export').click();const download=await event,json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(json.baseVersion,'V577');assert.equal(json.statusReviews.length,124);assert(json.statusReviews.find(s=>s.id==='146').approved);assert.equal(json.existingValueMappings.Type.BONUS,'錦囊');assert.equal(json.confirmedValueChanges.Type.BONUS,undefined);assert.equal(json.confirmedValueChanges.Type.AXE,'測試斧頭');assert.deepEqual(json.combinedFields.Damage,['DamageMin','DamageMax']);
  await page.reload();await page.locator('#statusTab').click();await frame.locator('#search').fill('昊．勇者聖甲');assert(await frame.locator('[data-approve="146"]').isChecked());
  await frame.locator('[data-description="146"]').fill('修改後須重新確認');assert(!await frame.locator('[data-approve="146"]').isChecked());
  page.on('dialog',d=>d.accept());await frame.locator('#file').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});await page.waitForTimeout(200);assert(await frame.locator('[data-approve="146"]').isChecked());
  assert.equal(await page.evaluate(()=>!!localStorage.getItem('sihai-item-field-draft-v1-pre-V577')),true);
  console.log('PASS migration, combined damage, current BONUS, retained edits, 124 statuses, persistence, approval reset, combined export/import');
 }finally{await browser.close();}
 const safari=await webkit.launch();try{const page=await safari.newPage({...devices['iPhone 13']});await page.goto(base+'/planning/item-fields.html');await page.locator('#statusTab').tap();const frame=page.frameLocator('#statusFrame');await frame.locator('#search').fill('146');await frame.locator('[data-description="146"]').fill('手機修改測試');await frame.locator('[data-approve="146"]').check();await page.screenshot({path:path.join(root,'outputs/status-review-mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS WebKit mobile review');}finally{await safari.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

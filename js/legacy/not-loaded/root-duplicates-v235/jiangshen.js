// V206 jiangshen.js
// Safe jiangshen/training module copy.
// app-core.js still keeps original jiangshen functions in this version.
// This staged copy prepares for full extraction after verifying behavior.

// V212: TRAINING_DATA 已集中到 js/data/training-data.js，這裡不再重複宣告。


const EXP_ITEMS={'乙太 8000億':8000n*100000000n,'鑽石 3000億':3000n*100000000n,'真元 500億':500n*100000000n};

const stars1=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>${i} 星</option>`).join('');

const stars20=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} 星</option>`).join('');

function renderJiangHome(){
 byId('reader').innerHTML='';
}

function openJiangMenuOnly(){
 currentView='jiang';
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='jiang'));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 byId('jiangForm')?.classList.add('active');
 renderJiangHome();
}

function setJiang(kind){
 openJiangMenuOnly();
 fillJiangFields(kind);
}

function fillJiangFields(kind){
 const opts='<option value="">空白</option>'+DISPLAY_NAMES.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 const stars1=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>${i} 星</option>`).join('');
 const stars20=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} 星</option>`).join('');

 if(kind==='support'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>副降神模擬</h2>
  <div class="notice">主降神以 100% 能力計算；副降神 1～4 以原本能力的 10% 計算。</div>
  <div class="kvGrid">
    <div class="kv"><div class="k">主降神</div><div class="v"><select id="jsN0" class="jsSupportName" data-index="0">${opts}</select><label>星等</label><select id="jsS0">${stars1}</select></div></div>
    ${Array.from({length:4},(_,i)=>`<div class="kv"><div class="k">副降神 ${i+1}</div><div class="v"><select id="jsN${i+1}" class="jsSupportName" data-index="${i+1}">${opts}</select><label>星等</label><select id="jsS${i+1}">${stars1}</select></div></div>`).join('')}
  </div>
  <div class="quick"><button id="calcSupport">產生閱讀頁<small>主降神 100%，副降神 10%，並計算成立連結</small></button></div></section>`;
  updateSupportOptions();
 }

 if(kind==='compare'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>主降神比較</h2><div class="kvGrid">
  <div class="kv"><div class="k">降神 A</div><div class="v"><select id="jsA">${opts}</select><label>星等</label><select id="jsAS">${stars20}</select></div></div>
  <div class="kv"><div class="k">降神 B</div><div class="v"><select id="jsB">${opts}</select><label>星等</label><select id="jsBS">${stars20}</select></div></div>
  </div><div class="quick"><button id="calcCompare">產生比較頁<small>比較兩位主降神能力差異</small></button></div></section>`;
 }

 if(kind==='stars'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>20星等</h2><div class="muted">選擇降神後，產生 0～20 星完整能力總表。</div><div class="kvGrid">
  <div class="kv"><div class="k">選擇降神</div><div class="v"><select id="jsStarName">${opts}</select></div></div>
  </div><div class="quick"><button id="calcStars">產生 0～20 星能力總表<small>完整顯示各星等能力</small></button></div></section>`;
 }

 if(kind==='starAura'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>星等 / 靈氣</h2>
  <h3>星等：需要的降神數量</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">目前星等</div><div class="v"><select id="needCur">${Array.from({length:21},(_,i)=>`<option value="${i}">${i} 星</option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">目標星等</div><div class="v"><select id="needTar">${Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} 星</option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">已有降神魂數量</div><div class="v"><input id="needOwned" type="number" value="0"></div></div>
    <div class="kv"><div class="k">降神倍率</div><div class="v"><input id="needRate" type="number" value="1"></div></div>
  </div>
  <h3>靈氣：所需靈氣</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">目前等級</div><div class="v"><input id="auraCur" type="number" value="1"></div></div>
    <div class="kv"><div class="k">目標等級</div><div class="v"><input id="auraTar" type="number" value="20"></div></div>
  </div>
  <div class="quick"><button id="calcStarAura">計算<small>計算需要的降神數量與靈氣數</small></button></div></section>`;
 }

 if(kind==='expPill'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>等級 / 經驗丹</h2>
  <div class="calcTabs">
    <button class="calcTab active" data-exp-tab="need">等級經驗</button>
    <button class="calcTab" data-exp-tab="eat">經驗丹升等</button>
  </div>
  <div id="expTabNeed">
    <h3>等級：需要的經驗值</h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">現在等級</div><div class="v"><input id="expCur" type="number" value="1"></div></div>
      <div class="kv"><div class="k">目標等級</div><div class="v"><input id="expTar" type="number" value="2000"></div></div>
    </div>
    <div class="quick"><button id="calcExpNeed">計算需要經驗<small>換算乙太、聖鑽、真元顆數</small></button></div>
  </div>
  <div id="expTabEat" style="display:none">
    <h3>經驗丹：吃丹可提升到幾等</h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">現在等級</div><div class="v"><input id="eatStartLv" type="number" value="1"></div></div>
      <div class="kv"><div class="k">經驗丹單位（億）</div><div class="v"><input id="eatUnitYi" type="number" value="100"></div></div>
      <div class="kv"><div class="k">經驗丹數量</div><div class="v"><input id="eatCount" type="number" value="1"></div></div>
    </div>
    <div class="quick"><button id="calcEatPill">計算升等<small>例如單位填 100 代表 100 億</small></button></div>
  </div>
  </section>`;
 }

 if(kind==='training'){
  renderTrainingCalc();
  closeDrawer();
  window.scrollTo({top:0,behavior:'smooth'});
  return;
 }
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}

function updateSupportOptions(){
 const selects=[...document.querySelectorAll('.jsSupportName')];
 const values=selects.map(s=>s.value);
 const chosen=values.filter(Boolean);
 for(const sel of selects){
  const self=sel.value;
  const current=self;
  sel.innerHTML='<option value="">空白</option>'+DISPLAY_NAMES.filter(n=>n===current || !chosen.includes(n)).map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('');
 }
}

function trainingGroupRank(g){
 const order=(TRAINING_DATA&&TRAINING_DATA.groupOrder)||[];
 const idx=order.indexOf(g||'');
 return idx>=0?idx:999;
}

function trainingElementRank(text){
 const s=String(text||'');
 const order=['玄武','體宇','體魄','白虎','力宇','力量','青龍','智宇','智慧','朱雀','敏宇','靈敏','麒麟','血宇','生命','騰蛇','精宇','精力','梅冠','菱冠','心冠','桃冠','同花'];
 const idx=order.findIndex(k=>s.includes(k));
 return idx>=0?idx:999;
}

function trainingDisplayName(name){
 return String(name||'').replace(/五鑽連貫心元/g,'五鑽連貫心');
}

function trainingFilterGroups(value){
 if(value==='group_diamond')return ['聖鑽','同花大聖鑽','五鑽連貫心'];
 if(value==='group_ether')return ['以太核','六宇聚變核'];
 return value?[value]:[];
}

function trainingGroupLabel(g){
 if(g==='group_diamond')return '聖鑽(聖鑽、同花大聖鑽、五鑽連貫心)';
 if(g==='group_ether')return '以太核(以太核、六宇聚變核)';
 return g||'全部分類';
}

function trainingViewGroupValue(g){
 if(['聖鑽','同花大聖鑽','五鑽連貫心'].includes(g))return 'group_diamond';
 if(['以太核','六宇聚變核'].includes(g))return 'group_ether';
 return g||'';
}

function sortedTrainingData(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 return data.map((x,i)=>({x,i})).sort((a,b)=>{
  const ga=trainingGroupRank(a.x.group), gb=trainingGroupRank(b.x.group);
  if(ga!==gb)return ga-gb;
  const ea=trainingElementRank((a.x.item||'')+trainingDisplayName(a.x.name)+(a.x.stat||''));
  const eb=trainingElementRank((b.x.item||'')+trainingDisplayName(b.x.name)+(b.x.stat||''));
  if(ea!==eb)return ea-eb;
  return trainingDisplayName(a.x.name).localeCompare(trainingDisplayName(b.x.name),'zh-Hant');
 });
}

function appendTrainingNote(x){
 if((x.group||'')==='五鑽連貫心'){
  return '不需要手動選階、請找『王都盧索』安全區「冥司印曷闐」啟用';
 }
 let note=x.note||'';
 note=note.replace(/六宇聚變核原始表第28階[^。]*。?/g,'').trim();
 note=note.replace(/原始表第28階看起來寫成 \+272；此版按前後規律修正為 \+372/g,'').trim();
 return note;
}

function renderTrainingCalc(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 const groupOptions=['四聖諦','天照珠玉','靈丹','聖靈煉金','真元','group_diamond','group_ether'];
 const groupOpts='<option value="">全部分類</option>'+groupOptions.map(g=>`<option value="${esc(g)}">${esc(trainingGroupLabel(g))}</option>`).join('');
 function card(pair){
  const x=pair.x, i=pair.i;
  const displayName=trainingDisplayName(x.name||'');
  const viewGroup=trainingViewGroupValue(x.group||'');
  const max=Number(x.maxLevel||0);
  const cur=Math.min(max,Math.max(0,Number(x.defaultCurrentLevel||0)));
  const tar=Math.min(max,Math.max(cur,Number(x.defaultTargetLevel||max)));
  const sub=x.subGroup?`｜${x.subGroup}`:'';
  const fullNeed=(x.costs||[]).reduce((a,b)=>a+Number(b||0),0);
  const defaultNeed=(x.costs||[]).slice(cur,tar).reduce((a,b)=>a+Number(b||0),0);
  const note=appendTrainingNote(x);
  const derived=x.inputMode==='derived';
  return `<div class="trainCard" data-train-row="${i}" data-group="${esc(viewGroup)}">
    <div class="trainCardHead"><div><div class="trainName">${esc(displayName)}</div><div class="trainSub">${esc((x.group||'')+sub)}｜${esc(trainingDisplayName(x.stat||''))}</div></div><div class="trainBadge">滿階 ${max}</div></div>
    <div class="trainNeedBox"><b>需求數量：</b>${esc(x.item||'')} × <span class="trainNeed" data-i="${i}">${fmt(defaultNeed)}</span><div class="rSub">0 → 滿階：${fmt(fullNeed)}</div></div>
    ${note?`<div class="trainNote">${esc(note)}</div>`:''}
    <div class="trainLevels">
      <div><label>目前階</label><input class="trainCur" data-i="${i}" type="number" min="0" max="${max}" value="${cur}" ${derived?'readonly':''}></div>
      <div><label>目標階</label><input class="trainTar" data-i="${i}" type="number" min="0" max="${max}" value="${tar}" ${derived?'readonly':''}></div>
    </div>
  </div>`;
 }
 byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>修練機制</h2>
 <div class="notice">選擇目前階與目標階，會計算需要材料，以及從目前階提升到目標階增加的能力。計算結果預設隱藏，按下「計算修練」後才會顯示。</div>
 <div class="kvGrid">
  <div class="kv"><div class="k">分類篩選</div><div class="v"><select id="trainGroupFilter">${groupOpts}</select></div></div>
  <div class="kv"><div class="k">快速設定</div><div class="v"><div class="quick" style="margin-top:0"><button id="trainAllMax">全部 0 → 滿階<small>把目前階設 0、目標階設最大</small></button><button id="trainClear">目前階 = 目標階<small>只保留目前設定，不計算提升</small></button></div></div></div>
 </div>
 <h3>修練項目</h3>
 <div class="trainingList">${sortedTrainingData().map(card).join('')}</div>
 <div class="quick"><button id="calcTraining">計算修練<small>只統計目前分類篩選內的項目</small></button></div>
 <div id="trainingResultWrap" style="display:none"><div id="trainingResult"></div></div>
 </section>`;
 applyTrainingDerivedLevels();
 updateTrainingNeeds();
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}

function filterTrainingRows(){
 const g=byId('trainGroupFilter')?.value||'';
 document.querySelectorAll('[data-train-row]').forEach(el=>{el.style.display=(!g||el.dataset.group===g)?'':'none';});
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='none';
}

function applyTrainingDerivedLevels(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 const idToIndex=Object.fromEntries(data.map((x,i)=>[x.id,i]));
 data.forEach((x,i)=>{
  if(x.inputMode!=='derived'||!x.deriveRule||!Array.isArray(x.deriveRule.sourceIds))return;
  const curVals=[],tarVals=[];
  for(const sid of x.deriveRule.sourceIds){
   const si=idToIndex[sid]; if(si===undefined)continue;
   const sdata=data[si]; const smax=Number(sdata.maxLevel||0);
   const curEl=document.querySelector(`.trainCur[data-i="${si}"]`);
   const tarEl=document.querySelector(`.trainTar[data-i="${si}"]`);
   if(curEl)curVals.push(Math.max(0,Math.min(smax,intOf(curEl.value,0))));
   if(tarEl)tarVals.push(Math.max(0,Math.min(smax,intOf(tarEl.value,smax))));
  }
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  const max=Number(x.maxLevel||0);
  if(curEl&&curVals.length)curEl.value=Math.max(0,Math.min(max,Math.min(...curVals)));
  if(tarEl&&tarVals.length)tarEl.value=Math.max(0,Math.min(max,Math.min(...tarVals)));
 });
}

function clampTrainingInputs(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(!curEl||!tarEl)return;
  let cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  let tar=Math.max(0,Math.min(max,intOf(tarEl.value,max)));
  if(tar<cur)tar=cur;
  curEl.value=cur; tarEl.value=tar;
 });
 applyTrainingDerivedLevels();
 updateTrainingNeeds();
}

function updateTrainingNeeds(){
 applyTrainingDerivedLevels();
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  const needEl=document.querySelector(`.trainNeed[data-i="${i}"]`);
  if(!curEl||!tarEl||!needEl)return;
  let cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  let tar=Math.max(cur,Math.min(max,intOf(tarEl.value,max)));
  let need=0;
  for(let lv=cur;lv<tar;lv++)need+=Number((x.costs||[])[lv]||0);
  needEl.textContent=fmt(need);
 });
}

function setTrainingAllMax(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(curEl)curEl.value=0;
  if(tarEl)tarEl.value=max;
 });
 updateTrainingNeeds();
}

function clearTrainingTargets(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(curEl&&tarEl)tarEl.value=curEl.value;
 });
 updateTrainingNeeds();
}

function calcTraining(){
 window.v86LastView='jiang';
 clampTrainingInputs();
 const selectedGroup=byId('trainGroupFilter')?.value||'';
 const selectedGroups=trainingFilterGroups(selectedGroup);
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 const effectOrder=(TRAINING_DATA&&TRAINING_DATA.effectStatOrder)||['體魄','力量','智慧','靈敏','生命','精力','自由分配能力值'];
 const costByItem={};
 const gainByStat=Object.fromEntries(effectOrder.map(s=>[s,0]));
 const detail=[];
 for(let i=0;i<data.length;i++){
  const x=data[i];
  if(selectedGroups.length && !selectedGroups.includes(x.group))continue;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(!curEl||!tarEl)continue;
  const cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  const tar=Math.max(cur,Math.min(max,intOf(tarEl.value,max)));
  if(tar<=cur)continue;
  let cost=0;
  for(let lv=cur;lv<tar;lv++)cost+=Number((x.costs||[])[lv]||0);
  if(cost && !x.excludeFromItemSummary){costByItem[x.item||'未命名材料']=(costByItem[x.item||'未命名材料']||0)+cost;}
  const curEff=(x.effectsByLevel||[])[cur]||{};
  const tarEff=(x.effectsByLevel||[])[tar]||{};
  const gains={};
  const keys=new Set([...Object.keys(curEff),...Object.keys(tarEff),...(x.effectStats||[])]);
  keys.forEach(k=>{
   const v=Number(tarEff[k]||0)-Number(curEff[k]||0);
   if(v){gains[k]=v; gainByStat[k]=(gainByStat[k]||0)+v;}
  });
  detail.push({name:trainingDisplayName(x.name||''), group:x.group||'', subGroup:x.subGroup||'', item:x.item||'', cur, tar, cost, gains, note:appendTrainingNote(x), noCost:!!x.excludeFromItemSummary});
 }
 const costRows=sortMaterialEntries(Object.entries(costByItem)).map(([item,n])=>`<tr><td>${esc(item)}</td><td>${fmt(n)}</td></tr>`).join('');
 const allStats=[...effectOrder,...Object.keys(gainByStat).filter(s=>!effectOrder.includes(s))];
 const gainRows=allStats.filter(s=>gainByStat[s]).map(s=>`<tr><td>${esc(trainingDisplayName(s))}</td><td>+${fmt(gainByStat[s])}</td></tr>`).join('');
 const detailRows=detail.sort((a,b)=>{
  const ga=trainingGroupRank(a.group),gb=trainingGroupRank(b.group); if(ga!==gb)return ga-gb;
  const ea=trainingElementRank(a.item+a.name),eb=trainingElementRank(b.item+b.name); if(ea!==eb)return ea-eb;
  return a.name.localeCompare(b.name,'zh-Hant');
 }).map(d=>{
  const gainText=Object.entries(d.gains).map(([k,v])=>`${trainingDisplayName(k)}+${fmt(v)}`).join('、')||'-';
  const sub=d.subGroup?`｜${d.subGroup}`:'';
  const materialText=d.noCost?'無消耗':`${d.item} × ${fmt(d.cost)}`;
  return `<tr><td><b>${esc(d.name)}</b><div class="rSub">${esc(d.group+sub)}</div>${d.note?`<div class="rSub">${esc(d.note)}</div>`:''}</td><td>${d.cur} → ${d.tar}</td><td>${esc(materialText)}</td><td>${esc(gainText)}</td></tr>`;
 }).join('');
 const title=selectedGroup?`計算結果：${esc(trainingGroupLabel(selectedGroup))}`:'計算結果';
 byId('trainingResult').innerHTML=`<h3>${title}</h3>
 ${detail.length?'': '<div class="empty">目前沒有任何提升項目，請把目標階調高後再計算。</div>'}
 ${costRows?`<h3>材料統計</h3><div class="tableWrap"><table><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${costRows}</tbody></table></div>`:''}
 ${gainRows?`<h3>增加能力</h3><div class="tableWrap"><table><thead><tr><th>能力</th><th>增加值</th></tr></thead><tbody>${gainRows}</tbody></table></div>`:''}
 ${detailRows?`<h3>明細</h3><div class="tableWrap"><table><thead><tr><th>項目</th><th>階數</th><th>材料</th><th>增加能力</th></tr></thead><tbody>${detailRows}</tbody></table></div>`:''}`;
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='block';
 byId('trainingResult').scrollIntoView({behavior:'smooth',block:'start'});
}

window.SZO_JIANGSHEN_MODULE = {
  renderJiangHome: (typeof renderJiangHome==='function'?renderJiangHome:null),
  openJiangMenuOnly: (typeof openJiangMenuOnly==='function'?openJiangMenuOnly:null),
  setJiang: (typeof setJiang==='function'?setJiang:null),
  fillJiangFields: (typeof fillJiangFields==='function'?fillJiangFields:null),
  updateSupportOptions: (typeof updateSupportOptions==='function'?updateSupportOptions:null),
  trainingGroupRank: (typeof trainingGroupRank==='function'?trainingGroupRank:null),
  trainingElementRank: (typeof trainingElementRank==='function'?trainingElementRank:null),
  trainingDisplayName: (typeof trainingDisplayName==='function'?trainingDisplayName:null),
  trainingFilterGroups: (typeof trainingFilterGroups==='function'?trainingFilterGroups:null),
  trainingGroupLabel: (typeof trainingGroupLabel==='function'?trainingGroupLabel:null),
  trainingViewGroupValue: (typeof trainingViewGroupValue==='function'?trainingViewGroupValue:null),
  sortedTrainingData: (typeof sortedTrainingData==='function'?sortedTrainingData:null),
  appendTrainingNote: (typeof appendTrainingNote==='function'?appendTrainingNote:null),
  renderTrainingCalc: (typeof renderTrainingCalc==='function'?renderTrainingCalc:null),
  filterTrainingRows: (typeof filterTrainingRows==='function'?filterTrainingRows:null),
  applyTrainingDerivedLevels: (typeof applyTrainingDerivedLevels==='function'?applyTrainingDerivedLevels:null),
  clampTrainingInputs: (typeof clampTrainingInputs==='function'?clampTrainingInputs:null),
  updateTrainingNeeds: (typeof updateTrainingNeeds==='function'?updateTrainingNeeds:null),
  setTrainingAllMax: (typeof setTrainingAllMax==='function'?setTrainingAllMax:null),
  clearTrainingTargets: (typeof clearTrainingTargets==='function'?clearTrainingTargets:null),
  calcTraining: (typeof calcTraining==='function'?calcTraining:null)
};

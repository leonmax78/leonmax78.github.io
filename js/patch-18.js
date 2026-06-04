/* v88ba: 修復降神整組計算 + 防具部位排序 */
(function(){
  const $ = (id)=>document.getElementById(id);
  const E = (s)=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const N = (id,d=0)=>{const el=$(id); const n=Number(el?el.value:d); return Number.isFinite(n)?n:d;};
  const F = (n)=>{try{return Number(n||0).toLocaleString('zh-Hant');}catch(e){return String(n??'');}};
  const FB = (n)=>{try{return BigInt(n||0).toLocaleString('zh-Hant');}catch(e){return String(n??'0');}};
  const JiangTitle = '降神、經驗、修練試算';
  function closeMenu(){ if(typeof closeDrawer==='function') closeDrawer(); }
  function scrollTop(){ try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);} }
  function optionsNames(){
    const names = (window.DATA&&DATA.displayNames)||[];
    return '<option value="">空白</option>'+names.map(n=>`<option value="${E(n)}">${E(n)}</option>`).join('');
  }
  function starOptions(sel=20){ return Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join(''); }
  function stats(){ return (window.DATA&&DATA.stats)||['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']; }
  function canName(n){ if(typeof canonicalName==='function') return canonicalName(n); return n; }
  function getAbility(name,star){ if(typeof ability==='function') return ability(name,star); return {}; }
  function addAbility(a,b,rate=1){ const out={}; for(const st of stats()) out[st]=Number(a?.[st]||0)+Number(b?.[st]||0)*rate; return out; }
  function scale(a,rate){ const out={}; for(const st of stats()) out[st]=Number(a?.[st]||0)*rate; return out; }
  function kvGrid(obj){ return `<div class="kvGrid">${stats().map(st=>`<div class="kv"><div class="k">${E(st)}</div><div class="v">${F(obj?.[st]||0)}</div></div>`).join('')}</div>`; }
  function backBtn(){ return (typeof backButtonHTML==='function') ? backButtonHTML('jiang') : '<button class="backBtn" type="button" data-view="jiang">← 返回</button>'; }

  function renderSupport(){
    const opts=optionsNames(), s1=starOptions(1);
    $('reader').innerHTML=`<section class="card"><h1>${JiangTitle}</h1><h2>副降神模擬</h2><div class="notice">主降神以 100% 能力計算；副降神 1～4 以 10% 能力計算。</div><div class="kvGrid"><div class="kv"><div class="k">主降神</div><div class="v"><select id="jsN0" class="jsSupportName">${opts}</select><label>星等</label><select id="jsS0">${s1}</select></div></div>${Array.from({length:4},(_,i)=>`<div class="kv"><div class="k">副降神 ${i+1}</div><div class="v"><select id="jsN${i+1}" class="jsSupportName">${opts}</select><label>星等</label><select id="jsS${i+1}">${s1}</select></div></div>`).join('')}</div><div class="quick"><button id="calcSupport" type="button">產生閱讀頁<small>主降神 100%，副降神 10%，並計算成立連結</small></button></div></section>`;
  }
  function renderCompare(){
    const opts=optionsNames(), s20=starOptions(20);
    $('reader').innerHTML=`<section class="card"><h1>${JiangTitle}</h1><h2>主降神比較</h2><div class="kvGrid"><div class="kv"><div class="k">降神 A</div><div class="v"><select id="jsA">${opts}</select><label>星等</label><select id="jsAS">${s20}</select></div></div><div class="kv"><div class="k">降神 B</div><div class="v"><select id="jsB">${opts}</select><label>星等</label><select id="jsBS">${s20}</select></div></div></div><div class="quick"><button id="calcCompare" type="button">產生比較頁<small>比較兩位主降神能力差異</small></button></div></section>`;
  }
  function renderStars(){
    $('reader').innerHTML=`<section class="card"><h1>${JiangTitle}</h1><h2>20星等</h2><div class="kvGrid"><div class="kv"><div class="k">選擇降神</div><div class="v"><select id="jsStarName">${optionsNames()}</select></div></div></div><div class="quick"><button id="calcStars" type="button">產生 0～20 星能力總表<small>完整顯示各星等能力</small></button></div></section>`;
  }
  function renderStarAura(){
    $('reader').innerHTML=`<section class="card"><h1>${JiangTitle}</h1><h2>星等 / 靈氣計算</h2><div class="calcTabs"><button class="calcTab active" type="button" data-star-tab="star">星等計算</button><button class="calcTab" type="button" data-star-tab="aura">靈氣計算</button></div><div id="starTabNeed"><h3>星等：需要的降神數量</h3><div class="kvGrid"><div class="kv"><div class="k">目前星等</div><div class="v"><select id="needCur">${starOptions(0)}</select></div></div><div class="kv"><div class="k">目標星等</div><div class="v"><select id="needTar">${starOptions(20)}</select></div></div><div class="kv"><div class="k">已有降神數量</div><div class="v"><input id="needOwned" type="number" value="0"></div></div><div class="kv"><div class="k">倍率</div><div class="v"><input id="needRate" type="number" value="1" step="0.1"></div></div></div><div class="quick"><button id="calcNeeds" type="button">計算星等<small>逐星需求表累加</small></button></div><div id="starNeedResult"></div></div><div id="starTabAura" style="display:none"><h3>靈氣：所需靈氣</h3><div class="kvGrid"><div class="kv"><div class="k">目前等級</div><div class="v"><input id="auraCur" type="number" value="1"></div></div><div class="kv"><div class="k">目標等級</div><div class="v"><input id="auraTar" type="number" value="20"></div></div></div><div class="quick"><button id="calcStarAura" type="button">計算靈氣<small>逐級需求表累加</small></button></div><div id="auraNeedResult"></div></div></section>`;
  }
  function renderExpPill(){
    $('reader').innerHTML=`<section class="card"><h1>${JiangTitle}</h1><h2>等級 / 經驗丹</h2><div class="calcTabs"><button class="calcTab active" type="button" data-exp-tab="need">等級經驗</button><button class="calcTab" type="button" data-exp-tab="eat">經驗丹升等</button></div><div id="expTabNeed"><h3>等級：需要的經驗值</h3><div class="kvGrid"><div class="kv"><div class="k">現在等級</div><div class="v"><input id="expCur" type="number" value="1"></div></div><div class="kv"><div class="k">目標等級</div><div class="v"><input id="expTar" type="number" value="2000"></div></div></div><div class="quick"><button id="calcExpNeed" type="button">計算需要經驗<small>換算乙太、聖鑽、真元顆數</small></button></div><div id="expNeedResult"></div></div><div id="expTabEat" style="display:none"><h3>經驗丹：吃丹可提升到幾等</h3><div class="kvGrid"><div class="kv"><div class="k">現在等級</div><div class="v"><input id="eatStartLv" type="number" value="1"></div></div><div class="kv"><div class="k">經驗丹單位（億）</div><div class="v"><input id="eatUnitYi" type="number" value="100"></div></div><div class="kv"><div class="k">經驗丹數量</div><div class="v"><input id="eatCount" type="number" value="1"></div></div></div><div class="quick"><button id="calcEatPill" type="button">計算升等<small>例如單位填 100 代表 100 億</small></button></div><div id="eatPillResult"></div></div></section>`;
  }

  window.setJiang=function(kind){
    if(typeof openJiangMenuOnly==='function') openJiangMenuOnly();
    if(kind==='support')renderSupport();
    else if(kind==='compare')renderCompare();
    else if(kind==='stars')renderStars();
    else if(kind==='starAura')renderStarAura();
    else if(kind==='expPill')renderExpPill();
    else if(kind==='training' && typeof renderTrainingCalc==='function'){renderTrainingCalc();return;}
    closeMenu(); scrollTop();
  };

  window.calcSupport=function(){
    const picks=[]; let total=Object.fromEntries(stats().map(s=>[s,0]));
    for(let i=0;i<=4;i++){
      const n=$('jsN'+i)?.value||''; if(!n)continue; const s=Math.max(0,Math.min(20,Math.floor(N('jsS'+i,1)))); const a=getAbility(n,s); const rate=i===0?1:0.1; total=addAbility(total,a,rate); picks.push({n,s,i,a:scale(a,rate),rate});
    }
    if(!picks.length){ if(typeof empty==='function')empty('請至少選擇一位降神'); return; }
    const combos=typeof activeCombos==='function'?activeCombos(picks.map(p=>p.n)):[]; const bonus=typeof comboBonus==='function'?comboBonus(combos):{}; total=addAbility(total,bonus,1);
    $('reader').innerHTML=`<section class="card">${backBtn()}<h1>副降神模擬</h1><div class="muted">${picks.map(p=>`${E(p.i===0?'主降神':'副降神'+p.i)}：${E(p.n)} ${p.s}星${p.i===0?'':'（10%）'}`).join('、')}</div><h3>總能力</h3>${kvGrid(total)}<h3>成立連結</h3>${combos.length?combos.map(c=>`<div class="notice"><b>${E(c)}</b><br>${E(((DATA.comboMembers||{})[c]||[]).join('、'))}<br>${E(typeof comboText==='function'?comboText(c):'')}</div>`).join(''):'<div class="empty">沒有成立連結</div>'}<h3>各降神能力</h3>${picks.map(p=>`<div class="card" style="box-shadow:none"><h2>${E(p.i===0?'主降神':'副降神 '+p.i)}｜${E(p.n)}｜${p.s}星${p.i===0?'':'｜10%'}</h2>${kvGrid(p.a)}</div>`).join('')}</section>`; scrollTop();
  };
  window.calcCompare=function(){ const a=$('jsA')?.value,b=$('jsB')?.value;if(!a||!b){if(typeof empty==='function')empty('請選擇兩位降神');return;} const as=N('jsAS',20), bs=N('jsBS',20), A=getAbility(a,as), B=getAbility(b,bs); $('reader').innerHTML=`<section class="card">${backBtn()}<h1>主降神比較</h1><div class="tableWrap"><table><thead><tr><th>能力</th><th>${E(a)}</th><th>${E(b)}</th><th>差異</th></tr></thead><tbody>${stats().map(st=>`<tr><td>${E(st)}</td><td>${F(A[st])}</td><td>${F(B[st])}</td><td>${F((A[st]||0)-(B[st]||0))}</td></tr>`).join('')}</tbody></table></div></section>`; scrollTop(); };
  window.calcStars=function(){ const n=$('jsStarName')?.value||((DATA.displayNames||[])[0]); $('reader').innerHTML=`<section class="card">${backBtn()}<h1>${E(n)}｜0～20 星能力總表</h1><div class="tableWrap"><table><thead><tr><th>星等</th>${stats().map(st=>`<th>${E(st)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:21},(_,lv)=>{const a=getAbility(n,lv);return `<tr><td>${lv} 星</td>${stats().map(st=>`<td>${F(a[st])}</td>`).join('')}</tr>`}).join('')}</tbody></table></div></section>`; scrollTop(); };
  function starNeed(cur,tar){let t=0; for(let s=cur+1;s<=tar;s++)t+=Number(DATA.starRequirements?.[String(s)]?.single||0); return t;}
  function auraNeed(cur,tar){let t=0; for(let lv=cur+1;lv<=tar;lv++)t+=Number(DATA.auraTable?.[String(lv)]?.single||0); return t;}
  window.calcNeeds=function(){ const cur=Math.max(0,Math.min(20,Math.floor(N('needCur',0)))), tar=Math.max(cur,Math.min(20,Math.floor(N('needTar',20)))), owned=Math.max(0,Math.floor(N('needOwned',0))), rate=Math.max(1,Number($('needRate')?.value||1)); const raw=starNeed(cur,tar); const need=Math.max(0,Math.ceil((raw-owned)/rate)); const box=$('starNeedResult'); if(box)box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">星等區間</div><div class="v">${cur} 星 → ${tar} 星</div></div><div class="kv"><div class="k">原始需求</div><div class="v">${F(raw)} 顆</div></div><div class="kv"><div class="k">扣除已有 / 倍率後</div><div class="v">${F(need)} 顆</div></div></div>`; };
  window.calcStarAura=function(){ const cur=Math.max(1,Math.floor(N('auraCur',1))), tar=Math.max(cur,Math.floor(N('auraTar',cur))); const total=auraNeed(cur,tar); const box=$('auraNeedResult'); if(box)box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">等級區間</div><div class="v">${cur} → ${tar}</div></div><div class="kv"><div class="k">所需靈氣</div><div class="v">${F(total)}</div></div></div>`; };
  function expAt(lv){try{return BigInt(DATA.expTable?.[String(lv)]||0);}catch(e){return 0n;}}
  function ceilDiv(a,b){return (a+b-1n)/b;}
  window.calcExpNeed=function(){ const max=Math.max(...Object.keys(DATA.expTable||{}).map(Number).filter(Boolean),2000); const cur=Math.max(1,Math.min(max,Math.floor(N('expCur',1)))); const tar=Math.max(cur,Math.min(max,Math.floor(N('expTar',max)))); const need=expAt(tar)-expAt(cur); const safe=need>0n?need:0n; const rows=[['乙太經驗丹（8000億）',800000000000n],['聖鑽經驗丹（3000億）',300000000000n],['真元經驗丹（500億）',50000000000n]].map(([name,v])=>{const n=ceilDiv(safe,v);return `<tr><td>${E(name)}</td><td>${FB(n)} 顆</td><td>${FB(n/255n)} 組 + ${FB(n%255n)} 顆</td></tr>`}).join(''); const box=$('expNeedResult'); if(box)box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">等級區間</div><div class="v">${cur} → ${tar}</div></div><div class="kv"><div class="k">需要經驗</div><div class="v">${FB(safe)}</div></div></div><h3>經驗丹換算</h3><div class="tableWrap"><table><thead><tr><th>經驗丹</th><th>需要顆數</th><th>組數</th></tr></thead><tbody>${rows}</tbody></table></div>`; };
  window.calcEatPill=function(){ const max=Math.max(...Object.keys(DATA.expTable||{}).map(Number).filter(Boolean),2000); const start=Math.max(1,Math.min(max,Math.floor(N('eatStartLv',1)))); const unitYi=BigInt(Math.max(0,Math.floor(N('eatUnitYi',100)))); const count=BigInt(Math.max(0,Math.floor(N('eatCount',1)))); let total=expAt(start)+unitYi*100000000n*count; let lv=start; while(lv<max && expAt(lv+1)>0n && total>=expAt(lv+1))lv++; const rem=total-expAt(lv); const box=$('eatPillResult'); if(box)box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">現在等級</div><div class="v">${start}</div></div><div class="kv"><div class="k">可提升到</div><div class="v">${lv} 等</div></div><div class="kv"><div class="k">目前等級內剩餘經驗</div><div class="v">${FB(rem)}</div></div></div>`; };

  document.addEventListener('click',function(e){
    const jk=e.target.closest('[data-jiang]')?.dataset.jiang;
    if(jk){ e.preventDefault(); e.stopPropagation(); window.setJiang(jk); return; }
    const st=e.target.closest('[data-star-tab]'); if(st){e.preventDefault();e.stopPropagation();document.querySelectorAll('[data-star-tab]').forEach(b=>b.classList.remove('active'));st.classList.add('active'); const star=$('starTabNeed'), aura=$('starTabAura'); if(star)star.style.display=st.dataset.starTab==='star'?'block':'none'; if(aura)aura.style.display=st.dataset.starTab==='aura'?'block':'none'; return;}
    const et=e.target.closest('[data-exp-tab]'); if(et){e.preventDefault();e.stopPropagation();document.querySelectorAll('[data-exp-tab]').forEach(b=>b.classList.remove('active'));et.classList.add('active'); const need=$('expTabNeed'), eat=$('expTabEat'); if(need)need.style.display=et.dataset.expTab==='need'?'block':'none'; if(eat)eat.style.display=et.dataset.expTab==='eat'?'block':'none'; return;}
    const id=e.target.id; if(['calcSupport','calcCompare','calcStars','calcNeeds','calcStarAura','calcExpNeed','calcEatPill'].includes(id)){e.preventDefault();e.stopPropagation();window[id]();return;}
  },true);

  /* 防具部位排序修正：頭盔、鎧甲、護腕、鞋子/靴 */
  const oldEqRefreshFilters=window.eqRefreshFilters;
  window.eqRefreshFilters=function(){
    if(typeof oldEqRefreshFilters==='function') oldEqRefreshFilters();
    const sel=$('eqType'); if(!sel)return;
    const order=['劍','刀','拂塵','禪杖','暗器','槍','棍','斧頭','錘','盾','頭盔','鎧甲','護腕','鞋子','靴','飾品','仙器'];
    if((window.eqState?.main||'')==='防具') order.splice(0,order.length,'頭盔','鎧甲','護腕','鞋子','靴');
    const opts=[...sel.options].slice(1).sort((a,b)=>{let ia=order.indexOf(a.textContent.trim()), ib=order.indexOf(b.textContent.trim()); if(ia<0)ia=999;if(ib<0)ib=999; return ia-ib || a.textContent.localeCompare(b.textContent,'zh-Hant');});
    const cur=sel.value; sel.innerHTML=sel.options[0].outerHTML+opts.map(o=>o.outerHTML).join(''); sel.value=cur;
  };
})();

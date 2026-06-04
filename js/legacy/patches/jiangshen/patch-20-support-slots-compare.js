/* v88be: 副降神單組試算 + A~E 存檔 + 2~5 欄比較 */
(function(){
  const $ = (id)=>document.getElementById(id);
  const E = (s)=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const D = ()=>{ try{ if(typeof DATA!=='undefined') return DATA; }catch(e){} return window.DATA||{}; };
  const stats = ()=> (D().stats && D().stats.length ? D().stats : ['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']);
  const names = ()=> (D().displayNames && D().displayNames.length ? D().displayNames : Object.keys(D().baseStats||{}));
  const fmt = (n)=>{ const x=Math.ceil(Number(n||0)); try{return x.toLocaleString('zh-Hant');}catch(e){return String(x);} };
  const optionsNames = (blank=true)=> (blank?'<option value="">空白</option>':'') + names().map(n=>`<option value="${E(n)}">${E(n)}</option>`).join('');
  const starOptions = (sel=1)=>Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join('');
  function closeMenu(){ if(typeof closeDrawer==='function') closeDrawer(); }
  function scrollTop(){ try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);} }
  function getAbility(name,star){ if(typeof ability==='function') return ability(name,star)||{}; return {}; }
  function scale(a,rate=1){ const out={}; for(const st of stats()) out[st]=Math.ceil(Number(a?.[st]||0)*rate); return out; }
  function add(a,b){ const out={}; for(const st of stats()) out[st]=Math.ceil(Number(a?.[st]||0)+Number(b?.[st]||0)); return out; }
  function kvGrid(obj){ return `<div class="kvGrid">${stats().map(st=>`<div class="kv"><div class="k">${E(st)}</div><div class="v">${fmt(obj?.[st]||0)}</div></div>`).join('')}</div>`; }
  function emptyMsg(msg){ if(typeof empty==='function') empty(msg); else alert(msg); }
  function supportBackBtn(){ return '<button class="backBtn" type="button" onclick="setJiang(\'support\')">← 返回副降神試算</button>'; }

  const SLOT_KEY='szo_support_slots_v88be';
  const CUR_KEY='szo_support_current_v88be';
  const SLOT_LETTERS=['A','B','C','D','E'];
  function defaultSet(){ return Array.from({length:5},()=>({n:'',s:1})); }
  function readJson(k,def){ try{return JSON.parse(localStorage.getItem(k)||'')||def}catch(e){return def} }
  function writeJson(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function normalizeSet(set){ return Array.from({length:5},(_,i)=>({n:set?.[i]?.n||'',s:Math.max(0,Math.min(20,Math.floor(Number(set?.[i]?.s??1))))})); }
  function getSlots(){ const arr=readJson(SLOT_KEY,[]); return Array.from({length:5},(_,i)=>normalizeSet(Array.isArray(arr[i])?arr[i]:defaultSet())); }
  function setSlots(slots){ writeJson(SLOT_KEY,slots.map(normalizeSet)); }
  function getCurrent(){ return normalizeSet(readJson(CUR_KEY,defaultSet())); }
  function setCurrent(v){ writeJson(CUR_KEY,normalizeSet(v)); }
  function readPlan(prefix='P'){ return Array.from({length:5},(_,i)=>({n:$(prefix+'N'+i)?.value||'',s:Math.max(0,Math.min(20,Math.floor(Number($(prefix+'S'+i)?.value||1))))})); }
  function fillPlan(prefix,set){ normalizeSet(set).forEach((p,i)=>{ const n=$(prefix+'N'+i),s=$(prefix+'S'+i); if(n)n.value=p.n||''; if(s)s.value=String(p.s??1); }); }
  function slotSummary(set){ const parts=normalizeSet(set).filter(p=>p.n).map(p=>`${p.n}(${p.s})`); return parts.length?parts.join('、'):'空白'; }
  function saveCurrent(){ setCurrent(readPlan('P')); }
  function planHtml(prefix='P'){
    const opts=optionsNames(true), stars=starOptions(1);
    return `<div class="supportPlan"><h3>降神配置</h3>${Array.from({length:5},(_,i)=>`<div class="kv" style="margin-bottom:8px"><div class="k">${i===0?'主降神':'副降神 '+i}</div><div class="v"><select id="${prefix}N${i}" class="supportInput">${opts}</select><label>星等</label><select id="${prefix}S${i}" class="supportInput">${stars}</select></div></div>`).join('')}</div>`;
  }
  function slotOptions(selected=0){ const slots=getSlots(); return SLOT_LETTERS.map((x,i)=>`<option value="${i}" ${i===selected?'selected':''}>存檔 ${x}｜${E(slotSummary(slots[i]))}</option>`).join(''); }
  function calcPlan(set){
    let total=Object.fromEntries(stats().map(s=>[s,0])); const picks=[];
    for(let i=0;i<5;i++){
      const p=normalizeSet(set)[i]||{}; if(!p.n) continue;
      const raw=getAbility(p.n,p.s||1); const shown=scale(raw,i===0?1:0.1);
      total=add(total,shown); picks.push({i,n:p.n,s:p.s||1,a:shown});
    }
    const combos=typeof activeCombos==='function'?activeCombos(picks.map(p=>p.n)):[];
    if(typeof comboBonus==='function') total=add(total,scale(comboBonus(combos),1));
    return {total,picks,combos};
  }
  function picksText(res){ return res.picks.length?res.picks.map(p=>`${E(p.i===0?'主降神':'副降神'+p.i)}：${E(p.n)} ${p.s}星${p.i===0?'':'（10%）'}`).join('、'):'未選擇'; }
  function comboTextBlock(res){ return res.combos&&res.combos.length?res.combos.map(c=>`<div class="notice"><b>${E(c)}</b><br>${E(((D().comboMembers||{})[c]||[]).join('、'))}<br>${E(typeof comboText==='function'?comboText(c):'')}</div>`).join(''):'<div class="empty">沒有成立連結</div>'; }

  function renderSupport(){
    $('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>副降神試算</h2><div class="notice">主降神以 100% 能力計算；副降神 1～4 各 10%。可以直接試算，也可以存入 A～E 後到比較頁做 2～5 組比較。</div>${planHtml('P')}<div class="supportSaveBar"><button id="calcSupportOnce" type="button">直接試算</button><label style="margin:0">存檔到<select id="supportSaveSlot">${SLOT_LETTERS.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select></label><button id="saveSupportSlot" type="button">存檔</button><button id="openSupportCompare" type="button">開啟存檔比較</button></div><h3>目前存檔</h3><div id="supportSlotList" class="kvGrid"></div></section>`;
    fillPlan('P',getCurrent());
    document.querySelectorAll('.supportInput').forEach(el=>el.addEventListener('change',saveCurrent));
    refreshSlotList();
    $('calcSupportOnce').onclick=calcSupportOnce;
    $('saveSupportSlot').onclick=()=>{ const idx=Number($('supportSaveSlot').value||0); const slots=getSlots(); const plan=readPlan('P'); slots[idx]=plan; setSlots(slots); setCurrent(plan); refreshSlotList(); alert('已存入存檔 '+SLOT_LETTERS[idx]+'：'+slotSummary(plan)); };
    $('openSupportCompare').onclick=renderSupportCompare;
  }
  function refreshSlotList(){ const el=$('supportSlotList'); if(!el) return; const slots=getSlots(); el.innerHTML=SLOT_LETTERS.map((x,i)=>`<div class="kv"><div class="k">存檔 ${x}</div><div class="v">${E(slotSummary(slots[i]))}</div></div>`).join(''); }
  function calcSupportOnce(){
    saveCurrent(); const res=calcPlan(readPlan('P'));
    if(!res.picks.length){ emptyMsg('請至少選擇一隻降神'); return; }
    $('reader').innerHTML=`<section class="card">${supportBackBtn()}<h1>副降神試算結果</h1><div class="muted">${picksText(res)}</div><h3>總能力</h3>${kvGrid(res.total)}<h3>成立連結</h3>${comboTextBlock(res)}<h3>各降神能力</h3>${res.picks.map(p=>`<div class="card" style="box-shadow:none"><h2>${E(p.i===0?'主降神':'副降神 '+p.i)}｜${E(p.n)}｜${p.s}星${p.i===0?'':'｜10%'}</h2>${kvGrid(p.a)}</div>`).join('')}</section>`;
    scrollTop();
  }
  function compareSelectHtml(i){ return `<label>比較 ${i+1}<select id="cmpSlot${i}" class="supportCompareSelect"><option value="">不使用</option>${slotOptions()}</select></label>`; }
  function renderSupportCompare(){
    const slots=getSlots();
    $('reader').innerHTML=`<section class="card">${supportBackBtn()}<h1>副降神存檔比較</h1><div class="notice">選擇要比較的存檔。只選 2 組就顯示 2 欄；選 5 組就顯示 5 欄。</div><div class="supportSaveBar">${Array.from({length:5},(_,i)=>compareSelectHtml(i)).join('')}<button id="runSupportCompare" type="button">產生比較</button></div><h3>存檔內容</h3><div class="kvGrid">${SLOT_LETTERS.map((x,i)=>`<div class="kv"><div class="k">存檔 ${x}</div><div class="v">${E(slotSummary(slots[i]))}</div></div>`).join('')}</div><div id="supportCompareResult"></div></section>`;
    for(let i=0;i<5;i++){ const s=$('cmpSlot'+i); if(s) s.value=i<2?String(i):''; }
    $('runSupportCompare').onclick=runSupportCompare;
    runSupportCompare();
    scrollTop();
  }
  function runSupportCompare(){
    const slots=getSlots(); const selected=[];
    for(let i=0;i<5;i++){ const v=$('cmpSlot'+i)?.value; if(v!=='') selected.push(Number(v)); }
    const out=$('supportCompareResult'); if(!out) return;
    if(!selected.length){ out.innerHTML='<div class="empty">請至少選擇一組存檔</div>'; return; }
    const cols=selected.map((idx,j)=>({idx,label:'存檔 '+SLOT_LETTERS[idx],set:slots[idx],res:calcPlan(slots[idx])})).filter(c=>c.res.picks.length);
    if(!cols.length){ out.innerHTML='<div class="empty">選到的存檔沒有降神資料</div>'; return; }
    out.innerHTML=`<h3>總能力比較</h3><div class="tableWrap"><table><thead><tr><th>能力</th>${cols.map(c=>`<th>${E(c.label)}<br><small>${E(slotSummary(c.set))}</small></th>`).join('')}</tr></thead><tbody>${stats().map(st=>`<tr><td>${E(st)}</td>${cols.map(c=>`<td>${fmt(c.res.total[st]||0)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${cols.map(c=>`<h3>${E(c.label)} 成立連結</h3>${comboTextBlock(c.res)}`).join('')}`;
  }
  const oldSetJiang=window.setJiang;
  window.setJiang=function(kind){ if(kind==='support'){ renderSupport(); closeMenu(); scrollTop(); return; } if(typeof oldSetJiang==='function') return oldSetJiang(kind); };
})();

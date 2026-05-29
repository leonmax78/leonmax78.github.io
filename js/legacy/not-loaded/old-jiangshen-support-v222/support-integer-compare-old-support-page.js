// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88bb: 修副降神整數 + 主降神比較/20星清單空白 */
(function(){
  const $ = (id)=>document.getElementById(id);
  const E = (s)=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const D = ()=>{ try{ if(typeof DATA!=='undefined') return DATA; }catch(e){} return window.DATA||{}; };
  const num = (id,d=0)=>{ const el=$(id); const n=Number(el?el.value:d); return Number.isFinite(n)?n:d; };
  const fmt = (n)=>{ const x=Math.ceil(Number(n||0)); try{return x.toLocaleString('zh-Hant');}catch(e){return String(x);} };
  const fmtBig = (n)=>{ try{return BigInt(n||0).toLocaleString('zh-Hant');}catch(e){return String(n??'0');} };
  const title = '降神、經驗、修練試算';
  const stats = ()=> (D().stats && D().stats.length ? D().stats : ['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']);
  const names = ()=> (D().displayNames && D().displayNames.length ? D().displayNames : Object.keys(D().baseStats||{}));
  const optionsNames = (blank=true)=> (blank?'<option value="">空白</option>':'') + names().map(n=>`<option value="${E(n)}">${E(n)}</option>`).join('');
  const starOptions = (sel=20)=>Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join('');
  const backBtn = ()=> (typeof backButtonHTML==='function') ? backButtonHTML('jiang') : '<button class="backBtn" type="button" data-view="jiang">← 返回</button>';
  function closeMenu(){ if(typeof closeDrawer==='function') closeDrawer(); }
  function scrollTop(){ try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);} }
  function getAbility(name,star){ if(typeof ability==='function') return ability(name,star)||{}; return {}; }
  function intAbility(obj){ const out={}; for(const st of stats()) out[st]=Math.ceil(Number(obj?.[st]||0)); return out; }
  function addAbility(a,b,rate=1){ const out={}; for(const st of stats()) out[st]=Math.ceil(Number(a?.[st]||0) + Math.ceil(Number(b?.[st]||0)*rate)); return out; }
  function scaleAbility(a,rate=1){ const out={}; for(const st of stats()) out[st]=Math.ceil(Number(a?.[st]||0)*rate); return out; }
  function kvGrid(obj){ return `<div class="kvGrid">${stats().map(st=>`<div class="kv"><div class="k">${E(st)}</div><div class="v">${fmt(obj?.[st]||0)}</div></div>`).join('')}</div>`; }

  function renderSupport(){
    const opts=optionsNames(true), s1=starOptions(1);
    $('reader').innerHTML=`<section class="card"><h1>${title}</h1><h2>副降神模擬</h2><div class="notice">主降神以 100% 能力計算；副降神 1～4 以 10% 能力計算，顯示為整數。</div><div class="kvGrid"><div class="kv"><div class="k">主降神</div><div class="v"><select id="jsN0" class="jsSupportName">${opts}</select><label>星等</label><select id="jsS0">${s1}</select></div></div>${Array.from({length:4},(_,i)=>`<div class="kv"><div class="k">副降神 ${i+1}</div><div class="v"><select id="jsN${i+1}" class="jsSupportName">${opts}</select><label>星等</label><select id="jsS${i+1}">${s1}</select></div></div>`).join('')}</div><div class="quick"><button id="calcSupport" type="button">產生閱讀頁<small>主降神 100%，副降神 10%</small></button></div></section>`;
  }
  function renderCompare(){
    const opts=optionsNames(false), s20=starOptions(20);
    $('reader').innerHTML=`<section class="card"><h1>${title}</h1><h2>主降神比較</h2><div class="kvGrid"><div class="kv"><div class="k">降神 A</div><div class="v"><select id="jsA">${opts}</select><label>星等</label><select id="jsAS">${s20}</select></div></div><div class="kv"><div class="k">降神 B</div><div class="v"><select id="jsB">${opts}</select><label>星等</label><select id="jsBS">${s20}</select></div></div></div><div class="quick"><button id="calcCompare" type="button">產生比較頁<small>比較兩位主降神能力差異</small></button></div></section>`;
  }
  function renderStars(){
    $('reader').innerHTML=`<section class="card"><h1>${title}</h1><h2>20星等</h2><div class="kvGrid"><div class="kv"><div class="k">選擇降神</div><div class="v"><select id="jsStarName">${optionsNames(false)}</select></div></div></div><div class="quick"><button id="calcStars" type="button">產生 0～20 星能力總表<small>完整顯示各星等能力</small></button></div></section>`;
  }

  const oldSetJiang = window.setJiang;
  window.setJiang=function(kind){
    if(kind==='support'){renderSupport(); closeMenu(); scrollTop(); return;}
    if(kind==='compare'){renderCompare(); closeMenu(); scrollTop(); return;}
    if(kind==='stars'){renderStars(); closeMenu(); scrollTop(); return;}
    if(typeof oldSetJiang==='function') return oldSetJiang(kind);
  };

  window.calcSupport=function(){
    const picks=[]; let total=Object.fromEntries(stats().map(s=>[s,0]));
    for(let i=0;i<=4;i++){
      const n=$('jsN'+i)?.value||''; if(!n) continue;
      const s=Math.max(0,Math.min(20,Math.floor(num('jsS'+i,1))));
      const raw=getAbility(n,s); const rate=i===0?1:0.1; const shown=scaleAbility(raw,rate);
      total=addAbility(total,raw,rate); picks.push({n,s,i,a:shown});
    }
    if(!picks.length){ if(typeof empty==='function') empty('請至少選擇一位降神'); return; }
    const combos=typeof activeCombos==='function'?activeCombos(picks.map(p=>p.n)):[];
    const bonus=typeof comboBonus==='function'?comboBonus(combos):{}; total=addAbility(total,bonus,1);
    $('reader').innerHTML=`<section class="card">${backBtn()}<h1>副降神模擬</h1><div class="muted">${picks.map(p=>`${E(p.i===0?'主降神':'副降神'+p.i)}：${E(p.n)} ${p.s}星${p.i===0?'':'（10%）'}`).join('、')}</div><h3>總能力</h3>${kvGrid(total)}<h3>成立連結</h3>${combos.length?combos.map(c=>`<div class="notice"><b>${E(c)}</b><br>${E(((D().comboMembers||{})[c]||[]).join('、'))}<br>${E(typeof comboText==='function'?comboText(c):'')}</div>`).join(''):'<div class="empty">沒有成立連結</div>'}<h3>各降神能力</h3>${picks.map(p=>`<div class="card" style="box-shadow:none"><h2>${E(p.i===0?'主降神':'副降神 '+p.i)}｜${E(p.n)}｜${p.s}星${p.i===0?'':'｜10%'}</h2>${kvGrid(p.a)}</div>`).join('')}</section>`; scrollTop();
  };
  window.calcCompare=function(){
    const a=$('jsA')?.value,b=$('jsB')?.value; if(!a||!b){ if(typeof empty==='function') empty('請選擇兩位降神'); return; }
    const A=intAbility(getAbility(a,Math.floor(num('jsAS',20)))), B=intAbility(getAbility(b,Math.floor(num('jsBS',20))));
    $('reader').innerHTML=`<section class="card">${backBtn()}<h1>主降神比較</h1><div class="tableWrap"><table><thead><tr><th>能力</th><th>${E(a)}</th><th>${E(b)}</th><th>差異</th></tr></thead><tbody>${stats().map(st=>`<tr><td>${E(st)}</td><td>${fmt(A[st])}</td><td>${fmt(B[st])}</td><td>${fmt((A[st]||0)-(B[st]||0))}</td></tr>`).join('')}</tbody></table></div></section>`; scrollTop();
  };
  window.calcStars=function(){
    const n=$('jsStarName')?.value||names()[0]||''; if(!n){ if(typeof empty==='function') empty('沒有降神資料'); return; }
    $('reader').innerHTML=`<section class="card">${backBtn()}<h1>${E(n)}｜0～20 星能力總表</h1><div class="tableWrap"><table><thead><tr><th>星等</th>${stats().map(st=>`<th>${E(st)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:21},(_,lv)=>{const a=intAbility(getAbility(n,lv));return `<tr><td>${lv} 星</td>${stats().map(st=>`<td>${fmt(a[st])}</td>`).join('')}</tr>`}).join('')}</tbody></table></div></section>`; scrollTop();
  };
})();

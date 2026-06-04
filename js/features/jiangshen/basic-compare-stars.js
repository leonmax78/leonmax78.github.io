// V331: Jiangshen main compare + 0~20 star table with clean UTF-8 labels.
// Support simulation is handled by support-slots-compare.js.
(function(){
  const $ = id => document.getElementById(id);
  const E = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const D = () => { try { if(typeof DATA !== 'undefined') return DATA; } catch(e){} return window.DATA || {}; };
  const stats = () => (D().stats && D().stats.length ? D().stats : ['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']);
  const names = () => (D().displayNames && D().displayNames.length ? D().displayNames : Object.keys(D().baseStats || {}));
  const fmt = n => {
    const x = Math.ceil(Number(n || 0));
    try { return x.toLocaleString('zh-Hant'); } catch(e){ return String(x); }
  };
  const optionsNames = (blank=true) => (blank ? '<option value="">請選擇</option>' : '') + names().map(n => `<option value="${E(n)}">${E(n)}</option>`).join('');
  const starOptions = (sel=20) => Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join('');

  function closeMenu(){
    try{ if(typeof closeDrawer === 'function') closeDrawer(); }catch(e){}
  }
  function scrollTop(){
    try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
  }
  function getAbility(name, star){
    if(typeof ability === 'function') return ability(name, star) || {};
    return {};
  }
  function intAbility(a){
    const out = {};
    for(const st of stats()) out[st] = Math.ceil(Number(a?.[st] || 0));
    return out;
  }
  function backBtn(kind){
    const target = kind === 'stars' ? 'stars' : 'compare';
    const label = target === 'stars' ? '返回20星等選取' : '返回主降神比較選取';
    return `<button class="backBtn" type="button" onclick="setJiang('${target}')">← ${label}</button>`;
  }

  function renderCompare(){
    const r = $('reader'); if(!r) return;
    r.innerHTML = `<section class="card">
      <h1>降神、經驗、修練試算</h1>
      <h2>主降神比較</h2>
      <div class="kvGrid">
        <div class="kv comparePickCard"><div class="k">降神 A</div><div class="v"><select id="jsA">${optionsNames()}</select><label>星等</label><select id="jsAS">${starOptions(20)}</select></div></div>
        <div class="kv comparePickCard"><div class="k">降神 B</div><div class="v"><select id="jsB">${optionsNames()}</select><label>星等</label><select id="jsBS">${starOptions(20)}</select></div></div>
      </div>
      <div class="quick"><button id="calcCompare" type="button">計算比較<small>比較兩位主降神的能力差異</small></button></div>
    </section>`;
  }
  function renderStars(){
    const r = $('reader'); if(!r) return;
    r.innerHTML = `<section class="card">
      <h1>降神、經驗、修練試算</h1>
      <h2>20 星等</h2>
      <div class="kvGrid"><div class="kv"><div class="k">選擇降神</div><div class="v"><select id="jsStarName">${optionsNames(false)}</select></div></div></div>
      <div class="quick"><button id="calcStars" type="button">產生 0 ~ 20 星能力總表<small>完整顯示各星等能力</small></button></div>
    </section>`;
  }

  const oldSetJiang = window.setJiang;
  window.setJiang = function(kind){
    if(kind === 'compare'){ renderCompare(); closeMenu(); scrollTop(); return; }
    if(kind === 'stars'){ renderStars(); closeMenu(); scrollTop(); return; }
    if(typeof oldSetJiang === 'function') return oldSetJiang(kind);
  };

  window.calcCompare = function(){
    const a = $('jsA')?.value || '', b = $('jsB')?.value || '';
    if(!a || !b){
      if(typeof empty === 'function') empty('請選擇兩位降神');
      else alert('請選擇兩位降神');
      return;
    }
    const as = Number($('jsAS')?.value || 20), bs = Number($('jsBS')?.value || 20);
    const A = intAbility(getAbility(a, as)), B = intAbility(getAbility(b, bs));
    const r = $('reader'); if(!r) return;
    r.innerHTML = `<section class="card">${backBtn('compare')}
      <h1>主降神比較</h1>
      <div class="compareNameRow">
        <div class="compareNameCard"><span>降神 A</span><b>${E(a)}</b><small>${as} 星</small></div>
        <div class="compareNameCard alt"><span>降神 B</span><b>${E(b)}</b><small>${bs} 星</small></div>
      </div>
      <div class="tableWrap"><table class="compareTable"><thead><tr><th>能力</th><th>${E(a)}</th><th>${E(b)}</th><th>差異</th></tr></thead><tbody>
      ${stats().map(st=>{
        const av = Number(A[st] || 0), bv = Number(B[st] || 0);
        const max = Math.max(av, bv);
        return `<tr><td>${E(st)}</td><td class="${av===max&&max>0?'supportBest':''}">${fmt(av)}</td><td class="${bv===max&&max>0?'supportBest':''}">${fmt(bv)}</td><td>${fmt(av-bv)}</td></tr>`;
      }).join('')}
      </tbody></table></div>
    </section>`;
    scrollTop();
  };

  window.calcStars = function(){
    const n = $('jsStarName')?.value || names()[0] || '';
    if(!n){ if(typeof empty === 'function') empty('沒有降神資料'); return; }
    const r = $('reader'); if(!r) return;
    r.innerHTML = `<section class="card">${backBtn('stars')}
      <h1>${E(n)}｜0 ~ 20 星能力總表</h1>
      <div class="tableWrap"><table><thead><tr><th>星等</th>${stats().map(st=>`<th>${E(st)}</th>`).join('')}</tr></thead><tbody>
      ${Array.from({length:21},(_,lv)=>{
        const a = intAbility(getAbility(n,lv));
        return `<tr><td>${lv} 星</td>${stats().map(st=>`<td>${fmt(a[st])}</td>`).join('')}</tr>`;
      }).join('')}
      </tbody></table></div>
    </section>`;
    scrollTop();
  };

  document.addEventListener('click', function(e){
    const id = e.target && e.target.id;
    if(id === 'calcCompare' || id === 'calcStars'){
      e.preventDefault();
      e.stopPropagation();
      if(typeof window[id] === 'function') window[id]();
    }
  }, true);
})();

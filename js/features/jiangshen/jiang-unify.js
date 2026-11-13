// V764: one look for the whole 降神 section — section tabs on every page, 主降神比較 and
// 20星能力總表 with the portrait picker, and live results on 星等/靈氣 and 等級/經驗丹.
(function(){
  const $ = id => document.getElementById(id);
  const E = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const D = () => { try{ if(typeof DATA !== 'undefined') return DATA; }catch(e){} return window.DATA || {}; };
  const stats = () => (D().stats && D().stats.length ? D().stats : ['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']);
  const label = st => (window.SZO_DISPLAY && window.SZO_DISPLAY.label ? window.SZO_DISPLAY.label(st) : st);
  const fmt = n => { const x = Math.ceil(Number(n || 0)); try{ return x.toLocaleString('zh-Hant'); }catch(e){ return String(x); } };
  const H = () => window.SZO_JIANG_HEADS || {info:{}, series:[], img:() => ''};
  const shown = n => { const h = H().info[n]; return !!h && !h[3]; };
  const allNames = () => (D().displayNames && D().displayNames.length ? D().displayNames : Object.keys(D().baseStats || {}));
  const heroes = () => allNames().filter(shown).sort((a,b) => (H().info[a]||[])[2] - (H().info[b]||[])[2]);
  const abilityOf = (n, s) => { try{ return typeof ability === 'function' ? (ability(n, s) || {}) : {}; }catch(e){ return {}; } };
  const read = (k, d) => { try{ return JSON.parse(localStorage.getItem(k) || '') ?? d; }catch(e){ return d; } };
  const write = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };

  const SECTIONS = [
    ['support', '副降神試算', ['support','recommend','supportCompare']],
    ['compare', '主降神比較', ['compare']],
    ['stars', '20星能力總表', ['stars']],
    ['starAura', '星等／靈氣', ['starAura']],
    ['expPill', '等級／經驗丹', ['expPill']],
    ['training', '修練', ['training']]
  ];
  const navHTML = kind => `<nav class="jsNav" aria-label="降神功能">${SECTIONS.map(([k,l,group]) => `<button type="button" class="${group.includes(kind) ? 'active' : ''}" data-js-nav="${k}">${l}</button>`).join('')}</nav>`;
  window.SZO_JIANG_NAV = navHTML;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-js-nav]');
    if(!b) return;
    e.preventDefault();
    window.setJiang(b.dataset.jsNav);
  });
  function addNav(kind){
    const sec = document.querySelector('#reader > section, #reader section.card');
    if(!sec || sec.querySelector('.jsNav')) return;
    sec.classList.add('jsSection');
    const h1 = sec.querySelector('h1');
    const nav = document.createElement('div'); nav.innerHTML = navHTML(kind);
    const el = nav.firstChild;
    if(h1 && h1.textContent.includes('降神、經驗、修練試算')) h1.after(el);
    else sec.prepend(el);
    const act = el.querySelector('.active'); if(act) el.scrollLeft = Math.max(0, act.offsetLeft - 16);
  }

  // ---------- shared portrait picker ----------
  function pickerHTML(st, opts){
    const q = (st.q || '').trim();
    const list = heroes().filter(n => (!q || n.includes(q)) && (!st.series || (H().info[n] || [])[1] === st.series));
    const count = k => heroes().filter(n => (H().info[n] || [])[1] === k).length;
    return `<aside class="jsSide">
      <div class="jsSideHead">${opts.head}</div>
      <input id="juSearch" type="search" placeholder="搜尋降神名稱" value="${E(st.q || '')}">
      <div class="jsSeries">${['', ...H().series].map(k => `<button type="button" class="${(st.series||'')===k?'active':''}" data-ju-series="${E(k)}">${k ? E(k) + `<small>${count(k)}</small>` : '全部'}</button>`).join('')}</div>
      <div class="jsHeroList">${opts.clear ? '<button type="button" class="clear" data-ju-hero=""><span>清除此欄</span></button>' : ''}${list.map(n => `<button type="button" class="${opts.current===n ? 'active' : ''}" data-ju-hero="${E(n)}" ${opts.used && opts.used.includes(n) && opts.current!==n ? 'disabled title="已放在其他欄位"' : ''}>${H().img(n,'jsHeroFace')}<span>${E(n)}</span></button>`).join('')}${list.length ? '' : '<small class="muted">沒有符合的降神</small>'}</div>
      ${opts.stars ? `<div class="jsLabel">星等</div><div class="jsStars">${Array.from({length:21},(_,i)=>`<button type="button" class="${opts.star===i ? 'active' : ''}" data-ju-star="${i}">${i}</button>`).join('')}</div>` : ''}
    </aside>`;
  }
  function bindPicker(st, rerender, onHero, onStar){
    const r = $('reader');
    r.querySelectorAll('[data-ju-series]').forEach(b => b.onclick = () => { st.series = b.dataset.juSeries; rerender(); });
    r.querySelectorAll('[data-ju-hero]').forEach(b => b.onclick = () => { onHero(b.dataset.juHero); rerender(); });
    r.querySelectorAll('[data-ju-star]').forEach(b => b.onclick = () => { onStar(Number(b.dataset.juStar)); rerender(); });
    const s = $('juSearch');
    if(s) s.oninput = () => { st.q = s.value; const pos = s.selectionStart; rerender(); const s2 = $('juSearch'); s2.focus(); try{ s2.setSelectionRange(pos,pos); }catch(e){} };
  }
  const keepScroll = fn => () => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  // ---------- 主降神比較 ----------
  const CMP_KEY = 'szo_jiang_main_compare_v2';
  const cmpState = {q:'', series:'', active:0};
  function renderCompare(){
    const r = $('reader'); if(!r) return;
    const picks = (read(CMP_KEY, null) || []).concat(Array(5).fill(null)).slice(0,5).map(p => p && p.n ? {n:p.n, s:Number(p.s ?? 20)} : {n:'', s:20});
    const save = () => write(CMP_KEY, picks);
    const cur = picks[cmpState.active];
    const vals = picks.map(p => p.n ? abilityOf(p.n, p.s) : null);
    const filled = vals.filter(Boolean).length;
    const best = Object.fromEntries(stats().map(st => [st, Math.max(...vals.filter(Boolean).map(v => Math.ceil(Number(v[st]||0))), 0)]));
    r.innerHTML = `<section class="card jsPage"><h1>降神、經驗、修練試算</h1>
      <div class="jsLayout">
        ${pickerHTML(cmpState, {head:`正在設定：<b>降神 ${'ABCDE'[cmpState.active]}</b>`, current:cur.n, used:picks.map(p=>p.n), clear:true, stars:true, star:cur.s})}
        <div class="jsMain">
          <div class="jsCards">${picks.map((p,i) => `<button type="button" class="jsCard ${i===cmpState.active?'active':''} ${p.n?'':'empty'}" data-ju-slot="${i}">
            <span class="jsCardRole">降神 ${'ABCDE'[i]}</span>
            <span class="jsCardFace">${p.n ? H().img(p.n,'') + `<span class="jsCardStar">${p.s} 星</span>` : '<span class="jsCardPlus">＋</span>'}</span>
            <span class="jsCardName">${p.n ? E(p.n) : '點這裡選降神'}</span>
            ${p.n ? `<span class="jsCardStats">${stats().map(st => { const v = Math.ceil(Number(vals[i][st]||0)); return `<span class="${v ? '' : 'zero'} ${filled>1 && v>0 && v===best[st] ? 'best' : ''}"><i>${E(label(st))}</i><b>${fmt(v)}</b></span>`; }).join('')}</span>` : ''}
          </button>`).join('')}</div>
          <div class="muted jsHint">${filled > 1 ? '每項能力最高的降神以金色標示。點卡片可換該欄的降神或星等。' : '選兩隻以上降神就會自動比較，最高值以金色標示。'}</div>
        </div>
      </div>
      <div class="jsActions"><button type="button" id="juClear">全部清空</button></div>
    </section>`;
    addNav('compare');
    const rerender = keepScroll(renderCompare);
    r.querySelectorAll('[data-ju-slot]').forEach(b => b.onclick = () => { cmpState.active = Number(b.dataset.juSlot); rerender(); if(window.matchMedia('(max-width:820px)').matches) document.querySelector('.jsSide')?.scrollIntoView({behavior:'smooth',block:'start'}); });
    bindPicker(cmpState, rerender, n => {
      picks[cmpState.active].n = n; save();
      if(n){ const next = picks.findIndex((p,i) => i > cmpState.active && !p.n); if(next >= 0) cmpState.active = next; }
    }, s => { picks[cmpState.active].s = s; save(); });
    $('juClear').onclick = () => { write(CMP_KEY, []); cmpState.active = 0; rerender(); };
  }

  // ---------- 20星能力總表 ----------
  const STAR_KEY = 'szo_jiang_star_table_v1';
  const starState = {q:'', series:''};
  function renderStars(){
    const r = $('reader'); if(!r) return;
    let n = read(STAR_KEY, '');
    if(!n || !D().baseStats || !D().baseStats[n]) n = heroes()[0] || '';
    const rows = Array.from({length:21}, (_,lv) => abilityOf(n, lv));
    r.innerHTML = `<section class="card jsPage"><h1>降神、經驗、修練試算</h1>
      <div class="jsLayout jsStarsLayout">
        ${pickerHTML(starState, {head:'選一隻降神，右邊顯示 0～20 星的能力', current:n})}
        <div class="jsMain">
          ${n ? `<div class="jsStarHead"><span class="jsCardFace">${H().img(n,'')}</span><div><b>${E(n)}</b><small>${E((H().info[n]||[])[1] || '')}</small><small>0～20 星能力總表（主降神 100% 數值）</small></div></div>
          <div class="tableWrap"><table class="compareTable jsStarTable"><thead><tr><th>星等</th>${stats().map(st => `<th>${E(label(st))}</th>`).join('')}</tr></thead><tbody>
          ${rows.map((a,lv) => `<tr class="${lv===20 ? 'top' : lv%5===0 ? 'step' : ''}"><td>${lv} 星</td>${stats().map(st => `<td>${fmt(a[st])}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">沒有降神資料</div>'}
        </div>
      </div>
    </section>`;
    addNav('stars');
    const rerender = keepScroll(renderStars);
    bindPicker(starState, rerender, name => { if(name) write(STAR_KEY, name); if(window.matchMedia('(max-width:820px)').matches) setTimeout(() => document.querySelector('.jsStarHead')?.scrollIntoView({behavior:'smooth',block:'start'}), 30); }, () => {});
  }

  // ---------- live 星等／靈氣、等級／經驗丹 ----------
  const LIVE = {
    starAura: [['needCur','needTar','needOwned','needRate','calcNeeds'], ['auraCur','auraTar','calcStarAura']],
    expPill: [['expCur','expTar','calcExpNeed'], ['eatStartLv','eatUnitYi','eatCount','calcEatPill']]
  };
  function makeLive(kind){
    const sec = document.querySelector('#reader section'); if(!sec) return;
    sec.classList.add('jsLive');
    (LIVE[kind] || []).forEach(group => {
      const fn = group[group.length-1];
      const run = () => { try{ if(typeof window[fn] === 'function') window[fn](); }catch(e){} };
      group.slice(0,-1).forEach(id => { const el = $(id); if(el){ el.addEventListener('input', run); el.addEventListener('change', run); } });
      const btn = $(fn); if(btn) btn.closest('.quick')?.classList.add('jsLiveHide');
      run();
    });
  }

  // pages that render late or re-render themselves (修練) still get the nav
  let lastKind = '';
  const watch = () => {
    const r = $('reader'); if(!r || r.__juObs) return;
    r.__juObs = new MutationObserver(() => {
      const h1 = r.querySelector('h1');
      if(lastKind && h1 && h1.textContent.includes('降神、經驗、修練試算') && !r.querySelector('.jsNav')) addNav(lastKind);
    });
    r.__juObs.observe(r, {childList:true});
  };
  const prev = window.setJiang;
  window.setJiang = function(kind){
    lastKind = SECTIONS.some(s => s[2].includes(kind)) ? kind : '';
    watch();
    if(kind === 'compare'){ renderCompare(); try{ closeDrawer(); }catch(e){} window.scrollTo({top:0,behavior:'smooth'}); return; }
    if(kind === 'stars'){ renderStars(); try{ closeDrawer(); }catch(e){} window.scrollTo({top:0,behavior:'smooth'}); return; }
    const out = typeof prev === 'function' ? prev(kind) : undefined;
    if(SECTIONS.some(s => s[2].includes(kind))){
      addNav(kind);
      if(LIVE[kind]) makeLive(kind);
    }
    return out;
  };
})();

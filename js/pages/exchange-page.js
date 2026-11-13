// 兌換查詢: what to bring, which NPC, what you get. Data: data/exchanges.json (owner-approved list).
(function(){
  'use strict';
  const MATS_TAB = '常用拆解';
  const state = { tab: MATS_TAB, pick: '', query: '', more: 0 };
  const PAGE = 300;
  let dataPromise = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => { v = String(v ?? ''); if(window.SZO_LANGUAGE) v = window.SZO_LANGUAGE.toSimple(v); return v.toLowerCase().replace(/[\s　]+/g, ''); };

  function load(){
    if(!dataPromise){
      const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
      dataPromise = fetch('data/exchanges.json?v=' + v, { cache: 'force-cache' })
        .then(r => { if(!r.ok) throw Error('兌換資料載入失敗'); return r.json(); })
        .catch(e => { dataPromise = null; throw e; });
    }
    return dataPromise;
  }

  const item = ([name, qty, id]) => `${id ? `<button type="button" class="exItem" data-ex-item="${id}">${esc(name)}</button>` : `<span class="exItem plain">${esc(name)}</span>`}${qty > 1 ? `<span class="exQty">×${Number(qty).toLocaleString()}</span>` : ''}`;
  const items = list => list.map(item).join('<span class="exPlus">＋</span>');
  const rowHTML = r => `<li class="exRow"><span class="exGive">${r.m.length ? items(r.m) : '<span class="exItem plain">—</span>'}</span><b class="exArrow">→</b><span class="exGet">${items(r.r)}</span>${r.c ? `<small class="exTag">${esc(r.c)}</small>` : ''}${r.l ? `<small class="exTag dim">${esc(r.l)}</small>` : ''}</li>`;
  const placesHTML = npc => npc.p.map(([sid, nid, stage, x, y]) => `<button type="button" class="exPlace" data-ex-npc="${sid}:${nid}" title="看 NPC 對話與地圖位置">${esc(stage)} <small>(${x}, ${y})</small></button>`).join('');

  // rows → NPC blocks → sub-groups (選單／分類)
  function blocksHTML(data, rows, showVer){
    const byNpc = new Map();
    for(const r of rows){ if(!byNpc.has(r.p)) byNpc.set(r.p, []); byNpc.get(r.p).push(r); }
    let shown = 0; const limit = PAGE * (state.more + 1); let out = '';
    for(const [p, list] of byNpc){
      if(shown >= limit) break;
      const npc = data.npcs[p];
      const groups = new Map();
      for(const r of list){ if(shown >= limit) break; const g = r.g || ''; if(!groups.has(g)) groups.set(g, []); groups.get(g).push(r); shown++; }
      out += `<section class="exNpc"><header><h3>${esc(npc.n)}</h3>${showVer ? `<span class="exVer">${esc(list[0].v)}</span>` : ''}<div class="exPlaces">${placesHTML(npc)}</div></header>
        ${[...groups].map(([g, rs]) => `${g ? `<h4>${esc(g)}</h4>` : ''}<ul class="exRows">${rs.map(rowHTML).join('')}</ul>`).join('')}</section>`;
    }
    if(rows.length > limit) out += `<button type="button" class="ghost exMore" data-ex-more>顯示更多（還有 ${rows.length - limit} 筆）</button>`;
    return out || '<div class="empty">沒有符合的兌換。</div>';
  }

  async function renderExchangePage(){
    const reader = document.getElementById('reader');
    if(!reader) return;
    let data;
    try{ data = await load(); }catch(e){ reader.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const tabs = [MATS_TAB, ...data.vers];
    if(!tabs.includes(state.tab)) state.tab = MATS_TAB;
    const q = norm(state.query);
    let chips = '', body = '';
    if(q){
      const hit = data.rows.filter(r => r.m.some(x => norm(x[0]).includes(q)) || r.r.some(x => norm(x[0]).includes(q)) || norm(data.npcs[r.p].n).includes(q));
      body = `<p class="questCount">「${esc(state.query)}」找到 ${hit.length} 筆 <button type="button" class="ghost" data-ex-clear>清除搜尋</button></p>${blocksHTML(data, hit, true)}`;
    }else if(state.tab === MATS_TAB){
      const counts = data.mats.map(([m]) => [m, data.rows.filter(r => r.r.some(x => x[0] === m)).length]).filter(([, n]) => n);
      if(!counts.some(([m]) => m === state.pick)) state.pick = counts[0]?.[0] || '';
      chips = counts.map(([m, n]) => `<button type="button" class="${m === state.pick ? 'active' : ''}" data-ex-pick="${esc(m)}">${esc(m)}<b>${n}</b></button>`).join('');
      const rows = data.rows.filter(r => r.r.some(x => x[0] === state.pick));
      body = `<p class="muted exHint">想要「${esc(state.pick)}」：拿左邊的東西去找 NPC 換。</p>${blocksHTML(data, rows, true)}`;
    }else{
      const rows = data.rows.filter(r => r.v === state.tab);
      const npcCount = new Map();
      for(const r of rows) npcCount.set(r.p, (npcCount.get(r.p) || 0) + 1);
      if(!npcCount.has(Number(state.pick))) state.pick = String([...npcCount.keys()][0] ?? '');
      chips = [...npcCount].map(([p, n]) => `<button type="button" class="${String(p) === String(state.pick) ? 'active' : ''}" data-ex-pick="${p}">${esc(data.npcs[p].n)}<b>${n}</b></button>`).join('');
      body = blocksHTML(data, rows.filter(r => String(r.p) === String(state.pick)), false);
    }
    reader.innerHTML = `<section class="questPage exPage">
      <div class="questHero"><h1>兌換查詢</h1><p class="muted">什麼東西找誰換什麼。點道具看資料，點地點看 NPC 對話與地圖位置。</p>
        <input id="exSearch" class="questSearch" type="search" placeholder="搜尋道具或 NPC（例如：皇龍虹鉻、藥煉之菁、敖姬）" value="${esc(state.query)}"></div>
      ${q ? '' : `<div class="questTabs exTabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" class="${t === state.tab ? 'active' : ''}" data-ex-tab="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="questGroups">${chips}</div>`}
      <div class="exList">${body}</div>
    </section>`;
  }
  window.renderExchangePage = renderExchangePage;

  let timer = 0;
  document.addEventListener('input', ev => {
    if(ev.target?.id !== 'exSearch') return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.query = ev.target.value.trim(); state.more = 0;
      const pos = ev.target.selectionStart;
      await renderExchangePage();
      const input = document.getElementById('exSearch');
      if(input){ input.focus(); try{ input.setSelectionRange(pos, pos); }catch(e){} }
    }, 250);
  });
  document.addEventListener('click', ev => {
    const t = ev.target;
    if(!t.closest?.('.exPage')) return;
    const tab = t.closest('[data-ex-tab]');
    if(tab){ state.tab = tab.dataset.exTab; state.pick = ''; state.more = 0; renderExchangePage(); return; }
    const pick = t.closest('[data-ex-pick]');
    if(pick){ state.pick = pick.dataset.exPick; state.more = 0; renderExchangePage(); return; }
    if(t.closest('[data-ex-more]')){ state.more++; renderExchangePage(); return; }
    if(t.closest('[data-ex-clear]')){ state.query = ''; state.more = 0; renderExchangePage(); return; }
    const it = t.closest('[data-ex-item]');
    if(it){ ev.preventDefault(); window.SZO_PREVIEW?.open('item', it.dataset.exItem); return; }
    const npc = t.closest('[data-ex-npc]');
    if(npc){ ev.preventDefault(); window.SZO_PREVIEW?.open('npc', npc.dataset.exNpc); }
  });
})();

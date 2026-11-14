// Quest guide built from the game's MISSION.INI (data/quests.json, tools/build_quests.py).
(function(){
  const state = { cat: '資料片任務', group: '', cls: '劍俠', query: '', open: new Set() };
  const CLASSES = ['劍俠', '勇士', '術者', '道人', '僧侶'];
  // 職業任務 is split by class first, then by city
  const inCat = (x, data) => x.c === state.cat && (state.cat !== '職業任務' || x.cl === state.cls);
  let dataPromise = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => { v = String(v ?? ''); if(window.SZO_LANGUAGE) v = window.SZO_LANGUAGE.toSimple(v); return v.toLowerCase().replace(/[\s　]+/g, ''); };
  const LINK = /⟦(-?\d+),(\d+),(-?\d+),(-?\d+),([^⟧]*)⟧/g;

  function loadQuests(){
    if(!dataPromise){
      const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
      dataPromise = fetch('data/quests.json?v=' + v, { cache: 'force-cache' }).then(r => { if(!r.ok) throw Error('任務資料載入失敗'); return r.json(); })
        .then(d => { d.byId = new Map(d.quests.map(q => [q.i, q])); return d; })
        .catch(e => { dataPromise = null; throw e; });
    }
    return dataPromise;
  }
  window.loadQuestData = loadQuests;

  const plain = s => String(s || '').replace(LINK, (_, st, id, x, y, name) => name);

  // Item names inside quest text become buttons that open the item preview; hand-in amounts
  // from the NPC dialogue (q.ho) are noted after the name, and a shared name ending such as
  // 「真元碎片」 gets the whole set noted once (六種真元碎片 各 ×5（月服）／×20（免服）).
  function qtyNotes(q){
    const byName = new Map(), groups = [];
    const ho = (q?.ho || []).filter(([, n, qty]) => n && qty);
    for(const [, n, qty] of ho) if(!byName.has(n)) byName.set(n, qty);
    const byQty = new Map();
    for(const [n, qty] of byName) (byQty.get(qty) || byQty.set(qty, []).get(qty)).push(n);
    for(const [qty, names] of byQty){
      if(names.length < 2) continue;
      let suf = names[0];
      for(const n of names) while(suf && !n.endsWith(suf)) suf = suf.slice(1);
      if(suf.length >= 3) groups.push({ suf, qty, names });
    }
    return { byName, groups };
  }
  function itemLinker(list, notes){
    const items = (list || []).filter(([id, n]) => id && n).sort((a,b) => b[1].length - a[1].length);
    const monsters = new Map((notes?.mons || []).map(([n, st]) => [n, st]));
    for(const n of monsters.keys()) if(!items.some(([, x]) => x === n)) items.push(['m', n]);
    items.sort((a,b) => b[1].length - a[1].length);
    const qtyHTML = t => `<small class="questQty">${esc(t)}</small>`;
    const groupNote = s => {
      let html = esc(s).replace(/\n/g, '<br>');
      for(const g of notes?.groups || []){
        if(!s.includes(g.suf) || g.names.some(n => s.includes(n))) continue;
        const i = html.indexOf(esc(g.suf));
        if(i >= 0) html = html.slice(0, i + esc(g.suf).length) + qtyHTML(` ${g.names.length} 種各 ${g.qty}`) + html.slice(i + esc(g.suf).length);
      }
      return html;
    };
    if(!items.length) return groupNote;
    const ids = new Map(items.map(([id, n]) => [n, id]));
    const re = new RegExp(items.map(([, n]) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
    return s => {
      let out = '', last = 0;
      String(s).replace(re, (m, at) => {
        if(ids.get(m) === 'm'){
          const st = monsters.get(m), sn = notes.stages?.[st] || '';
          out += groupNote(s.slice(last, at)) + `<button type="button" class="questMonLink" title="${esc(sn ? `${sn}・點擊開啟地圖` : '點擊開啟地圖')}" data-quest-map="${esc(sn)}" data-quest-map-name="${esc(m)}" data-quest-map-npc="">${esc(m)}</button>`;
          last = at + m.length; return m;
        }
        out += groupNote(s.slice(last, at)) + `<button type="button" class="questItemLink" data-quest-item="${esc(ids.get(m))}">${esc(m)}</button>`;
        const qty = notes?.byName.get(m);
        // Only when the text does not already give the amount right after the name.
        if(qty && (/（/.test(qty) || !/^\s*[\d０-９*×xX]/.test(s.slice(at + m.length)))) out += qtyHTML(qty);
        last = at + m.length; return m;
      });
      return out + groupNote(s.slice(last));
    };
  }

  function richText(text, data, q){
    let out = '', last = 0;
    text = String(text || '');
    const link = itemLinker([...(q?.it || []), ...(q?.ri || []), ...(q?.ho || []).map(([id, n]) => [id, n])], Object.assign(qtyNotes(q), { mons: q?.mo || [], stages: data.stages }));
    text.replace(LINK, (m, st, id, x, y, name, at) => {
      out += link(text.slice(last, at));
      last = at + m.length;
      let stageName = data.stages[st] || '';
      if(!Number(id) && Object.values(data.stages).includes(name)){
        // The link names a map itself: one chip that opens that map.
        out += `<button type="button" class="questMapLink" title="點擊開啟地圖" data-quest-map="${esc(name)}" data-quest-map-name="" data-quest-map-npc="">${esc(name)}</button>`;
        return m;
      }
      if(Number(id)){
        const xy = Number(x) || Number(y) ? ` (${x}, ${y})` : '';
        out += `<button type="button" class="questNpc" title="${esc(`${stageName}${xy}・點擊看對話與地圖位置`)}" data-quest-npc="${esc(st)}:${esc(id)}">${esc(name)}</button>`;
        return m;
      }else{
        // A place (no NPC): the game's own coordinates from the quest file, as shown in game.
        const has = Number(x) || Number(y);
        out += stageName
          ? `<button type="button" class="questMapLink" title="${esc(`${stageName}${has ? ` (${x}, ${y})` : ''}・點擊在地圖上標出位置`)}" data-quest-map="${esc(stageName)}" data-quest-map-name="${esc(name)}" data-quest-map-npc=""${has ? ` data-quest-map-x="${esc(x)}" data-quest-map-y="${esc(y)}"` : ''}>${esc(name)}</button>`
          : `<b class="questPlace">${esc(name)}</b>`;
        if(has) out += `<small class="questGameXY" title="遊戲內座標">(${esc(x)}, ${esc(y)})</small>`;
        return m;
      }
    });
    out += link(text.slice(last));
    return out;
  }

  function limits(q){
    const out = [];
    if(q.tag) out.push(q.tag);
    if(q.lv || q.mx) out.push(q.mx ? `等級 ${q.lv || 1}～${q.mx}` : `等級 ${q.lv}+`);
    if(q.cl) out.push('限' + q.cl);
    if(q.sx) out.push('限' + q.sx + '性');
    if(q.fm) out.push(q.fm);
    if(q.rp) out.push('可重解');
    if(q.tm) out.push('組隊任務');
    return out;
  }

  function questBodyHTML(q, data){
    const items = (q.it || []).map(([id, name]) => id ? `<button type="button" class="questItem" data-quest-item="${esc(id)}">${esc(name)}</button>` : `<span class="questItem">${esc(name)}</span>`).join('');
    return `<div class="questBody">
      ${q.d ? `<p class="questStart"><span>開始</span>${richText(q.d, data, q)}</p>` : ''}
      ${q.s.length ? `<ol class="questSteps">${q.s.map((s, i) => { const tg = (q.tg || []).find(t => t[0] === i); const pts = (q.pt || []).filter(t => t[0] === i); return `<li>${richText(s, data, q)}${pts.length ? `<div class="questSpots"><span>地點</span>${pts.map(([, st, x, y, msg]) => `<div class="questSpot"><button type="button" class="questCoord" title="在地圖上標出位置" data-quest-map="${esc(data.stages[st] || '')}" data-quest-map-name="觸發點" data-quest-map-npc="" data-quest-map-x="${esc(x)}" data-quest-map-y="${esc(y)}">${esc(data.stages[st] || '')}</button><b class="questSpotXY">(${esc(x)}, ${esc(y)})</b>${msg ? `<small>「${esc(msg)}」</small>` : ''}</div>`).join('')}</div>` : ''}${tg ? `<div class="questTargets"><span>對象</span>${tg[1].map(([st, id, nm]) => `<button type="button" class="questNpc" title="${esc(`${data.stages[st] || ''}・點擊看對話與地圖位置`)}" data-quest-npc="${esc(st)}:${esc(id)}">${esc(nm)}</button>`).join('<i>、</i>')}</div>` : ''}</li>`; }).join('')}</ol>` : ''}
      ${(q.ho || []).length ? `<div class="questMeta"><b>繳交道具與數量</b><ul class="questHandins">${q.ho.map(([id, n, qty, who]) => `<li>${id ? `<button type="button" class="questItemLink" data-quest-item="${esc(id)}">${esc(n)}</button>` : esc(n)} <span>${esc(qty).replace(/（(月服|免服)）/g, '<em class="questSrv" data-srv="$1">$1</em>')}</span>${who ? ` <small>${esc(who)}</small>` : ''}</li>`).join('')}</ul></div>` : ''}
      ${items ? `<div class="questMeta"><b>任務道具</b><div class="questItems">${items}</div></div>` : ''}
      ${q.r ? `<div class="questMeta"><b>獎勵${q.rx ? '<small class="questRewardNote">依選擇或結果不同，以下擇一</small>' : ''}</b><ul class="questRewards">${q.r.map(r => `<li>${itemLinker(q.ri)(r).replace(/（(月服|免服)）/g, '<em class="questSrv" data-srv="$1">$1</em>')}</li>`).join('')}</ul></div>` : ''}
      ${q.pre ? `<div class="questMeta"><b>前置任務</b><div class="questItems">${q.pre.map(n => `<button type="button" class="questItem" data-quest-find="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>` : ''}
    </div>`;
  }

  // V780: the closed card already tells level, where it starts, how long it is and what it pays
  function questFactsHTML(q, data){
    const start = (String(q.d || '').match(/⟦\d+,\d+,\d+,\d+,([^⟧]+)⟧/) || [])[1];
    const where = data && data.stages ? data.stages[q.m] : '';
    const reward = (q.r || []).join('、').replace(/（(月服|免服)）/g, '');
    const facts = [
      q.lv ? `<span class="qfLv">Lv.${esc(q.lv)}</span>` : '',
      start || where ? `<span class="qfFrom">${esc([where, start].filter(Boolean).join('・'))}</span>` : '',
      q.s && q.s.length ? `<span>${q.s.length} 個步驟</span>` : '',
      reward ? `<span class="qfReward" title="${esc(reward)}">${esc(reward.length > 40 ? reward.slice(0, 40) + '…' : reward)}</span>` : ''
    ].filter(Boolean);
    return facts.length ? `<span class="questFacts">${facts.join('')}</span>` : '';
  }
  function questHeadHTML(q, data){
    return `<span class="questName">${esc(q.n)}</span><span class="questTags">${limits(q).map(t => `<em${t === '主線任務' ? ' class="questMainTag"' : ''}>${esc(t)}</em>`).join('')}</span>${questFactsHTML(q, data)}`;
  }

  window.renderQuestPreviewHTML = async function(id){
    const data = await loadQuests();
    const q = data.byId.get(Number(id));
    if(!q) throw Error('找不到這個任務');
    return `<div class="itemGroupedDetail questPreview"><h1>${esc(q.n)}</h1><div class="questTags">${[q.c + '・' + q.g, ...limits(q)].map(t => `<em${t === '主線任務' ? ' class="questMainTag"' : ''}>${esc(t)}</em>`).join('')}</div>${questBodyHTML(q, data)}</div>`;
  };

  // Items → quests that use or mention them (search).
  window.szoQuestRows = async function(raw, limit){
    const q = norm(raw); if(q.length < 2) return [];
    const data = await loadQuests();
    const out = [], seen = new Set();
    const push = (quest, why) => { if(seen.has(quest.i)) return; seen.add(quest.i); out.push({ kind: 'quest', id: quest.i, label: quest.n, sub: `${why}${quest.lv ? '・Lv.' + quest.lv : ''}・${quest.c === '資料片任務' ? quest.g : (data.stages[quest.m] || quest.g)}` }); };
    for(const quest of data.quests) if(norm(quest.n) === q) push(quest, quest.c);
    for(const quest of data.quests) if((quest.it || []).some(([, n]) => norm(n) === q)) push(quest, `需要／取得「${raw.trim()}」`);
    for(const quest of data.quests) if(norm(quest.n).includes(q)) push(quest, quest.c);
    for(const quest of data.quests) if((quest.it || []).some(([, n]) => norm(n).includes(q))) push(quest, '任務道具：' + quest.it.filter(([, n]) => norm(n).includes(q)).map(x => x[1]).slice(0, 2).join('、'));
    return limit ? out.slice(0, limit) : out;
  };

  function filtered(data){
    const q = norm(state.query);
    if(q){
      return data.quests.filter(x => norm(x.n).includes(q) || norm(plain(x.d) + plain(x.s.join(''))).includes(q) || (x.it || []).some(([, n]) => norm(n).includes(q)));
    }
    return data.quests.filter(x => inCat(x, data) && (!state.group || x.g === state.group));
  }

  async function renderQuestPage(){
    const reader = document.getElementById('reader');
    if(!reader) return;
    let data;
    try{ data = await loadQuests(); }catch(e){ reader.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const groups = (data.groups[state.cat] || []).filter(g => data.quests.some(x => inCat(x, data) && x.g === g));
    const classRow = state.cat === '職業任務' ? `<div class="questGroups questClasses">${CLASSES.map(c => `<button type="button" class="${c === state.cls ? 'active' : ''}" data-quest-cls="${esc(c)}">${esc(c)}<b>${data.quests.filter(x => x.c === state.cat && x.cl === c).length}</b></button>`).join('')}</div>` : '';
    if(state.group && !groups.includes(state.group)) state.group = '';
    if(!state.group && !state.query) state.group = groups[0] || '';
    const list = filtered(data);
    // a small group opens its quests right away instead of leaving one closed bar
    if(!state.query && list.length <= 3) list.forEach(q => state.open.add(q.i));
    reader.innerHTML = `<section class="questPage">
      <div class="questHero"><h1>任務查詢</h1><p class="muted">資料取自遊戲任務檔，點 NPC 名稱看對話，點怪物或地點名稱直接在地圖上顯示位置。</p>
        <input id="questSearch" class="questSearch" type="search" placeholder="搜尋任務、NPC 或任務道具（例如：黑狗血）" value="${esc(state.query)}"></div>
      ${state.query ? `<p class="questCount">「${esc(state.query)}」找到 ${list.length} 個任務 <button type="button" class="ghost" data-quest-clear>清除搜尋</button></p>` : `
      <div class="questTabs" role="tablist">${data.cats.map(c => `<button type="button" role="tab" class="${c === state.cat ? 'active' : ''}" data-quest-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${classRow}<div class="questGroups">${groups.map(g => `<button type="button" class="${g === state.group ? 'active' : ''}" data-quest-group="${esc(g)}">${esc(g)}<b>${data.quests.filter(x => inCat(x, data) && x.g === g).length}</b></button>`).join('')}</div>`}
      <div class="questList">${list.slice(0, 200).map(q => `<details class="questCard${q.tag === '主線任務' ? ' questMain' : ''}" data-quest-id="${q.i}"${state.open.has(q.i) ? ' open' : ''}><summary>${questHeadHTML(q, data)}${state.query ? `<small>${esc(q.c)}・${esc(q.g)}</small>` : ''}</summary>${state.open.has(q.i) ? questBodyHTML(q, data) : ''}</details>`).join('') || '<div class="empty">沒有符合的任務。</div>'}</div>
      ${list.length > 200 ? `<p class="muted">只顯示前 200 筆，請輸入更精確的關鍵字。</p>` : ''}
    </section>`;
  }
  window.renderQuestPage = renderQuestPage;
  window.openQuestPage = async function(query){
    state.query = query || '';
    if(typeof window.setView === 'function') await window.setView('quest');
  };

  let searchTimer = 0;
  document.addEventListener('input', ev => {
    if(ev.target?.id !== 'questSearch') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      state.query = ev.target.value.trim();
      const pos = ev.target.selectionStart;
      await renderQuestPage();
      const input = document.getElementById('questSearch');
      if(input){ input.focus(); try{ input.setSelectionRange(pos, pos); }catch(e){} }
    }, 250);
  });
  document.addEventListener('toggle', async ev => {
    const card = ev.target;
    if(!card?.matches?.('.questCard')) return;
    const id = Number(card.dataset.questId);
    if(card.open){
      state.open.add(id);
      if(!card.querySelector('.questBody')){ const data = await loadQuests(); card.insertAdjacentHTML('beforeend', questBodyHTML(data.byId.get(id), data)); }
    }else state.open.delete(id);
  }, true);
  document.addEventListener('click', async ev => {
    const t = ev.target;
    const cat = t.closest?.('[data-quest-cat]');
    if(cat){ state.cat = cat.dataset.questCat; state.group = ''; renderQuestPage(); return; }
    const cls = t.closest?.('[data-quest-cls]');
    if(cls){ state.cls = cls.dataset.questCls; renderQuestPage(); return; }
    const group = t.closest?.('[data-quest-group]');
    if(group){ state.group = group.dataset.questGroup; renderQuestPage(); return; }
    if(t.closest?.('[data-quest-clear]')){ state.query = ''; renderQuestPage(); return; }
    const find = t.closest?.('[data-quest-find]');
    if(find){
      ev.preventDefault();
      const data = await loadQuests();
      const q = data.quests.find(x => x.n === find.dataset.questFind);
      if(q) window.SZO_PREVIEW?.open('quest', q.i);
      return;
    }
    const item = t.closest?.('[data-quest-item]');
    if(item){ ev.preventDefault(); window.SZO_PREVIEW?.open('item', item.dataset.questItem); return; }
    const npc = t.closest?.('[data-quest-npc]');
    if(npc){ ev.preventDefault(); window.SZO_PREVIEW?.open('npc', npc.dataset.questNpc); return; }
    const map = t.closest?.('[data-quest-map]');
    if(map){
      ev.preventDefault();
      if(typeof window.ensureMapPageLoaded === 'function') await window.ensureMapPageLoaded();
      const point = map.dataset.questMapX ? { x: map.dataset.questMapX, y: map.dataset.questMapY } : undefined;
      await window.openMapSearchLocation?.(map.dataset.questMap, map.dataset.questMapName, map.dataset.questMapNpc || undefined, point);
    }
  });
})();

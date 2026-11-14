// 技能查詢: five classes + crossover skills, built from the game files by tools/build_skills.py.
(function(){
  'use strict';
  const state = { sheet: '劍俠', group: '', query: '', view: (() => { try{ return localStorage.getItem('szo_skill_view') || 'card'; }catch(e){ return 'card'; } })() };
  let dataPromise = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => { v = String(v ?? ''); if(window.SZO_LANGUAGE) v = window.SZO_LANGUAGE.toSimple(v); return v.toLowerCase().replace(/[\s　]+/g, ''); };

  function loadSkills(){
    if(!dataPromise){
      const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
      dataPromise = fetch('data/skills.json?v=' + v, { cache: 'force-cache' }).then(r => { if(!r.ok) throw Error('技能資料載入失敗'); return r.json(); })
        .catch(e => { dataPromise = null; throw e; });
    }
    return dataPromise;
  }
  window.loadSkillData = loadSkills;

  const itemLink = ([id, name, qty]) => `${id ? `<button type="button" class="skillItem" data-skill-item="${esc(id)}">${esc(name)}</button>` : esc(name)}${qty ? `<span class="skillQty">×${esc(qty)}</span>` : ''}`;

  function howHTML(s){
    return (s.how || []).map(h => {
      if(h.q) return `<li>完成任務「<button type="button" class="skillQuest" data-skill-quest="${esc(h.q[0])}" title="看任務內容">${esc(h.q[1])}</button>」</li>`;
      if(h.t) return `<li>${esc(h.t)}</li>`;
      const bits = [];
      if(h.cls) bits.push(`<b class="skillWho">${esc(h.cls)}</b>`);
      if(h.lv) bits.push(`Lv${esc(h.lv)}`);
      if(h.items) bits.push('交 ' + h.items.map(itemLink).join('、'));
      return `<li>${bits.join(' ')}</li>`;
    }).join('');
  }

  function placesHTML(s){
    return (s.pl || []).map(p => `<button type="button" class="skillPlace" data-skill-npc="${esc(p.s)}:${esc(p.n)}" title="${esc(`${p.m} (${p.x}, ${p.y})・點擊看對話與地圖位置`)}"><span>${esc(p.m)}</span>${esc(p.nm)}${p.lv ? `<small>Lv${esc(p.lv)}</small>` : ''}</button>`).join('');
  }

  function cardHTML(s, showSheet){
    const facts = [
      ['學習等級', s.lv ? (String(s.lv).includes('～') ? `${s.lv}（每 2 級學 1 招）` : s.lv) : ''],
      ['職等', s.rk ? `${s.rk} 轉` : ''],
      ['可學職業', (s.cl || []).join('、')],
      ['法器', s.tool ? itemLink(s.tool) : ''],
      ['武器限制', s.w || ''],
      ['回氣', s.cd ? `${s.cd} 秒` : ''],
      ['施法範圍', s.ca || ''],
      ['命中範圍', s.hr || ''],
      ['消耗精力', s.mp || ''],
    ].filter(([, v]) => v !== '' && v != null);
    return `<article class="skillCard${s.aw ? ' skillAwake' : ''}">
      <header>${s.ic ? `<img class="skillIcon" src="assets/test-media/skill-icons/${esc(s.ic)}.png" alt="" width="32" height="32" loading="lazy">` : ''}<h3>${esc(s.n)}</h3><span class="skillTier">${esc(s.t)}</span>${showSheet ? `<small>${esc(s.k)}</small>` : ''}${s.aw ? '<span class="skillTag">限覺醒狀態</span>' : ''}</header>
      <dl class="skillFacts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${typeof v === 'string' && v.includes('<button') ? v : esc(v)}</dd></div>`).join('')}</dl>
      ${s.h ? `<p class="skillHelp">${esc(s.h)}</p>` : ''}
      <div class="skillLearn"><div><b>學習方式</b><ul>${howHTML(s)}</ul></div>
        ${(s.pl || []).length ? `<div><b>學習地點</b><div class="skillPlaces">${placesHTML(s)}</div></div>` : ''}</div>
      ${s.nt ? `<p class="skillNote">※ ${esc(s.nt)}</p>` : ''}
    </article>`;
  }

  // V780: compact list — one line per skill, tap to open the full card
  function rowHTML(s, showSheet){
    const place = (s.pl || [])[0];
    return `<details class="skillRow${s.aw ? ' skillAwake' : ''}"><summary>
      ${s.ic ? `<img class="skillIcon" src="assets/test-media/skill-icons/${esc(s.ic)}.png" alt="" width="28" height="28" loading="lazy">` : '<span class="skillIcon"></span>'}
      <b class="srName">${esc(s.n)}</b>
      <span class="srTier">${esc(showSheet ? s.k + '・' + s.t : s.t)}</span>
      <span class="srLv">${s.lv ? 'Lv' + esc(String(s.lv).replace(/（.*$/, '')) : ''}</span>
      <span class="srTool">${s.tool ? esc(s.tool[1]) : ''}</span>
      <span class="srMp">${s.mp ? '精力 ' + esc(s.mp) : ''}</span>
      <span class="srPlace">${place ? esc(place.m + '・' + place.nm) + ((s.pl || []).length > 1 ? ` 等 ${s.pl.length} 處` : '') : ''}</span>
    </summary>${cardHTML(s, showSheet)}</details>`;
  }

  function groupsOf(data){
    const rows = data.skills.filter(s => s.k === state.sheet);
    const order = state.sheet === '聯動' ? data.ips : state.sheet === '通用' ? ['通用'] : data.tiers;
    return order.map(t => [t, rows.filter(s => s.t === t).length]).filter(([, n]) => n);
  }

  async function renderSkillPage(){
    const reader = document.getElementById('reader');
    if(!reader) return;
    let data;
    try{ data = await loadSkills(); }catch(e){ reader.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const groups = groupsOf(data);
    if(!groups.some(([t]) => t === state.group)) state.group = groups[0]?.[0] || '';
    const q = norm(state.query);
    const list = q
      ? data.skills.filter(s => norm(s.n).includes(q) || norm(s.h).includes(q) || norm(s.tool?.[1]).includes(q)
          || (s.how || []).some(h => (h.items || []).some(it => norm(it[1]).includes(q)) || norm(h.q?.[1]).includes(q)))
      : data.skills.filter(s => s.k === state.sheet && s.t === state.group);
    reader.innerHTML = `<section class="questPage skillPage">
      <div class="questHero"><h1>技能查詢</h1><p class="muted">資料取自遊戲技能檔與職業導師、NPC 對話。點道具看資料，點學習地點看 NPC 對話與地圖位置。</p>
        <input id="skillSearch" class="questSearch" type="search" placeholder="搜尋技能、法器或秘笈（例如：萬劍歸宗、龍虎相鬥圖）" value="${esc(state.query)}"></div>
      ${q ? `<p class="questCount">「${esc(state.query)}」找到 ${list.length} 個技能 <button type="button" class="ghost" data-skill-clear>清除搜尋</button></p>` : `
      <div class="questTabs" role="tablist">${data.sheets.map(k => `<button type="button" role="tab" class="${k === state.sheet ? 'active' : ''}" data-skill-sheet="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="questGroups">${groups.map(([t, n]) => `<button type="button" class="${t === state.group ? 'active' : ''}" data-skill-group="${esc(t)}">${esc(t)}<b>${n}</b></button>`).join('')}</div>`}
      <div class="skillViewToggle" role="group" aria-label="顯示方式"><button type="button" data-skill-view="card" class="${state.view === 'card' ? 'active' : ''}">完整卡片</button><button type="button" data-skill-view="list" class="${state.view === 'list' ? 'active' : ''}">精簡列表</button></div>
      <div class="skillList${state.view === 'list' ? ' skillRows' : ''}">${list.slice(0, 150).map(s => state.view === 'list' ? rowHTML(s, !!q) : cardHTML(s, !!q)).join('') || '<div class="empty">沒有符合的技能。</div>'}</div>
      ${list.length > 150 ? '<p class="muted">只顯示前 150 筆，請輸入更精確的關鍵字。</p>' : ''}
    </section>`;
  }
  window.renderSkillPage = renderSkillPage;

  let timer = 0;
  document.addEventListener('input', ev => {
    if(ev.target?.id !== 'skillSearch') return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.query = ev.target.value.trim();
      const pos = ev.target.selectionStart;
      await renderSkillPage();
      const input = document.getElementById('skillSearch');
      if(input){ input.focus(); try{ input.setSelectionRange(pos, pos); }catch(e){} }
    }, 250);
  });
  document.addEventListener('click', ev => {
    const t = ev.target;
    const sheet = t.closest?.('[data-skill-sheet]');
    if(sheet){ state.sheet = sheet.dataset.skillSheet; state.group = ''; renderSkillPage(); return; }
    const group = t.closest?.('[data-skill-group]');
    if(group){ state.group = group.dataset.skillGroup; renderSkillPage(); return; }
    const view = t.closest?.('[data-skill-view]');
    if(view){ state.view = view.dataset.skillView; try{ localStorage.setItem('szo_skill_view', state.view); }catch(e){} renderSkillPage(); return; }
    if(t.closest?.('[data-skill-clear]')){ state.query = ''; renderSkillPage(); return; }
    const item = t.closest?.('[data-skill-item]');
    if(item){ ev.preventDefault(); window.SZO_PREVIEW?.open('item', item.dataset.skillItem); return; }
    const quest = t.closest?.('[data-skill-quest]');
    if(quest){ ev.preventDefault(); window.SZO_PREVIEW?.open('quest', quest.dataset.skillQuest); return; }
    const npc = t.closest?.('[data-skill-npc]');
    if(npc){ ev.preventDefault(); window.SZO_PREVIEW?.open('npc', npc.dataset.skillNpc); }
  });
})();

// 兌換查詢: what to bring, which NPC, what you get. Data: data/exchanges.json (owner-approved list).
(function(){
  'use strict';
  const MATS_TAB = '常用拆解';
  const state = { tab: MATS_TAB, map: '', pick: '', query: '', more: 0 };
  const CITIES = ['京城', '祁州城', '玄州城', '鬼城'];
  // An NPC standing in two or more main cities is listed once under 三城共通.
  const mapOf = npc => { const st = [...new Set(npc.p.map(p => p[2]))]; return st.filter(s => CITIES.includes(s)).length >= 2 ? '三城共通' : (st.find(s => CITIES.includes(s)) || st[0] || ''); };
  const PAGE = 600;
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
  const rowHTML = r => `<li class="exRow"><span class="exGive">${r.m.length ? items(r.m) : '<span class="exItem plain">—</span>'}</span><b class="exArrow">→</b><span class="exGet">${r.pick ? '<small class="exTag dim">任選一</small>' + r.r.map(item).join('<span class="exPlus">／</span>') : items(r.r)}</span>${r.c ? `<small class="exTag">${esc(r.c)}</small>` : ''}${r.l ? `<small class="exTag dim">${esc(r.l)}</small>` : ''}</li>`;
  const placesHTML = npc => npc.p.map(([sid, nid, stage, x, y]) => `<button type="button" class="exPlace" data-ex-npc="${sid}:${nid}" title="看 NPC 對話與地圖位置">${esc(stage)} <small>(${x}, ${y})</small></button>`).join('');

  // Many equipment pieces that all give the same thing (拆解 a whole set) read as one line:
  // 「玄宙武觀特仕神裝 第一階（任一件，共 12 件）→ 皇龍虹鉻 ×8」.
  const sig = list => list.map(x => x[0] + '×' + x[1]).join('|');
  // 「玉旭戰鑑神兵，最終第 5 階拆解」→「玉旭神兵第五階」、「帝星流特仕神裝， 2 星級」→「帝星流特仕 2 星」
  const ZHN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function shortName(g){
    const s = String(g || '').replace(/\s+/g, '').replace(/^(拆解|升級|進化|晉升)/, '');
    const [head, rest = ''] = s.split(/[，,]/);
    if(!head) return '以下任一件';
    const star = head.match(/^.{1,2}流/); const series = star ? star[0] : head.slice(0, 2);
    const kind = ['特仕', '神兵', '稀有防具', '防具飾品', '防具、飾品', '防具', '飾品'].find(k => head.includes(k)) || head.slice(series.length).replace(/裝備$/, '');
    let m = (rest + head).match(/第([一二三四五六七八九十\d]+)階/);
    const lv = m ? `第${ZHN[Number(m[1])] || m[1]}階` : ((m = (rest + head).match(/(\d+)星級/)) ? `${m[1]}星` : '');
    return lv ? series + kind + lv : head.replace(/(拆解|升級|升階|兌換|晉升)$/, '');
  }
  // common tail of the item names, e.g. 圓弧霜白寶石Ⅰ / 三角橄欖寶石Ⅰ → 寶石Ⅰ
  const head = names => { let t = names[0] || ''; for(const n of names) while(t && !n.startsWith(t)) t = t.slice(0, -1); return t; };
  let IV = {};
  // 新星之驚雷劍、新星之火魄刀… → 新星武器；same level → 222級武器
  function setName(many, g){
    const names = many.map(m => m[0]), info = many.map(m => IV[m[2]]);
    const kind = info.every(x => x) ? (info.every(x => x[1]) ? '武器' : '裝備') : '';
    if(/第[一二三四五六七八九十\d]+階|\d+星級/.test(String(g || '').replace(/\s+/g, ''))) return shortName(g);
    const pre = head(names).replace(/[之‧·]+$/, '');
    if(kind && pre.length >= 2) return pre + kind;
    if(kind && info.every(x => x[0] && x[0] === info[0][0])) return info[0][0] + '級' + kind;
    const t = tail(names);
    return t.length >= 3 ? t : shortName(g);
  }
  const tail = names => { let t = names[0] || ''; for(const n of names) while(t && !n.endsWith(t)) t = t.slice(1); return t; };
  function collapse(rs){
    const out = [], byKey = new Map();
    for(const r of rs){
      // same rewards and same other materials, only the first material differs
      // …or an upgrade of the same piece (騰陽威冕Ⅰ → 騰陽威冕Ⅱ, 圓弧霜白寶石Ⅰ → 圓弧霜白寶石Ⅱ)
      const up = r.m.length && r.r.length === 1 && r.m[0][0].length > 1 && r.m[0][0].slice(0, -1) === r.r[0][0].slice(0, -1);
      // 「將劍聖冑第四階升級至第五階」: every piece of one tier step is one line
      const tt = String(r.g || '').replace(/\s+/g, '').match(/第([一二三四五六七八九十\d]+)階升級至(?:終極|最終)?第([一二三四五六七八九十\d]+)階/);
      if(tt && r.m.length && r.r.length === 1){
        const k = ['T', tt[1], tt[2], r.m[0][1], sig(r.m.slice(1)), r.r[0][1], r.c || '', r.l || ''].join('#');
        if(!byKey.has(k)){ const box = { set: [], step: tt }; byKey.set(k, box); out.push(box); }
        byKey.get(k).set.push(r); continue;
      }
      const key = !r.m.length ? null : r.g + '#' + (up
        ? ['UP', r.m[0][1], sig(r.m.slice(1)), r.r[0][1], r.m[0][0] === r.r[0][0] ? '=' : r.m[0][0].slice(-1) + r.r[0][0].slice(-1), r.c || '', r.l || ''].join('#')
        : [r.m[0][1], sig(r.m.slice(1)), sig(r.r), r.c || '', r.l || ''].join('#'));
      if(key === null){ out.push(r); continue; }
      if(!byKey.has(key)){ const box = { set: [] }; byKey.set(key, box); out.push(box); }
      byKey.get(key).set.push(r);
    }
    return out.flatMap(x => {
      if(!x.set) return [x];
      if(x.set.length < (x.step ? 2 : 3)) return x.set;
      const many = x.set.map(r => r.m[0]);
      const t = tail(many.map(m => m[0]));
      if(x.step) return [{ ...x.set[0], many, rest: x.set[0].m.slice(1), label: `第${x.step[1]}階`, stepN: tier(`第${x.step[1]}階`), r: [[`第${x.step[2]}階（同款）`, x.set[0].r[0][1], 0]] }];
      const row = { ...x.set[0], many, rest: x.set[0].m.slice(1), label: setName(many, x.set[0].g) };
      const r0 = x.set[0];
      if(r0.r.length === 1 && r0.m[0][0].slice(0, -1) === r0.r[0][0].slice(0, -1)){
        const rt = tail(x.set.map(r => r.r[0][0]));
        row.r = [[r0.m[0][0] === r0.r[0][0] ? (/光效/.test(r0.g) ? '原裝備（換光效）' : '原裝備') : rt.length >= 3 ? '同款' + rt : '同款下一階', r0.r[0][1], 0]];
      }
      return [row];
    });
  }
  // One line for the whole set, the pieces listed underneath as a note (first few, tap for all).
  const manyHTML = r => {
    const names = r.many.map(x => x[0]);
    const short = names.slice(0, 6).join('、') + (names.length > 6 ? `…等 ${names.length} 件` : '');
    return `<li class="exRow"><span class="exGive"><span class="exItem plain">${esc(r.label)}</span>${r.many[0][1] > 1 ? `<span class="exQty">×${Number(r.many[0][1]).toLocaleString()}</span>` : ''}<small class="exTag dim">任一件</small>${r.rest.length ? '<span class="exPlus">＋</span>' + items(r.rest) : ''}</span><b class="exArrow">→</b><span class="exGet">${items(r.r)}</span>${r.c ? `<small class="exTag">${esc(r.c)}</small>` : ''}${r.l ? `<small class="exTag dim">${esc(r.l)}</small>` : ''}`
      + `<details class="exSetNote"><summary>包含：${esc(short)}</summary><div>${r.many.map(x => item([x[0], 1, x[2]])).join('、')}</div></details></li>`;
  };

  // 高階在前: 第四階 > 第一階, 3 星級 > 1 星級, Ⅵ > Ⅰ
  const ZH = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const ROMAN = { Ⅰ: 1, Ⅱ: 2, Ⅲ: 3, Ⅳ: 4, Ⅴ: 5, Ⅵ: 6, Ⅶ: 7, Ⅷ: 8, Ⅸ: 9, Ⅹ: 10 };
  const zhNum = t => { if(/^\d+$/.test(t)) return Number(t); let n = 0, cur = 0; for(const ch of t){ if(ch === '十'){ n += (cur || 1) * 10; cur = 0; } else cur = ZH[ch] || 0; } return n + cur; };
  function tier(text){
    const s = String(text || '').replace(/\s+/g, '');
    let m = s.match(/第([一二三四五六七八九十\d]+)[階重]/) || s.match(/([一二三四五六七八九十\d]+)星級/) || s.match(/品級(\d+)/) || s.match(/(\d+)級/);
    if(m) return zhNum(m[1]);
    m = s.match(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/);
    return m ? ROMAN[m[0]] : 0;
  }

  // Same materials, one of several rewards (西域裝甲禮券 → 劍／勇／術／道／僧裝錦囊) read as one line.
  function choices(list){
    const by = new Map(), out = [];
    for(const r of list){
      const key = r.r.length === 1 ? [sig(r.m), r.c || '', r.l || ''].join('#') : null;
      if(key === null){ out.push(r); continue; }
      if(!by.has(key)){ const box = { set: [] }; by.set(key, box); out.push(box); }
      by.get(key).set.push(r);
    }
    return out.flatMap(x => {
      if(!x.set) return [x];
      const names = new Set(x.set.map(r => r.r[0][0]));
      if(x.set.length < 2 || names.size < x.set.length) return x.set;
      const hs = new Set(x.set.map(r => r.h || ''));
      return [{ ...x.set[0], r: x.set.map(r => r.r[0]), pick: true, n: x.set.length, h: hs.size === 1 ? x.set[0].h : '' }];
    });
  }

  // 由少到多: same first material kept together (in first-seen order), smaller amounts first
  function fewFirst(list){
    const seen = new Map();
    const k0 = r => r.stepN ? '#STEP' : r.many ? '#' + r.label : (r.m[0]?.[0] || '');
    list.forEach(r => { const k = k0(r); if(!seen.has(k)) seen.set(k, seen.size); });
    const key = r => seen.get(k0(r));
    return list.map((r, i) => [r, i]).sort((a, b) => key(a[0]) - key(b[0]) || (a[0].stepN || 0) - (b[0].stepN || 0) || (a[0].m[0]?.[1] || 0) - (b[0].m[0]?.[1] || 0) || (a[0].r[0]?.[1] || 0) - (b[0].r[0]?.[1] || 0) || a[1] - b[1]).map(x => x[0]);
  }

  // rows → NPC blocks → sub-groups (選單／分類)
  function blocksHTML(data, rows, showVer, highFirst){
    if(highFirst){
      // newest expansion first (中原 last), then the higher tier first inside each NPC
      const rank = v => v === '中原（常駐）' ? 999 : Math.max(0, data.vers.indexOf(v));
      rows = rows.slice().sort((a, b) => rank(a.v) - rank(b.v) || a.p - b.p || tier(b.g) - tier(a.g) || tier(b.m[0]?.[0]) - tier(a.m[0]?.[0]));
    }
    const byNpc = new Map();
    for(const r of rows){ if(!byNpc.has(r.p)) byNpc.set(r.p, []); byNpc.get(r.p).push(r); }
    let shown = 0; const limit = PAGE * (state.more + 1); let out = '';
    for(const [p, list] of byNpc){
      if(shown >= limit) break;
      const npc = data.npcs[p];
      const groups = new Map();
      for(const r of choices(list)){ if(shown >= limit) break; const g = r.h || ''; if(!groups.has(g)) groups.set(g, []); groups.get(g).push(r); shown += r.n || 1; }
      out += `<section class="exNpc"><header><h3>${esc(npc.n)}</h3>${showVer ? `<span class="exVer">${esc(list[0].v)}</span>` : ''}<div class="exPlaces">${placesHTML(npc)}</div></header>
        ${[...groups].map(([g, rs]) => { const list = highFirst ? collapse(rs) : fewFirst(collapse(rs)); const head = !!g; return `${head ? `<h4>${esc(g)}</h4>` : ''}<ul class="exRows">${list.map(r => r.many ? manyHTML(r) : rowHTML(r)).join('')}</ul>`; }).join('')}</section>`;
    }
    if(rows.length > limit) out += `<button type="button" class="ghost exMore" data-ex-more>顯示更多（還有 ${rows.length - limit} 筆）</button>`;
    return out || '<div class="empty">沒有符合的兌換。</div>';
  }

  async function renderExchangePage(){
    const reader = document.getElementById('reader');
    if(!reader) return;
    let data;
    try{ data = await load(); IV = data.iv || {}; }catch(e){ reader.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const tabs = [MATS_TAB, ...data.vers];
    if(!tabs.includes(state.tab)) state.tab = MATS_TAB;
    const q = norm(state.query);
    let chips = '', mapChips = '', body = '';
    if(q){
      const hit = data.rows.filter(r => r.m.some(x => norm(x[0]).includes(q)) || r.r.some(x => norm(x[0]).includes(q)) || norm(data.npcs[r.p].n).includes(q));
      body = `<p class="questCount">「${esc(state.query)}」找到 ${hit.length} 筆 <button type="button" class="ghost" data-ex-clear>清除搜尋</button></p>${blocksHTML(data, hit, true)}`;
    }else if(state.tab === MATS_TAB){
      const counts = data.mats.map(([m]) => [m, data.rows.filter(r => r.r.some(x => x[0] === m)).length]).filter(([, n]) => n);
      if(!counts.some(([m]) => m === state.pick)) state.pick = counts[0]?.[0] || '';
      chips = counts.map(([m, n]) => `<button type="button" class="${m === state.pick ? 'active' : ''}" data-ex-pick="${esc(m)}">${esc(m)}<b>${n}</b></button>`).join('');
      const rows = data.rows.filter(r => r.r.some(x => x[0] === state.pick));
      body = `<p class="muted exHint">想要「${esc(state.pick)}」：拿左邊的東西去找 NPC 換。</p>${blocksHTML(data, rows, true, true)}`;
    }else{
      const rows = data.rows.filter(r => r.v === state.tab);
      const mapCount = new Map();
      for(const r of rows){ const m = mapOf(data.npcs[r.p]); mapCount.set(m, (mapCount.get(m) || 0) + 1); }
      const maps = [...mapCount].sort((a, b) => { const ia = CITIES.concat('三城共通').indexOf(a[0]), ib = CITIES.concat('三城共通').indexOf(b[0]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b[1] - a[1]; });
      if(!mapCount.has(state.map)) state.map = maps[0]?.[0] || '';
      mapChips = maps.length > 1 ? `<div class="questGroups exMaps">${maps.map(([m, n]) => `<button type="button" class="${m === state.map ? 'active' : ''}" data-ex-map="${esc(m)}">${esc(m)}<b>${n}</b></button>`).join('')}</div>` : '';
      const npcCount = new Map();
      for(const r of rows) if(mapOf(data.npcs[r.p]) === state.map) npcCount.set(r.p, (npcCount.get(r.p) || 0) + 1);
      if(state.pick === '' || !npcCount.has(Number(state.pick))) state.pick = String([...npcCount.keys()][0] ?? '');
      chips = [...npcCount].map(([p, n]) => `<button type="button" class="${String(p) === String(state.pick) ? 'active' : ''}" data-ex-pick="${p}">${esc(data.npcs[p].n)}<b>${n}</b></button>`).join('');
      body = blocksHTML(data, rows.filter(r => String(r.p) === String(state.pick)), false);
    }
    reader.innerHTML = `<section class="questPage exPage">
      <div class="questHero"><h1>兌換查詢</h1><p class="muted">什麼東西找誰換什麼。點道具看資料，點地點看 NPC 對話與地圖位置。</p>
        <input id="exSearch" class="questSearch" type="search" placeholder="搜尋道具或 NPC（例如：皇龍虹鉻、藥煉之菁、敖姬）" value="${esc(state.query)}"></div>
      ${q ? '' : `<div class="questTabs exTabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" class="${t === state.tab ? 'active' : ''}" data-ex-tab="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="exChips">${mapChips}<div class="questGroups">${chips}</div></div>`}
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
    if(tab){ state.tab = tab.dataset.exTab; state.map = ''; state.pick = ''; state.more = 0; renderExchangePage(); return; }
    const map = t.closest('[data-ex-map]');
    if(map){ state.map = map.dataset.exMap; state.pick = ''; state.more = 0; renderExchangePage(); return; }
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

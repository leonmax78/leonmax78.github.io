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
      const starts = fetch('data/quest_starts.json?v=' + v, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      const simple = fetch('data/quest_simple.json?v=' + v, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      dataPromise = fetch('data/quests.json?v=' + v, { cache: 'force-cache' }).then(r => { if(!r.ok) throw Error('任務資料載入失敗'); return r.json(); })
        .then(async d => { d.byId = new Map(d.quests.map(q => [q.i, q])); d.starts = await starts; const sj = await simple; d.simple = sj.s || sj; d.simpleMo = sj.mo || {}; d.simpleAll = sj.all || {}; return d; })
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
        if(qty && (/（/.test(qty) || (!/^\s*[\d０-９*×xX]/.test(s.slice(at + m.length)) && !/[\d０-９]+\s*[^\s\d、，]{0,2}$/.test(s.slice(0, at))))) out += qtyHTML(qty);
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

  // V872: 白話步驟（data/quest_simple.json，依任務 ID 對應每個步驟）。原文裡的 NPC／地點連結
  // 名稱若出現在白話句中就原地換成同一個連結；句中出現的地圖名稱也變成可開地圖的連結；
  // 對不上的 NPC 連結放在句子後面。原文收在「原文」裡。
  function simpleStepHTML(simple, orig, data, q, step){
    const toks = [...String(orig || '').matchAll(LINK)].map(m => ({ tok: m[0], name: m[5] }));
    const stageIds = data.stageIdByName || (data.stageIdByName = new Map(Object.entries(data.stages).map(([id, n]) => [n, id])));
    const names = data.stageNamesLong || (data.stageNamesLong = [...stageIds.keys()].filter(n => n && n.length >= 2).sort((a, b) => b.length - a.length));
    let text = String(simple), rest = [];
    const swap = (name, tok) => {
      // only outside links already placed
      const parts = text.split(/(⟦[^⟧]*⟧)/);
      for(let i = 0; i < parts.length; i += 2){
        const at = parts[i].indexOf(name);
        if(at >= 0){ parts[i] = parts[i].slice(0, at) + tok + parts[i].slice(at + name.length); text = parts.join(''); return true; }
      }
      return false;
    };
    for(const t of toks){
      if(!t.name) continue;
      const outside = text.split(/⟦[^⟧]*⟧/).some(part => part.includes(t.name));
      if(outside) swap(t.name, t.tok);
      else if(!text.includes(t.name) && Number(t.tok.split(',')[1])) rest.push(t.tok);
    }
    for(const n of names) if(text.includes(n)) swap(n, `⟦${stageIds.get(n)},0,0,0,${n}⟧`);
    const extra = [...new Set(rest)].map(t => richText(t, data, q)).join('<i>、</i>');
    const extraMo = data.simpleMo && data.simpleMo[q.i];
    const qs = extraMo ? Object.assign({}, q, { mo: [...(q.mo || []), ...extraMo] }) : q;
    // 同一張地圖點名兩隻以上的怪：一個按鈕把它們全標在地圖上（data/quest_simple.json 的 all）
    const groups = (data.simpleAll && data.simpleAll[q.i] && data.simpleAll[q.i][step]) || [];
    const allBtn = groups.filter(([st]) => data.stages[st]).map(([st, l]) => `<button type="button" class="questMonAll" title="${esc(l.join('、'))}" data-quest-map="${esc(data.stages[st])}" data-quest-map-name="${esc(l.join('、'))}" data-quest-map-npc="">全部標在地圖${groups.length > 1 ? `・${esc(data.stages[st])}` : ''}</button>`).join('');
    return `<span class="questSimple">${richText(text, data, qs)}</span>${allBtn}${extra ? `<span class="questSimpleNpc">${extra}</span>` : ''}<details class="questOrig"><summary>原文</summary><div>${richText(orig, data, q)}</div></details>`;
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

  // V845: 接任務的 NPC 與位置——任務敘述的第一個 NPC 連結；沒有就用 NPC 對話找到的接任務者
  // （data/quest_starts.json，tools/build_quest_starts.py）；再沒有就用敘述裡指定的地點。
  function questGiver(q, data){
    const d = String(q.d || '');
    let m = d.match(/⟦(\d+),([1-9]\d*),(\d+),(\d+),([^⟧]+)⟧/);
    if(m) return { st: m[1], id: m[2], x: m[3], y: m[4], name: m[5] };
    const f = data.starts && data.starts[q.i];
    if(f) return { st: String(f[0]), id: String(f[1]), x: String(f[2]), y: String(f[3]), name: f[4] };
    m = d.match(/⟦(\d+),0,(\d+),(\d+),([^⟧]+)⟧/);
    if(m && (Number(m[2]) || Number(m[3]))) return { st: m[1], id: '', x: m[2], y: m[3], name: m[4] };
    return null;
  }
  function questGiverHTML(q, data){
    const g = questGiver(q, data);
    if(!g) return '';
    const sn = data.stages[g.st] || '';
    const who = g.id
      ? `<button type="button" class="questNpc" title="點擊看對話與地圖位置" data-quest-npc="${esc(g.st)}:${esc(g.id)}">${esc(g.name)}</button>`
      : `<b class="questPlace">${esc(g.name)}</b>`;
    const map = sn ? `<button type="button" class="questMapLink questGiverMap" title="在地圖上標出位置" data-quest-map="${esc(sn)}" data-quest-map-name="${esc(g.name)}" data-quest-map-npc="${esc(g.id)}"${g.id ? '' : ` data-quest-map-x="${esc(g.x)}" data-quest-map-y="${esc(g.y)}"`}>${esc(sn)}</button>` : '';
    return `<div class="questGiver"><span>接任務</span>${who}${map}<b class="questSpotXY">(${esc(g.x)}, ${esc(g.y)})</b></div>`;
  }

  function questBodyHTML(q, data){
    const items = (q.it || []).map(([id, name]) => id ? `<button type="button" class="questItem" data-quest-item="${esc(id)}">${esc(name)}</button>` : `<span class="questItem">${esc(name)}</span>`).join('');
    return `<div class="questBody">
      ${questGiverHTML(q, data)}
      ${q.d ? `<p class="questStart"><span>開始</span>${richText(q.d, data, q)}</p>` : ''}
      ${q.s.length ? `<ol class="questSteps">${q.s.map((s, i) => { const sim = data.simple && data.simple[q.i] && data.simple[q.i][i]; const tg = (q.tg || []).find(t => t[0] === i); const pts = (q.pt || []).filter(t => t[0] === i); return `<li>${sim ? simpleStepHTML(sim, s, data, q, i) : richText(s, data, q)}${pts.length ? `<div class="questSpots"><span>地點</span>${pts.map(([, st, x, y, msg]) => `<div class="questSpot"><button type="button" class="questCoord" title="在地圖上標出位置" data-quest-map="${esc(data.stages[st] || '')}" data-quest-map-name="觸發點" data-quest-map-npc="" data-quest-map-x="${esc(x)}" data-quest-map-y="${esc(y)}">${esc(data.stages[st] || '')}</button><b class="questSpotXY">(${esc(x)}, ${esc(y)})</b>${msg ? `<small>「${esc(msg)}」</small>` : ''}</div>`).join('')}</div>` : ''}${tg ? `<div class="questTargets"><span>對象</span>${tg[1].map(([st, id, nm]) => `<button type="button" class="questNpc" title="${esc(`${data.stages[st] || ''}・點擊看對話與地圖位置`)}" data-quest-npc="${esc(st)}:${esc(id)}">${esc(nm)}</button>`).join('<i>、</i>')}</div>` : ''}</li>`; }).join('')}</ol>` : ''}
      ${(q.ho || []).length ? `<div class="questMeta"><b>繳交道具與數量</b><ul class="questHandins">${q.ho.map(([id, n, qty, who]) => `<li>${id ? `<button type="button" class="questItemLink" data-quest-item="${esc(id)}">${esc(n)}</button>` : esc(n)} <span>${esc(qty).replace(/（(月服|免服)）/g, '<em class="questSrv" data-srv="$1">$1</em>')}</span>${who ? ` <small>${esc(who)}</small>` : ''}</li>`).join('')}</ul></div>` : ''}
      ${items ? `<div class="questMeta"><b>任務道具</b><div class="questItems">${items}</div></div>` : ''}
      ${q.r ? `<div class="questMeta"><b>獎勵${q.rx ? '<small class="questRewardNote">依選擇或結果不同，以下擇一</small>' : ''}</b><ul class="questRewards">${q.r.map(r => `<li>${itemLinker(q.ri)(r).replace(/（(月服|免服)）/g, '<em class="questSrv" data-srv="$1">$1</em>')}</li>`).join('')}</ul></div>` : ''}
      ${q.pre ? `<div class="questMeta"><b>前置任務</b><div class="questItems">${q.pre.map(n => `<button type="button" class="questItem" data-quest-find="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>` : ''}
    </div>`;
  }

  // V780: the closed card already tells level, where it starts, how long it is and what it pays
  function questFactsHTML(q, data){
    const g = data && data.stages ? questGiver(q, data) : null;
    const start = g ? g.name : (String(q.d || '').match(/⟦\d+,\d+,\d+,\d+,([^⟧]+)⟧/) || [])[1];
    const where = data && data.stages ? (g && data.stages[g.st]) || data.stages[q.m] : '';
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
    if(q.length >= 2) for(const quest of data.quests){ if(limit && out.length >= limit) break; if(norm(plain(quest.d) + plain((quest.s || []).join(''))).includes(q)) push(quest, `內容提到「${raw.trim()}」`); }
    return limit ? out.slice(0, limit) : out;
  };

  function filtered(data){
    const q = norm(state.query);
    if(q){
      // 搜尋用文字只算一次（每打一個字都重算任務敘述會讓手機輸入變慢）
      return data.quests.filter(x => (x._q ||= norm(x.n + '\n' + plain(x.d) + plain((x.s || []).join('')) + '\n' + (x.it || []).map(([, n]) => n).join('\n'))).includes(q));
    }
    return data.quests.filter(x => inCat(x, data) && (!state.group || x.g === state.group));
  }

  // tab order chosen by the site owner; any new category goes after these
  const CAT_ORDER = ['資料片任務','一般任務','職業任務','轉職任務','聯動任務','新手任務'];
  // V792: 主線所需道具一覽 (data/quest_main_mats.json, tools/build_main_quest_mats.py)
  let matsPromise = null;
  function loadMainMats(){
    if(!matsPromise){
      const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
      const get = url => fetch(url + '?v=' + v, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      matsPromise = Promise.all([get('data/quest_main_mats.json'), get('data/search_icons.json')]).then(([mats, icons]) => ({ mats, icons }));
    }
    return matsPromise;
  }
  function mainMatsHTML(group, m){
    const rows = m?.mats?.[group];
    if(!rows?.length) return '';
    const media = window.SZO_ASSET_MEDIA;
    const icon = id => { try{ const ic = m.icons?.items?.[id]; const src = ic && media ? media.itemIconSrc({ ID: id, Icon: ic }) : ''; return src ? `<img src="${esc(src)}" alt="" loading="lazy">` : '<i></i>'; }catch(e){ return '<i></i>'; } };
    return `<section class="questMats"><h2>主線所需道具一覽<small>${esc(group)}・只列需要準備的材料，任務中打怪或拾取的道具不列入</small></h2>
      <div class="questMatList">${rows.map(([id, name, qty]) => `<button type="button" class="questMat${/^\d+$/.test(qty) ? '' : ' questMatLong'}" data-item="${esc(id)}">${icon(id)}<span>${esc(name)}</span><b>×${esc(qty)}</b></button>`).join('')}</div></section>`;
  }
  const catsInOrder = cats => cats.slice().sort((a, b) => (CAT_ORDER.indexOf(a) + 1 || 99) - (CAT_ORDER.indexOf(b) + 1 || 99));
  // V858: 打字時只更新搜尋結果，不重畫輸入框；注音／倉頡等輸入法組字中不搜尋（以前整頁重畫會把正在打的字吃掉、像卡住）
  async function renderQuestPage(editingInput){
    const reader = document.getElementById('reader');
    if(!reader) return;
    let data;
    let mats = null;
    try{ [data, mats] = await Promise.all([loadQuests(), loadMainMats()]); }catch(e){ reader.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const groups = (data.groups[state.cat] || []).filter(g => data.quests.some(x => inCat(x, data) && x.g === g));
    const classRow = state.cat === '職業任務' ? `<div class="questGroups questClasses">${CLASSES.map(c => `<button type="button" class="${c === state.cls ? 'active' : ''}" data-quest-cls="${esc(c)}">${esc(c)}<b>${data.quests.filter(x => x.c === state.cat && x.cl === c).length}</b></button>`).join('')}</div>` : '';
    if(state.group && !groups.includes(state.group)) state.group = '';
    if(!state.group && !state.query) state.group = groups[0] || '';
    const list = filtered(data);
    // a small group opens its quests right away instead of leaving one closed bar
    if(!state.query && list.length <= 3) list.forEach(q => state.open.add(q.i));
    if(editingInput && !reader.contains(editingInput)) return;
    if(!editingInput) reader.innerHTML = `<section class="questPage">
      <div class="questHero"><h1>任務查詢</h1><p class="muted">資料取自遊戲任務檔，點 NPC 名稱看對話，點怪物或地點名稱直接在地圖上顯示位置。</p>
        <input id="questSearch" class="questSearch" type="search" placeholder="搜尋任務、NPC 或任務道具（例如：黑狗血）" value="${esc(state.query)}"></div>
      <div data-quest-results></div></section>`;
    reader.querySelector('[data-quest-results]').innerHTML = `
      ${state.query ? `<p class="questCount">「${esc(state.query)}」找到 ${list.length} 個任務 <button type="button" class="ghost" data-quest-clear>清除搜尋</button></p>` : `
      <div class="questTabs" role="tablist">${catsInOrder(data.cats).map(c => `<button type="button" role="tab" class="${c === state.cat ? 'active' : ''}" data-quest-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${classRow}<div class="questGroups">${groups.map(g => `<button type="button" class="${g === state.group ? 'active' : ''}" data-quest-group="${esc(g)}">${esc(g)}<b>${data.quests.filter(x => inCat(x, data) && x.g === g).length}</b></button>`).join('')}</div>`}
      ${!state.query && state.cat === '資料片任務' ? mainMatsHTML(state.group, mats) : ''}
      <div class="questList">${list.slice(0, 200).map(q => `<details class="questCard${q.tag === '主線任務' ? ' questMain' : ''}" data-quest-id="${q.i}"${state.open.has(q.i) ? ' open' : ''}><summary>${questHeadHTML(q, data)}${state.query ? `<small>${esc(q.c)}・${esc(q.g)}</small>` : ''}</summary>${state.open.has(q.i) ? questBodyHTML(q, data) : ''}</details>`).join('') || '<div class="empty">沒有符合的任務。</div>'}</div>
      ${list.length > 200 ? `<p class="muted">只顯示前 200 筆，請輸入更精確的關鍵字。</p>` : ''}`;
  }
  window.renderQuestPage = renderQuestPage;
  window.openQuestPage = async function(query){
    state.query = query || '';
    if(typeof window.setView === 'function') await window.setView('quest');
  };

  let searchTimer = 0;
  const composing = new WeakSet();
  document.addEventListener('compositionstart', ev => { if(ev.target?.id === 'questSearch'){ clearTimeout(searchTimer); composing.add(ev.target); } });
  function scheduleQuestSearch(ev){
    if(ev.target?.id !== 'questSearch') return;
    clearTimeout(searchTimer);
    if(ev.isComposing || composing.has(ev.target)) return;
    const input = ev.target;
    searchTimer = setTimeout(() => {
      if(!input.isConnected) return;
      const q = input.value.trim();
      if(q === state.query) return;
      state.query = q;
      renderQuestPage(input);
    }, 250);
  }
  document.addEventListener('input', scheduleQuestSearch);
  document.addEventListener('compositionend', ev => { if(ev.target?.id !== 'questSearch') return; composing.delete(ev.target); scheduleQuestSearch(ev); });
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

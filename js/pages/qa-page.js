(function(){
  const DATA_URLS = {
    items: 'data/items.json',
    monsters: 'data/monsters.json',
    reverse: 'data/drop_reverse.json',
    locations: 'data/locations.json',
    shops: 'data/shop_all.json',
    maps: 'data/stage_maps.json',
    quests: 'data/quests.json',
    exchanges: 'data/exchanges.json',
    talk: 'data/npc_item_talk.json',
    training: 'data/training_spots.json',
    walk: 'data/training_walk.json'
  };
  const cache = {};
  const state = { query: '', mode: 'auto', exactItem: '' };

  function by(id){ return document.getElementById(id); }
  function html(value){
    if(typeof esc === 'function') return esc(value);
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function version(){
    return encodeURIComponent(document.body?.dataset?.version || window.SZO_BUILD_VERSION || 'dev');
  }
  async function json(name){
    if(cache[name]) return cache[name];
    const url = DATA_URLS[name];
    cache[name] = fetch(`${url}?v=${version()}`, { cache: 'force-cache' }).then(res => {
      if(!res.ok) throw new Error(`load ${url}`);
      return res.json();
    });
    return cache[name];
  }
  function norm(value){
    if(window.SZO_LANGUAGE)value=SZO_LANGUAGE.toSimple(String(value??''));
    return String(value ?? '').toLowerCase().replace(/[\s\u3000"'「」『』【】\[\]（）()、，,。:：;；\-_/\\|]+/g, '');
  }
  function itemId(item){ return String(item?.ID ?? item?.id ?? item?.itemId ?? '').trim(); }
  function itemName(item){ return String(item?.Name ?? item?.name ?? '').trim(); }
  function monsterId(monster){ return String(monster?.ID ?? monster?.id ?? monster?.monsterId ?? '').trim(); }
  function monsterName(monster){ return String(monster?.Name ?? monster?.name ?? monster?.monsterName ?? '').trim(); }
  function monsterLevel(monster){ return String(monster?.Level ?? monster?.level ?? '').trim(); }
  function money(value){
    const n = Math.floor(Number(value));
    if(!Number.isFinite(n)) return '-';
    const yi = Math.floor(n / 100000000);
    const wan = Math.floor((n % 100000000) / 10000);
    const rest = n % 10000;
    if(yi) return `${yi}億${wan ? wan + '萬' : ''}${rest ? rest : ''}兩`;
    if(wan) return `${wan}萬${rest ? rest : ''}兩`;
    return `${n}兩`;
  }
  function rateText(rate){
    if(rate==null)return '改版機率待確認';
    const n = Number(rate);
    return Number.isFinite(n) ? `${n.toFixed(6)}%` : '';
  }
  function assetManifest(){
    // Same lookup as js/data/asset-media.js: the bundle registers itself under SZO_DATA_BUNDLES.
    return (window.SZO_DATA_BUNDLES && window.SZO_DATA_BUNDLES.asset_manifest) || window.SZO_ASSET_MANIFEST || {};
  }
  function assetBase(){
    return (assetManifest().base) || 'assets/test-media';
  }
  function itemIcon(item){
    const media = window.SZO_ASSET_MEDIA;
    if(media && typeof media.itemIconSrc === 'function'){
      const src = media.itemIconSrc({ ID:item.itemId || itemId(item), Icon:item.icon || item.Icon, Type:item.type || item.Type, Name:item.name || itemName(item) });
      if(src) return src;
    }
    const icon = String(item.icon || item.Icon || '').trim();
    return icon ? `${assetBase()}/item-icons/i${icon}.png?v=${version()}` : '';
  }
  function monsterIcon(monster){
    const media = window.SZO_ASSET_MEDIA;
    if(media && typeof media.monsterPortraitSrc === 'function'){
      const src = media.monsterPortraitSrc({ ID:monsterId(monster), Pic:monster.Pic || monster.pic, Name:monsterName(monster) });
      if(src) return src;
    }
    const pic = String(monster.Pic || monster.pic || '').trim();
    return pic ? `${assetBase()}/monster-portraits/m${pic}.png?v=${version()}` : '';
  }
  async function mapsByName(){
    const maps = await json('maps');
    const out = new Map();
    for(const stage of maps.stages || []){
      const name = String(stage.stageName || '').trim();
      if(name) out.set(norm(name), stage.stageName);
    }
    return out;
  }
  async function locationForMonster(name){
    const locations = await json('locations');
    return locations?.[name] || '';
  }
  function findByName(rows, getName, query, limit = 8){
    const q = norm(query);
    if(!q) return [];
    return rows.map((row, index) => {
      const name = getName(row);
      const n = norm(name);
      let score = 0;
      if(n === q) score = 1000;
      else if(n.startsWith(q)) score = 800;
      else if(n.includes(q)) score = 620;
      else if(q.includes(n) && n.length >= 2) score = 520;
      if(!score) return null;
      return { row, name, score: score - index / 100000 };
    }).filter(Boolean).sort((a,b) => b.score - a.score).slice(0, limit).map(x => x.row);
  }
  function intentOf(raw){
    const q = String(raw || '');
    if(/[買購售價價格商店販賣販售回收賣]/.test(q)) return 'shop';
    if(/[掉落掉誰掉哪裡掉出處反查]/.test(q)) return 'drop';
    if(/[在哪哪裡位置地圖出現座標]/.test(q)) return 'location';
    return 'auto';
  }
  function searchTerm(raw){
    let text = String(raw || '').trim();
    text = text.replace(/(請問|幫我|幫忙|查詢|搜尋|查一下|我想問|想問|可以|嗎|呢|啊|喔|謝謝)/g, '');
    text = text.replace(/(在哪裡|在哪|哪裡|哪邊|什麼地方|位置|地圖|出現|座標)/g, '');
    text = text.replace(/(誰會掉|誰掉|哪隻掉|哪裡掉|掉落|掉|出處|反查|來源)/g, '');
    text = text.replace(/(哪裡買|哪裡賣|哪邊買|哪邊賣|買得到|買|購買|商店|販售|販賣|售價|價格|回收|賣)/g, '');
    text = text.replace(/[？?！!。．,，、:：;；]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    return text || String(raw || '').trim();
  }
  function resultLoading(){
    const target = by('qaResults');
    if(target) target.innerHTML = '<div class="qaLoading">資料讀取中...</div>';
  }
  function quickExamples(){
    const examples = ['我 300 等去哪練', '大山犬', '短劍', '天鐵', '神效靈藥配方錦囊'];
    return `<div class="qaExamples">${examples.map(x => `<button type="button" data-qa-example="${html(x)}">${html(x)}</button>`).join('')}</div>`;
  }
  function renderQaPage(){
    const reader = by('reader');
    if(!reader) return;
    if(window.SZO_PENDING_GLOBAL_SEARCH){
      state.query = window.SZO_PENDING_GLOBAL_SEARCH;
      window.SZO_PENDING_GLOBAL_SEARCH = '';
    }
    window.v86LastView = 'qa';
    reader.innerHTML = `<section class="card qaPage">
      <h1>全站搜尋</h1>
      <p class="muted">一次搜尋道具、怪物、商店商品、NPC 與地圖；也可以直接問「我 300 等去哪練」。</p>
      <form id="qaForm" class="qaForm">
        <input id="qaInput" value="${html(state.query)}" placeholder="例如：我 300 等去哪練、大山犬、天鐵哪裡掉">
        <button type="button" class="primary" data-qa-search onclick="window.SZO_QA_RUN && window.SZO_QA_RUN()">搜尋</button>
        <button type="button" class="ghost" id="qaClear">清空</button>
      </form>
      ${quickExamples()}
      <div id="qaResults" class="qaResults">${state.query ? '' : '<div class="empty">輸入關鍵字後按「搜尋」。</div>'}</div>
    </section>`;
    const input = by('qaInput');
    if(input) input.focus();
    if(state.query) runQuestion(state.query);
  }
  // Recipes (data/recipe-flows.js) that use any of the given items as a material.
  async function recipesUsing(items, targets){
    if(!targets.length) return [];
    if((!window.SZO_RECIPE_FLOWS || !window.SZO_ABYSS_EXCHANGES) && typeof loadScriptGroupOnce === 'function') await loadScriptGroupOnce('data_recipes').catch(() => null);
    const flows = window.SZO_RECIPE_FLOWS || {};
    const byId = new Map(items.map(it => [itemId(it), it]));
    const want = new Map(targets.map(it => [itemId(it), itemName(it)]));
    const out = [], seen = new Set();
    for(const [recipeId, list] of Object.entries(flows)){
      for(const f of list){
        for(const step of f.steps || []) for(const m of step.materials || []){
          if(!want.has(String(m.id))) continue;
          const key = recipeId + '|' + f.id + '|' + m.id;
          if(seen.has(key)) continue; seen.add(key);
          out.push({ recipeId, recipeName: f.name || itemName(byId.get(recipeId)) || '配方', material: want.get(String(m.id)), qty: m.qty,
            outputId: f.output || '', outputName: f.output ? itemName(byId.get(String(f.output))) || ('ID ' + f.output) : '' });
        }
      }
    }
    // 兌換與加工 (gem refining and other exchanges, data/abyss-exchanges.js)
    for(const r of window.SZO_ABYSS_EXCHANGES?.rows || []){
      for(const m of r.materials || []){
        if(!want.has(String(m.id))) continue;
        const reward = (r.rewards || [])[0];
        out.push({ recipeId: '', recipeName: r.name || '兌換', material: want.get(String(m.id)), qty: m.count,
          outputId: reward ? String(reward.id) : '', outputName: reward ? (itemName(byId.get(String(reward.id))) || ('ID ' + reward.id)) + (reward.count > 1 ? ' ×' + reward.count : '') : '' });
      }
    }
    return out;
  }
  // V790: every way to get one item — drops, shops, NPC gifts, exchanges, quest rewards, crafting.
  function typeLabel(type){
    const t = String(type || '').trim();
    try{ if(typeof ITEM_TYPE_MAP === 'object' && ITEM_TYPE_MAP[t]) return ITEM_TYPE_MAP[t]; }catch(e){}
    return t;
  }
  async function itemNames(){
    if(cache.itemNames) return cache.itemNames;
    cache.itemNames = (async () => {
      let list = [];
      const idx = window.itemIndex && Object.keys(window.itemIndex).length ? Object.values(window.itemIndex) : null;
      list = idx || await json('items');
      const byId = new Map(), byName = new Map();
      for(const it of list){ const id = itemId(it), n = itemName(it); if(!id) continue; byId.set(id, it); if(n && !byName.has(n)) byName.set(n, it); }
      return { byId, byName };
    })();
    return cache.itemNames;
  }
  async function dropShard(id){
    const prefix = (id.slice(0, 3) || 'misc').replace(/[^0-9A-Za-z_-]/g, '');
    const key = 'drop:' + prefix;
    if(!cache[key]) cache[key] = fetch(`data/drop_reverse_shards/${prefix}.json?v=${version()}`, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    return (await cache[key])[id] || [];
  }
  async function itemSources(rawId){
    const id = String(rawId || '').trim();
    const { byId, byName } = await itemNames();
    const item = byId.get(id);
    const name = itemName(item);
    const safe = p => p.catch(e => { console.warn('item sources', e); return null; });
    const [drops, locs, talk, ex, quests] = await Promise.all([safe(dropShard(id)), safe(shopLocations()), safe(json('talk')), safe(json('exchanges')), safe(json('quests'))]);
    const out = { id, name, drops: [], shops: [], gifts: [], exchanges: [], quests: [], crafts: [] };
    // 怪物掉落 (a 錦囊/福袋 "monster" is really an item you open)
    for(const d of window.szoBoxSourceRows(drops || []).sort((a, b) => (Number(b.rate) || 0) - (Number(a.rate) || 0))){
      out.drops.push({ mid: String(d.monsterId), name: d.monsterName, rate: d.rate, boxId: d.boxId || '' });
    }
    // 商店販賣
    const seenShop = new Set();
    for(const loc of locs || []){
      for(const it of loc.shop?.items || []){
        if(String(it.itemId) !== id || it.sellPrice === undefined || it.sellPrice === null || it.sellPrice === '') continue;
        const k = loc.stageId + ':' + loc.npcId;
        if(seenShop.has(k)) continue; seenShop.add(k);
        out.shops.push({ stageId: loc.stageId, stageName: loc.stageName, npcId: loc.npcId, npcName: loc.npcName, price: Number(it.sellPrice), conds: loc.conds || [] });
      }
    }
    out.shops.sort((a, b) => a.price - b.price || a.stageId - b.stageId);
    // NPC 給予 (dialogue)
    const seenGift = new Map();
    for(const [npcId, stageId, msgId, kind] of (talk?.items || {})[name] || []){
      if(kind !== 'g') continue;
      if(seenGift.has(npcId)){ seenGift.get(npcId).count++; continue; }
      const [npcName, stageName] = (talk.npcs || {})[npcId] || ['NPC', ''];
      const row = { key: `${stageId}:${npcId}:${msgId}`, npcName, stageName, count: 1 };
      seenGift.set(npcId, row); out.gifts.push(row);
    }
    // 兌換・拆解・升階: one line per NPC + set (拆解 a whole set gives the same thing)
    if(ex){
      const groups = new Map();
      for(const r of ex.rows || []){
        const got = (r.r || []).find(x => String(x[2]) === id);
        if(!got) continue;
        const k = r.p + '|' + (r.g || '') + '|' + got[1] + '|' + (r.m.length > 1 ? r.m.map(x => x[0] + x[1]).join() : '');
        if(!groups.has(k)) groups.set(k, { npc: ex.npcs[r.p], kind: r.k || '', group: r.g || '', qty: got[1], pick: !!r.pick, mats: [], ver: r.v || '' });
        groups.get(k).mats.push(r.m);
      }
      out.exchanges = [...groups.values()];
    }
    // 任務獎勵
    for(const q of quests?.quests || []){
      if((q.ri || []).some(([rid]) => String(rid) === id)) out.quests.push({ id: q.i, name: q.n, cat: q.c === '資料片任務' ? q.g : q.c, lv: q.lv });
    }
    // 合成・加工
    if((!window.SZO_RECIPE_FLOWS || !window.SZO_ABYSS_EXCHANGES) && typeof loadScriptGroupOnce === 'function') await loadScriptGroupOnce('data_recipes').catch(() => null);
    for(const [recipeId, list] of Object.entries(window.SZO_RECIPE_FLOWS || {})){
      for(const f of list) if(String(f.output || '') === id){
        const mats = (f.steps || []).flatMap(st => st.materials || []).map(m => [itemName(byId.get(String(m.id))) || 'ID ' + m.id, m.qty, String(m.id)]);
        out.crafts.push({ recipeId, name: f.name || itemName(byId.get(recipeId)) || '配方', mats });
      }
    }
    for(const r of window.SZO_ABYSS_EXCHANGES?.rows || []){
      const rw = (r.rewards || []).find(x => String(x.id) === id);
      if(!rw) continue;
      out.crafts.push({ recipeId: '', name: r.name || '兌換', qty: rw.count, mats: (r.materials || []).map(m => [itemName(byId.get(String(m.id))) || 'ID ' + m.id, m.count, String(m.id)]) });
    }
    return out;
  }
  const SRC_KINDS = [['drops', '怪物掉落'], ['shops', '商店販賣'], ['gifts', 'NPC 給予'], ['exchanges', '兌換・拆解'], ['quests', '任務獎勵'], ['crafts', '合成・加工']];
  function sourcesBody(src, opts = {}){
    const show = opts.show || 5;
    const fold = (rows, line) => rows.length <= show + 2 ? rows.map(line).join('') : rows.slice(0, show).map(line).join('') + `<details class="qaMore"><summary>顯示其餘 ${rows.length - show} 筆</summary>${rows.slice(show).map(line).join('')}</details>`;
    const matsText = list => list.map(([n, q, mid]) => `${mid ? `<button type="button" class="qaLink" data-qa-preview-item="${html(mid)}">${html(n)}</button>` : html(n)}${q > 1 || typeof q === 'string' ? `×${html(q)}` : ''}`).join('＋');
    const qtyText = q => q > 1 ? ` ×${Number(q).toLocaleString()}` : '';
    const lines = {
      drops: r => `<div class="qaLine"><span class="qaLineMain">${r.boxId
          ? `<button type="button" class="qaLink" data-qa-preview-item="${html(r.boxId)}">${html(r.name)}</button><small>開啟取得</small>`
          : `<button type="button" class="qaLink" data-qa-src-monster="${html(r.mid)}" data-qa-src-item="${html(src.id)}">${html(r.name)}</button>`}</span><span class="qaLineGet">${html(rateText(r.rate))}</span></div>`,
      shops: r => `<div class="qaLine"><span class="qaLineMain"><button type="button" class="qaLink" data-qa-src-npcshop="${html(r.stageId)}:${html(r.npcId)}">${html(r.npcName)}</button><small>${html(r.stageName)}</small>${r.conds.length ? `<small class="qaCond">${html(r.conds.join('、'))}</small>` : ''}</span><span class="qaLineGet">${html(money(r.price))}</span></div>`,
      gifts: r => `<div class="qaLine"><span class="qaLineMain"><button type="button" class="qaLink" data-qa-npc-talk="${html(r.key)}">${html(r.npcName)}</button>${r.stageName ? `<small>${html(r.stageName)}</small>` : ''}${r.count > 1 ? `<small>${r.count} 段對話</small>` : ''}</span><span class="qaLineGet">對話取得</span></div>`,
      exchanges: r => {
        const place = r.npc?.p?.[0];
        const give = r.mats.length > 1 ? `${html(r.group || r.kind)}<small>任一件，共 ${r.mats.length} 件</small>` : matsText(r.mats[0] || []) + (r.group ? `<small>${html(r.group)}</small>` : '');
        return `<div class="qaLine"><span class="qaLineMain">${give}</span><span class="qaLineGet">${r.pick ? '擇一 ' : ''}得${qtyText(r.qty) || ' ×1'}</span><span class="qaLineActs">${place ? `<button type="button" class="qaMini" data-qa-npc-talk="${html(place[0])}:${html(place[1])}">${html(r.npc.n)}</button>` : ''}</span></div>`;
      },
      quests: r => `<div class="qaLine"><span class="qaLineMain"><button type="button" class="qaLink" data-qa-quest="${html(r.id)}">${html(r.name)}</button><small>${html(r.cat || '')}${r.lv ? '・Lv.' + html(r.lv) : ''}</small></span><span class="qaLineGet">任務獎勵</span></div>`,
      crafts: r => `<div class="qaLine"><span class="qaLineMain">${r.recipeId ? `<button type="button" class="qaLink" data-qa-preview-item="${html(r.recipeId)}">${html(r.name)}</button>` : `<strong>${html(r.name)}</strong>`}<small>${matsText(r.mats)}</small></span>${r.qty > 1 ? `<span class="qaLineGet">得 ×${html(r.qty)}</span>` : ''}</div>`
    };
    const more = {
      drops: `<button type="button" class="qaMini" data-rev="${html(src.id)}">完整掉落列表</button>`,
      exchanges: `<button type="button" class="qaMini" data-qa-src-exchange="${html(src.name)}">到兌換頁查看</button>`
    };
    const kinds = SRC_KINDS.filter(([k]) => src[k].length && !(opts.skip || []).includes(k));
    if(!kinds.length) return '<p class="muted itemSrcNone">目前資料內沒有找到取得方式（可能是活動、商城或系統給予）。</p>';
    return (kinds.length > 1 ? `<div class="itemSrcChips">${kinds.map(([k, label]) => `<span class="itemSrcChip">${label}<b>${src[k].length}</b></span>`).join('')}</div>` : '')
      + kinds.map(([k, label]) => `<div class="qaGroup itemSrcGroup" data-src="${k}"><h3>${label}<b>${src[k].length}</b>${opts.full !== false && more[k] && src[k].length > (k === 'drops' ? show : 0) ? more[k] : ''}</h3><div class="qaLines">${fold(src[k], lines[k])}</div></div>`).join('');
  }
  window.szoItemSourcesHTML = async function(id, opts){
    const src = await itemSources(id);
    return sourcesBody(src, opts);
  };
  window.szoItemSources = itemSources;
  function chip(label, attrs = ''){
    return `<button type="button" class="qaChip" ${attrs}>${html(label)}</button>`;
  }
  function mapChip(mapName, query){
    return chip(`${mapName} 地圖`, `data-qa-map="${html(mapName)}" data-qa-map-query="${html(query || '')}"`);
  }
  function monsterChip(monster){
    const id = monsterId(monster);
    return chip(`查看 ${monsterName(monster)}`, `data-qa-monster="${html(id)}"`);
  }
  function itemChip(item){
    const id = itemId(item);
    return chip(`${itemName(item)}`, `data-qa-reverse="${html(id)}"`);
  }
  function suggestionBlock(title, rows, getLabel, attrName){
    if(!rows.length) return '';
    return `<div class="qaSuggestions"><span>${html(title)}</span>${rows.map(row => chip(getLabel(row), `data-${attrName}="${html(getLabel(row))}"`)).join('')}</div>`;
  }
  async function answerLocation(query){
    const monsters = await json('monsters');
    const term = searchTerm(query);
    const matches = findByName(monsters, monsterName, term, 6);
    if(!matches.length) return null;
    const primary = matches[0];
    const loc = await locationForMonster(monsterName(primary));
    const locs = String(loc || '').split(/[、,]/).map(x => x.trim()).filter(Boolean);
    return `<div class="qaAnswer">
      <h2>${html(monsterName(primary))} 的位置</h2>
      <div class="qaAnswerMeta">Lv.${html(monsterLevel(primary) || '-')} / ID ${html(monsterId(primary))}</div>
      ${locs.length ? `<div class="qaMapChips">${locs.map(name => mapChip(name, monsterName(primary))).join('')}</div>` : '<div class="empty">目前沒有位置資料。</div>'}
      <div class="qaActions">${monsterChip(primary)}</div>
      ${matches.length > 1 ? suggestionBlock('也可能是：', matches.slice(1), monsterName, 'qa-monster-suggest') : ''}
    </div>`;
  }
  async function answerDrop(query){
    const items = await json('items');
    const reverse = await json('reverse');
    const monsters = await json('monsters');
    const byId = new Map(monsters.map(m => [monsterId(m), m]));
    const term = searchTerm(query);
    const matches = findByName(items, itemName, term, 8);
    if(!matches.length) return null;
    const item = matches[0];
    const id = itemId(item);
    const rows = window.szoBoxSourceRows(reverse[id] || []).slice(0, 12);
    const img = itemIcon(item);
    return `<div class="qaAnswer">
      <div class="qaTitleWithIcon">${img ? `<img src="${html(img)}" alt="">` : ''}<div><h2>${html(itemName(item))} 掉落</h2><div class="qaAnswerMeta">ID ${html(id)} / 共 ${rows.length} 筆${rows.length >= 12 ? '（先顯示前 12 筆）' : ''}</div></div></div>
      ${matches.length > 1 ? suggestionBlock('你是不是想找：', matches, itemName, 'qa-item-suggest') : ''}
      ${rows.length ? `<div class="qaList">${await Promise.all(rows.map(async drop => {
        if(drop.boxId) return `<div class="qaRow"><strong>${html(drop.monsterName)}</strong><span>開箱取得</span><b>${html(rateText(drop.rate))}</b><div class="qaRowActions">${chip('道具資訊', `data-qa-item="${html(drop.boxId)}"`)}</div></div>`;
        const monster = byId.get(String(drop.monsterId)) || { ID:drop.monsterId, Name:drop.monsterName };
        const loc = await locationForMonster(monsterName(monster));
        const locs = String(loc || '').split(/[、,]/).map(x => x.trim()).filter(Boolean);
        return `<div class="qaRow">
          <strong>${html(monsterName(monster))}</strong>
          <span>${locs.length ? locs.slice(0,3).map(x => html(x)).join('、') : '沒有位置資料'}</span>
          <b>${html(rateText(drop.rate))}</b>
          <div class="qaRowActions">${locs.slice(0,2).map(x => mapChip(x, monsterName(monster))).join('')}${monsterChip(monster)}</div>
        </div>`;
      })).then(x => x.join(''))}</div>` : '<div class="empty">目前沒有掉落資料。</div>'}
    </div>`;
  }
  function shopServer(){ try{ return localStorage.getItem('szo-shop-server') === 'free' ? 'free' : 'month'; }catch(e){ return 'month'; } }
  function npcShopEntries(npc){
    const list = Array.isArray(npc.shops) && npc.shops.length ? npc.shops : [{ id: npc.shop }];
    const server = shopServer();
    return list.filter(s => !s.server || s.server === 'both' || s.server === server);
  }
  async function shopLocations(){
    const [shopData, maps] = await Promise.all([json('shops'), json('maps')]);
    const shops = new Map((shopData.shops || []).map(shop => [String(shop.shopId), shop]));
    const rows = [];
    for(const stage of maps.stages || []){
      for(const npc of stage.npcs || []){
        for(const entry of npcShopEntries(npc)){
          const shopId = String(entry.id ?? '').trim();
          if(!shopId || !shops.has(shopId)) continue;
          rows.push({
            stageId: Number(stage.stageId),
            stageName: stage.stageName || '',
            npcName: npc.name || '',
            npcId: String(npc.id || ''),
            shopId,
            conds: entry.conds || [],
            shop: shops.get(shopId)
          });
        }
      }
    }
    return rows.sort((a,b) => a.stageId - b.stageId || a.npcName.localeCompare(b.npcName, 'zh-Hant') || Number(a.shopId) - Number(b.shopId));
  }
  async function answerShop(query, forcedMode, exactItem=state.exactItem){
    const raw = String(query || '');
    const term = searchTerm(raw);
    const locs = await shopLocations();
    const q = norm(exactItem || term || raw);

    function collectRows(mode){
      const rows = [];
      if(!q) return rows;
      for(const loc of locs){
        for(const item of loc.shop?.items || []){
          const priceValue = mode === 'buy' ? item.buyPrice : item.sellPrice;
          if(priceValue === undefined || priceValue === null || priceValue === '') continue;
          if(exactItem){
            if(String(item.name || '').trim() !== exactItem) continue;
          }else{
            const hay = norm([item.name, loc.stageName, loc.npcName].join(' '));
            if(!hay.includes(q)) continue;
          }
          rows.push({ loc, item, priceValue:Number(priceValue) });
        }
      }
      rows.sort((a,b) => mode === 'buy' ? b.priceValue - a.priceValue : a.priceValue - b.priceValue);
      return rows;
    }

    const suggestions = [];
    if(!state.exactItem && raw.trim()){
      const seen = new Set();
      for(const loc of locs){
        for(const item of loc.shop?.items || []){
          const name = String(item.name || '').trim();
          if(!name || seen.has(name) || !norm(name).includes(norm(term || raw))) continue;
          seen.add(name);
          suggestions.push(name);
          if(suggestions.length >= 10) break;
        }
        if(suggestions.length >= 10) break;
      }
    }

    function rowsHtml(rows){
      if(!rows.length) return '<div class="empty">找不到符合的商店資料。</div>';
      return `<div class="qaList">${rows.slice(0, 16).map(row => {
        const img = itemIcon(row.item);
        return `<div class="qaRow qaShopRow">
          <strong>${html(row.loc.stageName)} / ${html(row.loc.npcName)}${row.loc.conds?.length ? `<small class="qaCond">${html(row.loc.conds.join('、'))}</small>` : ''}</strong>
          <span>${img ? `<img src="${html(img)}" alt="">` : ''}${html(row.item.name)}</span>
          <b>${html(money(row.priceValue))}</b>
          <div class="qaRowActions">${mapChip(row.loc.stageName, row.loc.npcName)}</div>
        </div>`;
      }).join('')}</div>`;
    }

    function section(mode, rows){
      return `<div class="qaShopSection">
        <h3>${mode === 'buy' ? '回收資訊' : '販售資訊'}<small class="qaCond">${shopServer() === 'free' ? '免服' : '月服'}</small></h3>
        <div class="qaModeHint">${mode === 'buy' ? '回收依高價優先。' : '販售依低價優先。'}</div>
        ${rowsHtml(rows)}
      </div>`;
    }

    if(forcedMode){
      const rows = collectRows(forcedMode);
      return `<div class="qaAnswer">
        <h2>${forcedMode === 'buy' ? '回收資訊' : '販售資訊'}</h2>
        ${suggestions.length ? `<div class="qaSuggestions"><span>你是不是想找：</span>${suggestions.map(name => chip(name, `data-qa-shop-item="${html(name)}"`)).join('')}</div>` : ''}
        ${section(forcedMode, rows)}
      </div>`;
    }

    const sellRows = collectRows('sell');
    const buyRows = collectRows('buy');
    const hasAny = sellRows.length || buyRows.length;
    return `<div class="qaAnswer">
      <h2>販售及回收資訊</h2>
      ${suggestions.length ? `<div class="qaSuggestions"><span>你是不是想找：</span>${suggestions.map(name => chip(name, `data-qa-shop-item="${html(name)}"`)).join('')}</div>` : ''}
      ${hasAny ? `${section('sell', sellRows)}${section('buy', buyRows)}` : '<div class="empty" data-qa-shop-empty="all">找不到符合的商店資料。</div>'}
    </div>`;
  }
  async function answerAuto(query){
    const intent = intentOf(query);
    if(intent === 'shop') return answerShop(query);
    if(intent === 'drop') return answerDrop(query);
    if(intent === 'location') return answerLocation(query);
    const [items, monsters] = await Promise.all([json('items'), json('monsters')]);
    const term = searchTerm(query);
    const itemMatches = findByName(items, itemName, term, 6);
    const monsterMatches = findByName(monsters, monsterName, term, 6);
    if(itemMatches.length || monsterMatches.length){
      return `<div class="qaAnswer">
        <h2>我找到幾個可能的項目</h2>
        ${itemMatches.length ? `<div class="qaSuggestions"><span>道具：</span>${itemMatches.map(item => chip(itemName(item), `data-qa-item-suggest="${html(itemName(item))}"`)).join('')}</div>` : ''}
        ${monsterMatches.length ? `<div class="qaSuggestions"><span>怪物：</span>${monsterMatches.map(monster => chip(monsterName(monster), `data-qa-monster-suggest="${html(monsterName(monster))}"`)).join('')}</div>` : ''}
        <div class="qaModeHint">可以接著問「哪裡掉」、「在哪」、「哪裡買」。</div>
      </div>`;
    }
    return '<div class="empty">目前找不到符合的資料，可以換完整名稱或加上「哪裡掉 / 哪裡買 / 在哪」。</div>';
  }
  // V844: 練功推薦——「我 300 等去哪練」：角色等級 L 只能從 L～L+300 等的怪物拿經驗，
  // 依「範圍內怪物的經驗 × 數量 ÷ 地圖面積」排出經驗最多、怪物最密集的地方（data/training_spots.json）
  function trainingLevel(raw){
    const q = String(raw || '');
    const m = q.match(/(\d{1,4})\s*(等|級|lv)/i) || (/(練|經驗|升級|適合|去哪)/.test(q) ? q.match(/(\d{1,4})/) : null);
    const lv = m ? Number(m[1]) : 0;
    return lv >= 1 && lv <= 3000 && /(練|經驗|升級|適合|去哪|哪裡|推薦|打怪|等|級)/.test(q) ? lv : 0;
  }
  const trainState = { filter: 'all' };
  // V850: 掛機路線。出生點位置、重生秒數取自遊戲地圖檔；data/training_walk.json 是地圖可走格
  // （8×8 圖上單位一格，樹、水、建築、牆都不能走），所有距離都照真的走得到的路算，牆後的怪打不到。
  // 角色跑速與秒殺時間用大概值：跑速每秒約 9 圖上單位（約 2.3 個遊戲座標，依玩家在齊襄道的實際掛機推回），
  // 每隻 1 秒。站樁＝走路一個畫面內打得到的怪；可定點的地圖再算「掛在 A、傳送大法定點在 B、每 60 秒
  // 傳送一次、從 B 沿路打回 A」。
  const TR = { speed: 9, kill: 1, cycle: 60, stand: 100, reach: 45 };
  const walkCache = new Map();
  function walkGrid(walk, sid){
    if(walkCache.has(sid)) return walkCache.get(sid);
    const w = walk && walk[sid]; let g = null;
    if(w){
      const [W, H, rle] = w, a = new Uint8Array(W * H); let i = 0, v = 0;
      for(const t of rle.split(',')){ const n = parseInt(t, 36); if(v) a.fill(1, i, i + n); i += n; v ^= 1; }
      g = { W, H, a };
    }
    walkCache.set(sid, g);
    return g;
  }
  // 從一格出發的走路距離（圖上單位，8 方向），超過 max 就停；回傳距離與來源格（畫路線用）
  function walkFrom(g, start, max){
    const N = g.W * g.H, dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const step = [[1, 0, 8], [-1, 0, 8], [0, 1, 8], [0, -1, 8], [1, 1, 11.3], [1, -1, 11.3], [-1, 1, 11.3], [-1, -1, 11.3]];
    const buckets = []; dist[start] = 0; buckets[0] = [start];
    for(let b = 0; b < buckets.length; b++){
      const list = buckets[b]; if(!list) continue;
      for(const c of list){
        const d = dist[c]; if(Math.floor(d) !== b) continue;
        const x = c % g.W, y = (c - x) / g.W;
        for(const [dx, dy, w] of step){
          const nx = x + dx, ny = y + dy; if(nx < 0 || ny < 0 || nx >= g.W || ny >= g.H) continue;
          const n = ny * g.W + nx; if(!g.a[n]) continue;
          if(dx && dy && (!g.a[y * g.W + nx] || !g.a[ny * g.W + x])) continue; // 不切牆角
          const nd = d + w; if(nd > max || nd >= dist[n]) continue;
          dist[n] = nd; prev[n] = c; (buckets[Math.floor(nd)] ||= []).push(n);
        }
      }
    }
    return { dist, prev };
  }
  function bestSpot(s, ok, walk){
    const g = walkGrid(walk, s.s), pts = [];
    for(const [mi, x, y] of s.p || []){
      const m = s.m[mi]; if(!ok(m)) continue;
      let cell = -1;
      if(g){ // 出生點的格子；落在障礙邊上就找最近的可走格
        const cx = Math.min(g.W - 1, Math.floor(x / 8)), cy = Math.min(g.H - 1, Math.floor(y / 8));
        let bd = Infinity;
        for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){
          const nx = cx + dx, ny = cy + dy; if(nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || !g.a[ny * g.W + nx]) continue;
          if(dx * dx + dy * dy < bd){ bd = dx * dx + dy * dy; cell = ny * g.W + nx; }
        }
      }
      pts.push({ x, y, cell, exp: m[2], r: m[4] });
    }
    if(!pts.length) return null;
    const cap = TR.cycle / TR.kill; // 每分鐘最多秒殺幾隻
    const standOf = c => {
      let mem;
      if(g && c.cell >= 0){ const { dist } = walkFrom(g, c.cell, TR.stand); mem = pts.filter(p => p.cell >= 0 && dist[p.cell] <= TR.stand); }
      else mem = pts.filter(p => Math.hypot(p.x - c.x, (p.y - c.y) * 4 / 3) <= TR.stand);
      let kpm = mem.reduce((t, p) => t + 60 / p.r, 0), v = mem.reduce((t, p) => t + p.exp * 60 / p.r, 0);
      if(kpm > cap){ v *= cap / kpm; kpm = cap; }
      return { mode: 'stand', a: c, mem, v, kpm };
    };
    const stands = pts.map(standOf).sort((x, y) => y.v - x.v);
    let best = stands[0];
    if(g && !(s.f & 1)){
      const maxWalk = TR.cycle * TR.speed;
      for(const A of stands.slice(0, 6)){
        if(A.a.cell < 0) continue;
        const { dist, prev } = walkFrom(g, A.a.cell, maxWalk);
        const Bs = pts.filter(p => p.cell >= 0 && dist[p.cell] > TR.stand && dist[p.cell] <= maxWalk).sort((x, y) => dist[y.cell] - dist[x.cell]);
        for(const B of Bs.filter((_, i) => i % Math.max(1, Math.ceil(Bs.length / 16)) === 0)){
          const path = []; for(let c = B.cell; c >= 0; c = prev[c]) path.push(c);
          const onPath = new Map(path.map(c => [c, dist[c]]));
          const R = Math.ceil(TR.reach / 8);
          const mem = pts.filter(p => {
            if(p.cell < 0) return false;
            const px = p.cell % g.W, py = (p.cell - px) / g.W;
            for(let dy = -R; dy <= R; dy++) for(let dx = -R; dx <= R; dx++){
              const d = onPath.get((py + dy) * g.W + px + dx);
              if(d !== undefined && Math.hypot(dx, dy) * 8 <= TR.reach && dist[p.cell] <= d + TR.reach * 1.5) return true;
            }
            return false;
          });
          const t = dist[B.cell] / TR.speed + mem.length * TR.kill;
          if(t > TR.cycle) continue;
          // 回到 A 之後待到下次傳送，A 附近重生好的再打一次
          const rest = TR.cycle - t, inMem = new Set(mem);
          let v = mem.reduce((s2, p) => s2 + p.exp, 0), kpm = mem.length;
          for(const p of A.mem){ const k = Math.min(Math.floor(rest / p.r), inMem.has(p) ? Math.floor(rest / p.r) : 1 + Math.floor(rest / p.r)); v += k * p.exp; kpm += k; }
          if(kpm > cap){ v *= cap / kpm; kpm = cap; }
          if(v > best.v) best = { mode: 'route', a: A.a, b: B, mem: [...new Set([...mem, ...A.mem])], v, kpm, path, t, W: g.W };
        }
      }
    }
    return best;
  }
  async function answerTraining(lv){
    const [data, walk] = await Promise.all([json('training'), json('walk').catch(() => null)]);
    const hi = lv + 300, fmt = n => Math.round(n).toLocaleString();
    const inst = trainState.filter === 'inst';
    const sec = r => r >= 60 ? `${+(r / 60).toFixed(1)} 分鐘` : `${+r.toFixed(1)} 秒`;
    const xy = (s, c) => s.xy ? [Math.round(s.xy[0] * c.x + s.xy[1] * c.y + s.xy[2]), Math.round(s.xy[3] * c.x + s.xy[4] * c.y + s.xy[5])] : null;
    const rows = [];
    for(const s of data.spots || []){
      if(trainState.filter === 'normal' && s.sec !== '一般地圖') continue;
      if(trainState.filter === 'tower' && s.g !== '終末之塔') continue;
      const ok = m => m[1] >= lv && m[1] <= hi && (inst ? m[4] === 0 : m[4] > 0);
      // 同名同等級同經驗同重生的合併成一行
      const ms = [];
      for(const m of s.m){ if(!ok(m)) continue; const o = ms.find(x => x[0] === m[0] && x[1] === m[1] && x[2] === m[2] && x[4] === m[4]); if(o) o[3] += m[3]; else ms.push(m.slice()); }
      if(!ms.length) continue;
      const n = ms.reduce((t, m) => t + m[3], 0), exp = ms.reduce((t, m) => t + m[2] * m[3], 0);
      const spot = inst ? null : bestSpot(s, ok, walk);
      if(!inst && !spot) continue;
      // 打得到的怪都不掉錢＝不能用修裝助手，長期掛很難（例如終末之塔 38 樓），排在會掉錢的地點後面
      const noMoney = !inst && ms.every(m => !m[5]);
      rows.push({ s, ms, n, exp, spot, noMoney, score: inst ? exp : spot.v });
    }
    rows.sort((a, b) => (a.noMoney - b.noMoney) || b.score - a.score);
    const top = rows.slice(0, 10);
    const tabs = [['all', '全部'], ['normal', '一般地圖'], ['tower', '終末之塔'], ['inst', '副本（不重生）']].map(([k, t]) => `<button type="button" class="qaChip${trainState.filter === k ? ' active' : ''}" data-qa-train-filter="${k}" data-qa-train-lv="${lv}">${t}</button>`).join('');
    const mapName = r => r.s.n.replace(/\s*\d+樓$/, '');
    const coordBtn = (r, c, label) => { const g = xy(r.s, c); return g ? `<button type="button" class="qaChip" data-qa-map="${html(mapName(r))}" data-qa-map-query="" data-qa-map-x="${g[0]}" data-qa-map-y="${g[1]}">${label ? `<b class="qaSpotLbl">${label}</b> ` : ''}(${g[0]}, ${g[1]})</button>` : ''; };
    const where = r => r.spot.mode === 'route'
      ? `<span>掛在</span>${coordBtn(r, r.spot.a, 'A')}<span>傳送大法定點在</span>${coordBtn(r, r.spot.b, 'B')}<span>每 60 秒傳送一次，從 B 沿路打回 A（約 ${Math.round(r.spot.t)} 秒）</span>`
      : `<span>站在</span>${coordBtn(r, r.spot.a, '')}<span>附近掛機</span>`;
    // 小地圖：路線（B→A，沿可走的路）、掛點、打得到的出生點（金點），其他出生點灰點
    const miniMap = r => {
      const s = r.s; if(!s.img || !s.bb) return '';
      const [x0, y0, x1, y1] = s.bb, bw = x1 - x0, bh = y1 - y0, sp = r.spot;
      const inSet = new Set(sp.mem.map(p => p.x + ',' + p.y));
      const dots = (s.p || []).map(([, x, y]) => `<circle cx="${x}" cy="${y}" r="${inSet.has(x + ',' + y) ? 5 : 3.5}" class="${inSet.has(x + ',' + y) ? 'on' : 'off'}"/>`).join('');
      const pin = (c, t) => `<circle cx="${c.x}" cy="${c.y}" r="9" class="pin"/><text x="${c.x}" y="${c.y - 16}">${t}</text>`;
      let body;
      if(sp.mode === 'route'){
        const pl = sp.path.map(c => { const x = c % sp.W, y = (c - x) / sp.W; return `${x * 8 + 4},${y * 8 + 4}`; }).join(' ');
        body = `<polyline points="${pl}"/>${dots}${pin(sp.a, 'A')}${pin(sp.b, 'B')}`;
      } else body = `<ellipse cx="${sp.a.x}" cy="${sp.a.y}" rx="${TR.stand}" ry="${TR.stand * 3 / 4}"/>${dots}`;
      return `<div class="qaMiniMap" style="aspect-ratio:${bw}/${bh};background-image:url('${html(s.img)}');background-size:${(s.W / bw * 100).toFixed(3)}% auto;background-position:${s.W > bw ? (x0 / (s.W - bw) * 100).toFixed(3) : 0}% ${s.H > bh ? (y0 / (s.H - bh) * 100).toFixed(3) : 0}%"><svg viewBox="${x0} ${y0} ${bw} ${bh}" preserveAspectRatio="none">${body}</svg></div>`;
    };
    const stats = r => inst
      ? `<span>打完一輪共 <b>${fmt(r.exp)}</b> 經驗</span><span>怪物 <b>${r.n}</b> 隻</span><span>平均每隻 <b>${fmt(r.exp / r.n)}</b> 經驗</span>`
      : `<span>每分鐘約 <b>${fmt(r.spot.v)}</b> 經驗</span><span>打得到 <b>${r.spot.mem.length}</b> 個出生點・每分鐘約 <b>${+r.spot.kpm.toFixed(1)}</b> 隻</span><span>平均每隻 <b>${fmt(r.exp / r.n)}</b> 經驗</span>`;
    // 終末之塔怎麼上去：31～60 樓斷線重登在 31 樓、61 樓以上在 61 樓（玩家回報，更高樓層未確認）；
    // 玩家用終末速行令（39、49…）飛上去後重登，再從重登樓層往上爬。途中有可能出現守關妖將的樓層會擋路。
    const guardFloors = (data.spots || []).filter(x => x.g === '終末之塔' && (x.f & 4)).map(x => +(x.n.match(/(\d+)樓$/) || [])[1]).filter(Boolean);
    const access = r => {
      if(r.s.g !== '終末之塔') return '';
      const N = +(r.s.n.match(/(\d+)樓$/) || [])[1]; if(!N) return '';
      const R = N >= 31 && N <= 60 ? 31 : N >= 61 && N <= 90 ? 61 : 0;
      const tok = (data.tok || []).filter(t => t <= N).pop();
      const parts = [];
      if(R){
        const g = guardFloors.filter(f => f > R && f < N);
        parts.push(N === R ? `斷線重登就在 ${R} 樓` : `斷線重登在 ${R} 樓，要往上爬 ${N - R} 層${g.length ? `（途經 ${g.join('、')} 樓可能出現守關妖將，出現時上不去）` : ''}`);
      } else if(N > 90) parts.push('斷線重登樓層未確認');
      if(tok && (!R || tok > R)) parts.push(`終末速行令最近可直達 ${tok} 樓${tok < N ? `，再往上 ${N - tok} 層` : ''}`);
      return parts.length ? `<div class="qaTrainAccess"><span>怎麼上去</span>${html(parts.join('；'))}</div>` : '';
    };
    const tags = r => [r.s.g, r.s.f & 1 ? '不能定點' : '', r.s.f & 2 ? '禁止自動掛機' : '', r.s.f & 4 ? '可能出現守關妖將' : '', r.s.f & 8 ? '有怪王死後消失' : '', r.noMoney ? '怪物不掉錢' : ''].filter(Boolean).map((t, i) => `<span class="qaTrainTag${i ? ' warn' : ''}">${html(t)}</span>`).join('');
    const card = (r, i) => `<div class="qaTrain"><div class="qaTrainHead"><b class="qaTrainRank">${i + 1}</b><strong>${html(r.s.n)}</strong>${tags(r)}${chip('看地圖', `data-qa-map="${html(mapName(r))}" data-qa-map-query="${html(r.ms[0][0])}"`)}</div>
      <div class="qaTrainStats">${stats(r)}</div>${access(r)}
      ${inst ? '' : `${miniMap(r)}<div class="qaTrainWhere">${where(r)}</div>`}
      <div class="qaTrainMobs">${r.ms.map(m => `<span>${html(m[0])} <small>Lv${m[1]}・${fmt(m[2])} 經驗・${m[3]} 隻・${m[4] > 0 ? sec(m[4]) + '重生' : '不重生'}</small></span>`).join('')}</div></div>`;
    const intro = inst
      ? `這些地圖的怪物打死後不會自動重生（副本、挑戰類），依「打完一輪的總經驗」排序。`
      : `依「每分鐘大約能拿多少經驗」排序。可定點的地圖算「掛在 A、傳送大法定點在 B、每 60 秒傳送一次、從 B 沿路打回 A」；標「不能定點」的只算站在一處、走路一個畫面內打得到的怪。路線與範圍都照地圖上真的能走的路算，不會穿過樹、水、建築或牆。`;
    return `<section class="qaGroup qaTraining"><h3>${lv} 等練功推薦</h3>
      <p class="muted">角色只能從等級 ${lv}～${hi} 的怪物拿到經驗。${intro}魔王不列入。</p>
      <div class="qaTrainTabs">${tabs}</div>
      ${top.length ? top.map(card).join('') : '<div class="empty">這個分類沒有等級在範圍內的怪物。</div>'}
      <p class="muted qaTrainNote"><b>推薦練功位置僅供參考。</b>標「可能出現守關妖將」的終末之塔樓層，守關妖將會隨機出現，出現後約 1 小時不能掛，實際經驗會比顯示的少。有些地圖的怪在王被打死後就不再出現（例如終末之塔 36 樓），這些怪已從練功計算中排除，改列在「副本（不重生）」；標「有怪王死後消失」的地圖表示有部分怪是這樣。標「怪物不掉錢」的地點不能用修裝助手、難以長期掛機，排在其他地點後面。重生時間、出生點位置、障礙物與能否定點、能否自動掛機取自遊戲地圖檔與地圖設定；跑速與打怪時間是大概值（每隻約 1 秒秒殺），實際會依職業、裝備與技能不同。免服經驗 ×0.75、經驗符與活動倍率沒有算進去；終末之塔按樓層計算。點座標可在地圖上看位置。</p></section>`;
  }
  async function answerGlobal(query){
    const tlv = trainingLevel(query);
    if(tlv) return answerTraining(tlv);
    const term = searchTerm(query);
    const [items, monsters, maps] = await Promise.all([json('items'), json('monsters'), json('maps')]);
    const itemMatches = findByName(items, itemName, term, 12);
    const monsterMatches = findByName(monsters, monsterName, term, 12);
    const mapMatches = (maps.stages || []).filter(stage => norm(stage.stageName).includes(norm(term))).slice(0, 10);
    const shopHtml = await answerShop(term);
    const shopHasResult = !shopHtml.includes('data-qa-shop-empty="all"');
    const itemSection = itemMatches.length ? `<div class="qaAnswer" id="qaSecItem"><h2>道具</h2><div class="qaList">${itemMatches.map(item => {
      const img = itemIcon(item);
      return `<div class="qaRow qaShopRow">
        <strong>${html(itemName(item))}</strong>
        <span>${img ? `<img src="${html(img)}" alt="">` : ''}${item.Type ? `${html(typeLabel(item.Type))} / ` : ''}ID ${html(itemId(item))}</span>
        <b></b>
        <div class="qaRowActions">${chip('道具資訊', `data-qa-item="${html(itemId(item))}"`)}${chip('掉落反查', `data-qa-reverse="${html(itemId(item))}"`)}${chip('找商店', `data-qa-shop-item="${html(itemName(item))}"`)}</div>
      </div>`;
    }).join('')}</div></div>` : '';
    const monsterSection = monsterMatches.length ? `<div class="qaAnswer" id="qaSecMonster"><h2>怪物</h2><div class="qaList">${await Promise.all(monsterMatches.map(async monster => {
      const img = monsterIcon(monster);
      const loc = await locationForMonster(monsterName(monster));
      const locs = String(loc || '').split(/[、,]/).map(x => x.trim()).filter(Boolean);
      return `<div class="qaRow qaShopRow">
        <strong>${html(monsterName(monster))}</strong>
        <span>${img ? `<img src="${html(img)}" alt="">` : ''}Lv.${html(monsterLevel(monster) || '-')} / ${locs.slice(0,2).map(x => html(x)).join('、') || '沒有位置資料'}</span>
        <b></b>
        <div class="qaRowActions">${monsterChip(monster)}${locs.slice(0,2).map(x => mapChip(x, monsterName(monster))).join('')}</div>
      </div>`;
    })).then(rows => rows.join(''))}</div></div>` : '';
    const npcRows = [];
    const seenNpc = new Set();
    for(const stage of maps.stages || []){
      for(const npc of stage.npcs || []){
        const key = npc.name + '|' + stage.stageId;
        if(seenNpc.has(key) || !norm(npc.name).includes(norm(term))) continue;
        seenNpc.add(key);
        npcRows.push({ stage, npc, shop: npcShopEntries(npc)[0] });
      }
    }
    npcRows.sort((a,b) => (b.shop ? 1 : 0) - (a.shop ? 1 : 0) || (norm(a.npc.name) === norm(term) ? -1 : 0) || a.stage.stageId - b.stage.stageId);
    const npcSection = npcRows.length ? `<div class="qaAnswer" id="qaSecNpc"><h2>NPC</h2><div class="qaList">${npcRows.slice(0, 12).map(({ stage, npc, shop }) => `<div class="qaRow qaShopRow">
        <strong>${html(npc.name)}</strong>
        <span>${html(stage.stageName)}${shop ? '・商店' : ''}</span>
        <b></b>
        <div class="qaRowActions">${shop ? chip('看商品', `data-qa-npc-shop="${html(stage.stageId)}:${html(npc.id)}"`) : ''}${mapChip(stage.stageName, npc.name)}</div>
      </div>`).join('')}</div></div>` : '';
    if(typeof window.ensureQuestPageLoaded === 'function') await window.ensureQuestPageLoaded().catch(() => null);
    const questRows = typeof window.szoQuestRows === 'function' ? await window.szoQuestRows(term, 30).catch(() => []) : [];
    const questSection = questRows.length ? `<div class="qaAnswer" id="qaSecQuest"><h2>任務</h2><div class="qaLines">${questRows.map(r => `<div class="qaLine"><span class="qaLineMain"><button type="button" class="qaLink" data-qa-quest="${html(r.id)}">${html(r.label)}</button></span><span class="qaLineGet">${html(r.sub)}</span></div>`).join('')}</div></div>` : '';
    const talkRows = typeof window.szoItemTalkRows === 'function' ? await window.szoItemTalkRows(term, 400).catch(() => []) : [];
    const recipeRows = await recipesUsing(items, itemMatches.slice(0, 4));
    // 取得途徑 / 用途: grouped by item, then by relation; long lists fold.
    const npcLine = r => `<div class="qaLine"><span class="qaLineMain"><strong>${html(r.label)}</strong>${r.stageName ? `<small>${html(r.stageName)}</small>` : ''}${r.count > 1 ? `<small>${r.count} 段對話</small>` : ''}</span>${r.gets?.length && r.rel !== 'g' ? `<span class="qaLineGet">換得 ${r.gets.slice(0, 4).map(g => html(g)).join('、')}${r.gets.length > 4 ? '…' : ''}</span>` : ''}<span class="qaLineActs"><button type="button" class="qaMini" data-qa-npc-talk="${html(r.key)}">對話</button>${r.stageName ? `<button type="button" class="qaMini" data-qa-map="${html(r.stageName)}" data-qa-map-query="${html(r.label)}">地圖</button>` : ''}</span></div>`;
    const recipeLine = r => `<div class="qaLine"><span class="qaLineMain">${r.recipeId ? `<button type="button" class="qaLink" data-qa-preview-item="${html(r.recipeId)}">${html(r.recipeName)}</button>` : `<strong>${html(r.recipeName)}</strong>`}<small>需要 ${html(r.material)} × ${html(r.qty)}</small></span>${r.outputId ? `<span class="qaLineGet">產物 <button type="button" class="qaLink" data-qa-preview-item="${html(r.outputId)}">${html(r.outputName)}</button></span>` : ''}</div>`;
    const fold = (rows, line, show = 6) => rows.length <= show + 2 ? rows.map(line).join('') : rows.slice(0, show).map(line).join('') + `<details class="qaMore"><summary>顯示其餘 ${rows.length - show} 筆</summary>${rows.slice(show).map(line).join('')}</details>`;
    const itemOrder = [...new Set([...itemMatches.map(itemName), ...talkRows.map(r => r.item), ...recipeRows.map(r => r.material)])];
    const block = (title, rows, line) => rows.length ? `<div class="qaGroup"><h3>${html(title)}<b>${rows.length}</b></h3><div class="qaLines">${fold(rows, line)}</div></div>` : '';
    const perItem = (build) => itemOrder.map(name => { const body = build(name); return body ? `<div class="qaItemBlock">${itemOrder.length > 1 ? `<h4>${html(name)}</h4>` : ''}${body}</div>` : ''; }).join('');
    const srcItems = itemMatches.filter(it => norm(itemName(it)) === norm(term)).concat(itemMatches.filter(it => norm(itemName(it)) !== norm(term))).slice(0, 3);
    const srcList = (await Promise.all(srcItems.map(it => itemSources(itemId(it)).catch(() => null)))).filter(Boolean);
    const srcTotal = src => SRC_KINDS.reduce((n, [k]) => n + src[k].length, 0);
    const getHtml = srcList.filter(src => srcTotal(src)).map(src => `<div class="qaItemBlock">${srcList.length > 1 ? `<h4>${html(src.name)}</h4>` : ''}${sourcesBody(src, { show: 4 })}</div>`).join('');
    // 用途：拆解・升階材料 (data/exchanges.json)
    const exUse = [];
    const exData = srcItems.length ? await json('exchanges').catch(() => null) : null;
    if(exData) for(const it of srcItems){
      const id = itemId(it), seenEx = new Set();
      for(const r of exData.rows || []){
        const m = (r.m || []).find(x => String(x[2]) === id);
        if(!m) continue;
        const k = r.p + '|' + (r.r || []).map(x => x[0] + x[1]).join();
        if(seenEx.has(k)) continue; seenEx.add(k);
        exUse.push({ item: itemName(it), npc: exData.npcs[r.p], kind: r.k || '', qty: m[1], rewards: r.r || [], pick: !!r.pick });
      }
    }
    const exLine = r => { const place = r.npc?.p?.[0]; return `<div class="qaLine"><span class="qaLineMain"><strong>${html(r.kind || '兌換')}</strong><small>交 ${html(r.item)}${r.qty > 1 ? ' ×' + html(r.qty) : ''}</small></span><span class="qaLineGet">${r.pick ? '擇一 ' : '換得 '}${r.rewards.slice(0, 3).map(x => `<button type="button" class="qaLink" data-qa-preview-item="${html(x[2])}">${html(x[0])}</button>${x[1] > 1 ? '×' + html(x[1]) : ''}`).join('、')}${r.rewards.length > 3 ? '…' : ''}</span><span class="qaLineActs">${place ? `<button type="button" class="qaMini" data-qa-npc-talk="${html(place[0])}:${html(place[1])}">${html(r.npc.n)}</button>` : ''}</span></div>`; };
    const useHtml = perItem(name => block('可製作（配方・兌換加工）', recipeRows.filter(r => r.material === name), recipeLine)
      + block('兌換・拆解・升階材料', exUse.filter(r => r.item === name), exLine)
      + block('交給 NPC 兌換', talkRows.filter(r => r.item === name && r.rel === 't'), npcLine)
      + block('對話需要持有', talkRows.filter(r => r.item === name && r.rel === 'h'), npcLine));
    const getCount = srcList.reduce((n, src) => n + srcTotal(src), 0);
    const useCount = talkRows.filter(r => r.rel !== 'g').length + recipeRows.length + exUse.length;
    // 技能
    let skillRows = [];
    try{
      if(typeof window.ensureSkillPageLoaded === 'function') await window.ensureSkillPageLoaded();
      const sk = typeof window.loadSkillData === 'function' ? await window.loadSkillData() : null;
      const q = norm(term);
      if(sk && q) skillRows = sk.skills.filter(x => norm(x.n).includes(q) || norm(x.tool?.[1]).includes(q)).sort((a, b) => (norm(b.n) === q) - (norm(a.n) === q)).slice(0, 12);
    }catch(e){}
    const skillSection = skillRows.length ? `<div class="qaAnswer" id="qaSecSkill"><h2>技能</h2><div class="qaLines">${skillRows.map(x => `<div class="qaLine"><span class="qaLineMain">${x.ic ? `<img class="qaSkillIcon" src="assets/test-media/skill-icons/${html(x.ic)}.png" alt="" width="24" height="24" loading="lazy">` : ''}<button type="button" class="qaLink" data-qa-skill="${html(x.n)}">${html(x.n)}</button><small>${html(x.k)}・${html(x.t)}${x.lv ? '・Lv' + html(String(x.lv).replace(/（.*$/, '')) : ''}</small></span>${x.tool ? `<span class="qaLineGet">法器 <button type="button" class="qaLink" data-qa-preview-item="${html(x.tool[0])}">${html(x.tool[1])}</button></span>` : ''}</div>`).join('')}</div></div>` : '';
    const getSection = getHtml ? `<div class="qaAnswer" id="qaSecGet"><h2>取得方式</h2>${getHtml}</div>` : '';
    const useSection = useHtml ? `<div class="qaAnswer" id="qaSecUse"><h2>用途</h2>${useHtml}</div>` : '';
    const mapSection = mapMatches.length ? `<div class="qaAnswer" id="qaSecMap"><h2>地圖</h2><div class="qaMapChips">${mapMatches.map(stage => mapChip(stage.stageName, '')).join('')}</div></div>` : '';
    const hasAny = itemMatches.length || monsterMatches.length || mapMatches.length || npcRows.length || getCount || useCount || questRows.length || shopHasResult || skillRows.length;
    if(!hasAny) return '<div class="empty">目前找不到符合的資料，可以換更短或更完整的關鍵字。</div>';
    const nav = [['qaSecItem','道具',itemMatches.length],['qaSecMonster','怪物',monsterMatches.length],['qaSecShop','商店商品',shopHasResult ? '有' : 0],['qaSecUse','用途',useCount],['qaSecGet','取得方式',getCount],['qaSecQuest','任務',questRows.length],['qaSecSkill','技能',skillRows.length],['qaSecNpc','NPC',npcRows.length],['qaSecMap','地圖',mapMatches.length]]
      .filter(x => x[2]).map(([id, label, n]) => `<button type="button" class="qaNavChip" data-qa-jump="${id}">${label}<b>${n}</b></button>`).join('');
    return `<nav class="qaNav">${nav}</nav>${itemSection}${monsterSection}${shopHasResult ? `<div id="qaSecShop">${shopHtml}</div>` : ''}${useSection}${getSection}${questSection}${skillSection}${npcSection}${mapSection}`;
  }
  async function runQuestion(query){
    state.query = String(query || '').trim();
    state.exactItem = '';
    if(!state.query){
      const target = by('qaResults');
      if(target) target.innerHTML = '<div class="empty">請先輸入問題。</div>';
      return;
    }
    resultLoading();
    try{
      const htmlText = await answerGlobal(state.query);
      const target = by('qaResults');
      if(target) target.innerHTML = htmlText || '<div class="empty">目前找不到符合的資料。</div>';
    }catch(err){
      console.error(err);
      const target = by('qaResults');
      if(target) target.innerHTML = '<div class="empty">資料讀取失敗，請重新整理後再試一次。</div>';
    }
  }
  window.SZO_QA_RUN = function(){
    runQuestion(by('qaInput')?.value || '');
  };

  document.addEventListener('submit', ev => {
    if(ev.target?.id !== 'qaForm') return;
    ev.preventDefault();
    runQuestion(by('qaInput')?.value || '');
  });
  document.addEventListener('keydown', ev => {
    if(ev.target?.id !== 'qaInput' || ev.key !== 'Enter' || ev.isComposing) return;
    ev.preventDefault();
    runQuestion(ev.target.value || '');
  });
  document.addEventListener('click', async ev => {
    const submitButton = ev.target.closest?.('[data-qa-search]');
    if(submitButton){
      ev.preventDefault();
      ev.stopPropagation();
      runQuestion(by('qaInput')?.value || '');
      return;
    }
    const jump = ev.target.closest?.('[data-qa-jump]');
    if(jump){ by(jump.dataset.qaJump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const previewItem = ev.target.closest?.('[data-qa-preview-item]');
    if(previewItem){ ev.preventDefault(); window.SZO_PREVIEW?.open('item', previewItem.dataset.qaPreviewItem); return; }
    const srcMon = ev.target.closest?.('[data-qa-src-monster]');
    if(srcMon){ ev.preventDefault(); window.SZO_PREVIEW?.open('monster', srcMon.dataset.qaSrcMonster, true, srcMon.dataset.qaSrcItem || ''); return; }
    const srcShop = ev.target.closest?.('[data-qa-src-npcshop]');
    if(srcShop){ ev.preventDefault(); window.SZO_PREVIEW?.open('npcshop', srcShop.dataset.qaSrcNpcshop); return; }
    const srcEx = ev.target.closest?.('[data-qa-src-exchange]');
    if(srcEx){
      ev.preventDefault();
      const q = srcEx.dataset.qaSrcExchange || '';
      const go = async () => { if(typeof window.ensureExchangePageLoaded === 'function') await window.ensureExchangePageLoaded(); await window.openExchangeSearch?.(q); };
      if(srcEx.closest('dialog[open]') && window.SZO_PREVIEW?.close) window.SZO_PREVIEW.close(() => go().catch(console.error)); else go().catch(console.error);
      return;
    }
    const qaSkill = ev.target.closest?.('[data-qa-skill]');
    if(qaSkill){ ev.preventDefault(); if(typeof window.ensureSkillPageLoaded === 'function') await window.ensureSkillPageLoaded(); await window.openSkillSearch?.(qaSkill.dataset.qaSkill); return; }
    const qaQuest = ev.target.closest?.('[data-qa-quest]');
    if(qaQuest){ ev.preventDefault(); window.SZO_PREVIEW?.open('quest', qaQuest.dataset.qaQuest); return; }
    const npcTalk = ev.target.closest?.('[data-qa-npc-talk]');
    if(npcTalk){ ev.preventDefault(); window.SZO_PREVIEW?.open('npc', npcTalk.dataset.qaNpcTalk); return; }
    const npcShop = ev.target.closest?.('[data-qa-npc-shop]');
    if(npcShop){
      const [sid, nid] = String(npcShop.dataset.qaNpcShop).split(':');
      if(typeof window.ensureShopPageLoaded === 'function') await window.ensureShopPageLoaded();
      if(typeof window.openShopNpc === 'function') await window.openShopNpc(sid, nid);
      return;
    }
    const ex = ev.target.closest?.('[data-qa-example]');
    if(ex){ const q = ex.dataset.qaExample || ''; const input = by('qaInput'); if(input) input.value = q; runQuestion(q); return; }
    if(ev.target?.id === 'qaClear'){ state.query = ''; state.exactItem = ''; renderQaPage(); return; }
    const itemSuggest = ev.target.closest?.('[data-qa-item-suggest]');
    if(itemSuggest){ const q = itemSuggest.dataset.qaItemSuggest || ''; const input = by('qaInput'); if(input) input.value = `${q} 哪裡掉`; runQuestion(`${q} 哪裡掉`); return; }
    const shopItem = ev.target.closest?.('[data-qa-shop-item]');
    if(shopItem){ state.exactItem = shopItem.dataset.qaShopItem || ''; const target = by('qaResults'); if(target){ resultLoading(); target.innerHTML = await answerShop(state.exactItem); } return; }
    const monsterSuggest = ev.target.closest?.('[data-qa-monster-suggest]');
    if(monsterSuggest){ const q = monsterSuggest.dataset.qaMonsterSuggest || ''; const input = by('qaInput'); if(input) input.value = `${q} 在哪`; runQuestion(`${q} 在哪`); return; }
    const tf = ev.target.closest?.('[data-qa-train-filter]');
    if(tf){ trainState.filter = tf.dataset.qaTrainFilter; const target = by('qaResults'); if(target) target.innerHTML = await answerTraining(Number(tf.dataset.qaTrainLv)); return; }
    const map = ev.target.closest?.('[data-qa-map]');
    if(map){
      const mapName = map.dataset.qaMap || '';
      const queryName = map.dataset.qaMapQuery || '';
      if(typeof window.openMapSearchLocation !== 'function' && typeof window.ensureMapPageLoaded === 'function') await window.ensureMapPageLoaded();
      const point = map.dataset.qaMapX ? { x: map.dataset.qaMapX, y: map.dataset.qaMapY } : undefined;
      if(typeof window.openMapSearchLocation === 'function') await window.openMapSearchLocation(mapName, queryName, undefined, point);
      return;
    }
    const monster = ev.target.closest?.('[data-qa-monster]');
    if(monster){
      if(typeof window.ensureMonsterPageLoaded === 'function') await window.ensureMonsterPageLoaded();
      if(typeof window.showMonster === 'function') window.showMonster(monster.dataset.qaMonster);
      return;
    }
    const rev = ev.target.closest?.('[data-qa-reverse]');
    if(rev){
      if(typeof window.ensureItemPageLoaded === 'function') await window.ensureItemPageLoaded();
      if(typeof window.showReverse === 'function') window.showReverse(rev.dataset.qaReverse, 'qa');
    }
    const item = ev.target.closest?.('[data-qa-item]');
    if(item){
      if(typeof window.ensureItemPageLoaded === 'function') await window.ensureItemPageLoaded();
      if(typeof window.showItem === 'function') window.showItem(item.dataset.qaItem);
    }
  });

  window.renderQaShopPreviewHTML = query => answerShop(query, undefined, String(query||''));
  window.renderQaPage = renderQaPage;
})();

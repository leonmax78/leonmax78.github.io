// Stage map lookup page for the test site.
(function(){
  let floatingMap = null, mapReturn = null, floatingRequest = 0;
  function byId(id){
    if(floatingMap?.open){
      if(id === 'reader') return floatingMap.querySelector('.floatingMapBody');
      const found = floatingMap.querySelector(`[id="${id}"]`);
      if(found) return found;
    }
    return document.getElementById(id);
  }
  function closeFloatingMap(){
    if(!floatingMap?.open) return;
    floatingRequest++;
    closeMapShopPanel();
    closeMapMonsterPanel();
    floatingMap.close();
    floatingMap.querySelector('.floatingMapBody').replaceChildren();
    if(mapReturn){
      Object.assign(state, mapReturn.state);
      if(mapReturn.nodes) document.getElementById('reader').replaceChildren(...mapReturn.nodes);
      for(const [el,top,left] of mapReturn.scroll){el.scrollTop=top;el.scrollLeft=left;}
      mapReturn.focus?.focus({preventScroll:true});
      mapReturn = null;
    }
  }
  function enterFloatingMap(){
    if(floatingMap?.open){state.floor=null;state.floorStageId=null;floatingMap.close();floatingMap.showModal();return;}
    const reader = document.getElementById('reader');
    mapReturn = {state:{...state,monsters:new Set(state.monsters),npcs:new Set(state.npcs),panels:{...state.panels}},
      focus:document.activeElement,scroll:[reader,...reader.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>[el,el.scrollTop,el.scrollLeft])};
    if(reader.querySelector('.mapPage')){
      mapReturn.nodes=[...reader.childNodes];
      reader.replaceChildren();
    }
    if(!floatingMap){
      floatingMap=document.createElement('dialog');
      floatingMap.id='floatingMap';floatingMap.className='detailPreview floatingMap';
      floatingMap.setAttribute('aria-label','地圖位置');
      floatingMap.innerHTML='<header class="detailPreviewBar"><strong>地圖位置</strong><button type="button" data-map-window-close title="關閉地圖" aria-label="關閉地圖">×</button></header><div class="detailPreviewBody floatingMapBody"></div>';
      document.body.append(floatingMap);
      floatingMap.addEventListener('cancel',e=>{e.preventDefault();closeFloatingMap();});
      floatingMap.querySelector('[data-map-window-close]').addEventListener('click',closeFloatingMap);
      window.SZO_FLOATING?.enhance(floatingMap);
    }
    state.floor=null;state.floorStageId=null;
    floatingMap.showModal();
  }
  window.SZO_MAP_FLOAT={close:closeFloatingMap,isOpen:()=>!!floatingMap?.open};
  let mapDataPromise = null;
  let mapData = null;
  let shopDataPromise = null;
  let shopData = null;
  let monsterDataPromise = null;
  let monsterData = null;
  let itemDataPromise = null;
  let itemData = null;
  const SHOW_MAP_COORDS = false;
  const state = {
    query: '',
    npcTarget: null,
    stageId: null,
    floor: null,
    floorStageId: null,
    monsters: new Set(),
    npcs: new Set(),
    panels: { monster: true, npc: true, chest: true },
    composing: false,
    zoom: 1,
    maximized: false,
    listHidden: false
  };

  function htmlEscape(s){
    return typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function ensureMapDataLoaded(){
    if(mapData) return mapData;
    if(!mapDataPromise){
      mapDataPromise = fetch('data/stage_maps.json?v=' + encodeURIComponent(document.body?.dataset?.version || 'dev'), { cache: 'force-cache' })
        .then(res => {
          if(!res.ok) throw new Error('地圖資料讀取失敗');
          return res.json();
        })
        .then(data => {
          mapData = data || { stages: [] };
          mapData.stages=(mapData.stages||[]).filter(s=>SZO_MAP_CLASS.visible(s.stageId));
          const pingxi = (mapData.stages || []).find(stage => Number(stage.stageId) === 15);
          if(pingxi){
            for(const marker of pingxi.monsters || []){
              if(marker.activity !== '虛空群魔大遊行') continue;
              // The four spawn clusters follow the owner's annotated map.
              const x = Number(marker.x) * 960 / Number(pingxi.width);
              if(!Number.isFinite(x)) continue;
              marker.pingxiRegion = x < 250 ? 4 : x < 510 ? 3 : x < 650 ? 2 : 1;
              marker.areaKey = `pingxi-region-${marker.pingxiRegion}`;
            }
          }
          return mapData;
        });
    }
    return mapDataPromise;
  }

  async function ensureMapShopDataLoaded(){
    if(shopData) return shopData;
    if(!shopDataPromise){
      shopDataPromise = fetch('data/shop_all.json?v=' + encodeURIComponent(document.body?.dataset?.version || 'dev'), { cache: 'force-cache' })
        .then(res => {
          if(!res.ok) throw new Error('shop data load failed');
          return res.json();
        })
        .then(data => {
          shopData = data || { shops: [] };
          return shopData;
        });
    }
    return shopDataPromise;
  }

  async function fetchMapJson(url){
    const res = await fetch(url + '?v=' + encodeURIComponent(document.body?.dataset?.version || 'dev'), { cache: 'force-cache' });
    if(!res.ok) throw new Error(url + ' load failed');
    return res.json();
  }

  async function fetchMapBundle(key, jsonUrl){
    if(typeof loadDataBundle === 'function'){
      try{
        const data = await loadDataBundle(key);
        if(Array.isArray(data)) return data;
      }catch(e){}
    }
    return fetchMapJson(jsonUrl);
  }

  async function ensureMapMonsterDataLoaded(){
    if(monsterData) return monsterData;
    if(!monsterDataPromise){
      monsterDataPromise = Promise.all([
        fetchMapBundle('monsters', 'data/monsters.json'),
        fetchMapBundle('items', 'data/items.json')
      ]).then(([monsters, items]) => {
        monsterData = Array.isArray(monsters) ? monsters : [];
        itemData = Array.isArray(items) ? items : [];
        return monsterData;
      }).catch(err => {
        monsterDataPromise = null;
        throw err;
      });
    }
    return monsterDataPromise;
  }

  async function ensureMapItemDataLoaded(){
    if(itemData) return itemData;
    if(!itemDataPromise){
      itemDataPromise = fetchMapBundle('items', 'data/items.json').then(items => {
        itemData = Array.isArray(items) ? items : [];
        return itemData;
      }).catch(err => {
        itemDataPromise = null;
        throw err;
      });
    }
    return itemDataPromise;
  }


  async function preloadStageMapData(){
    try{ await ensureMapDataLoaded(); }catch(e){}
    try{ await ensureMapShopDataLoaded(); }catch(e){}
  }

  function shopById(shopId){
    const id = String(shopId || '').trim();
    return (shopData?.shops || []).find(shop => String(shop.shopId) === id) || null;
  }

  function modePrice(item, mode){
    return mode === 'buy' ? item.buyPrice : item.sellPrice;
  }

  function itemHasMode(item, mode){
    const value = modePrice(item, mode);
    return value !== null && value !== undefined && value !== '';
  }

  function mergeShopItems(items, mode){
    const seen = new Map();
    for(const item of items || []){
      const key = [item.name || '', modePrice(item, mode), item.icon || '', item.type || ''].join('|');
      if(!seen.has(key)) seen.set(key, item);
    }
    return [...seen.values()];
  }

  function priceText(value){
    const n = Math.floor(Number(value));
    if(!Number.isFinite(n)) return '-';
    const yi = Math.floor(n / 100000000);
    const wan = Math.floor((n % 100000000) / 10000);
    const rest = n % 10000;
    let text = '';
    if(yi) text += yi + '億';
    if(wan) text += wan + '萬';
    if(rest || !text) text += rest;
    return text + '兩';
  }

  function shopItemIcon(item){
    const media = window.SZO_ASSET_MEDIA;
    if(media && typeof media.itemIconSrc === 'function'){
      const src = media.itemIconSrc(item);
      if(src) return `<span class="mapShopThumb"><img src="${htmlEscape(src)}" alt="" loading="lazy" decoding="async"></span>`;
    }
    return '<span class="mapShopThumb emptyThumb"></span>';
  }

  function itemById(id){
    const target = String(id || '').trim();
    return (itemData || []).find(item => String(item.ID || item.id || '').trim() === target) || null;
  }

  function monsterById(id){
    const target = String(id || '').trim();
    return (monsterData || []).find(monster => String(monster.ID || monster.id || '').trim() === target) || null;
  }

  function parseDropList(value){
    const nums = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
    if(nums.length < 4) return [];
    const raw = [];
    for(let i = 2; i + 1 < nums.length; i += 2){
      const id = String(nums[i]).trim();
      const weight = Number(nums[i + 1]);
      if(id && id !== '0' && Number.isFinite(weight) && weight > 0) raw.push([id, weight]);
    }
    const total = raw.reduce((sum, row) => sum + row[1], 0);
    return total ? raw.map(([id, weight]) => ({ itemId: id, rate: weight / total * 100 })) : [];
  }

  function monsterName(monster, marker){
    return String(monster?.Name || monster?.name || marker?.name || '').trim();
  }

  function monsterLevel(monster, marker){
    return String(monster?.Level || monster?.level || marker?.level || '').trim();
  }

  function mapMonsterDropRows(monster){
    return parseDropList(monster?.DropItem).map(drop => {
      const item = itemById(drop.itemId) || {};
      return {
        itemId: drop.itemId,
        name: item.Name || item.name || `道具 ID ${drop.itemId}`,
        icon: item.Icon || item.icon || '',
        type: item.Type || item.type || '',
        rate: drop.rate.toFixed(6) + '%'
      };
    });
  }

  function monsterDropItemIcon(item){
    const media = window.SZO_ASSET_MEDIA;
    if(media && typeof media.itemIconSrc === 'function'){
      const src = media.itemIconSrc({ ID: item.itemId, Icon: item.icon, Type: item.type, Name: item.name });
      if(src) return `<span class="mapShopThumb"><img src="${htmlEscape(src)}" alt="" loading="lazy" decoding="async"></span>`;
    }
    return '<span class="mapShopThumb emptyThumb"></span>';
  }

  function mapMonsterPanelHtml(marker, monster){
    const name = monsterName(monster, marker);
    const isLoading = monster && monster.__loading;
    const drops = mapMonsterDropRows(monster);
    const portrait = markerImage(Object.assign({ kind: 'monster' }, marker, { pic: monster?.Pic || marker?.pic }));
    const level = monsterLevel(monster, marker);
    return `<div class="mapShopBackdrop" data-map-monster-backdrop>
      <section class="mapShopPanel mapMonsterPanel" role="dialog" aria-label="${htmlEscape(name)}">
        <div class="mapShopHead mapMonsterHead">
          <div class="mapMonsterTitle">
            ${portrait ? `<span class="mapMonsterThumb"><img src="${htmlEscape(portrait)}" alt="" loading="lazy" decoding="async"></span>` : ''}
            <span>
              <h2>${htmlEscape(name || '怪物')}</h2>
              <div class="mapShopMeta">Lv.${htmlEscape(level || '')} / ${htmlEscape(marker.stageName || '')}${htmlEscape(markerAreaSuffix(marker))}</div>
            </span>
          </div>
          <button type="button" class="ghost mapMiniBtn" data-map-monster-close>關閉</button>
        </div>
        <div class="mapShopActions">
          <strong>掉落資訊</strong>
        </div>
        <div class="mapShopItems">
          ${isLoading ? '<div class="empty">掉落資料載入中，請稍等。</div>' : drops.map(item => `<button type="button" class="mapShopItem" data-map-monster-item="${htmlEscape(item.itemId)}">
            ${monsterDropItemIcon(item)}
            <span class="mapShopText"><strong>${htmlEscape(item.name)}</strong></span>
            <span class="mapShopPrice">${htmlEscape(item.rate)}</span>
          </button>`).join('') || '<div class="empty">沒有掉落資料</div>'}
        </div>
        <div class="mapShopActions mapMonsterFooterActions">
          <button type="button" class="ghost mapShopOpenPage" data-map-monster-open-detail>查看怪物資料</button>
        </div>
      </section>
    </div>`;
  }

  async function showMapMonsterPanel(marker){
    closeMapMonsterPanel();
    window.__szoMapMonsterMarker = marker;
    document.body.insertAdjacentHTML('beforeend', mapMonsterPanelHtml(marker, { __loading: true }));
    await ensureMapMonsterDataLoaded();
    await ensureMapItemDataLoaded();
    const monster = monsterById(marker.id) || {};
    closeMapMonsterPanel();
    document.body.insertAdjacentHTML('beforeend', mapMonsterPanelHtml(marker, monster));
    window.__szoMapMonsterMarker = marker;
  }

  function closeMapMonsterPanel(){
    document.querySelectorAll('[data-map-monster-backdrop]').forEach(el => el.remove());
  }

  function shopServer(){ try{ return localStorage.getItem('szo-shop-server') === 'free' ? 'free' : 'month'; }catch(e){ return 'month'; } }
  function npcShopFor(marker){
    const list = Array.isArray(marker?.shops) ? marker.shops : [];
    const server = shopServer();
    const hit = list.find(s => s.server === server) || list.find(s => s.server === 'both' || !s.server);
    return String(hit ? hit.id : (marker?.shop || ''));
  }
  function mapShopPanelHtml(marker, shop, mode){
    const activeMode = mode === 'buy' ? 'buy' : 'sell';
    const items = mergeShopItems((shop?.items || [])
      .filter(item => itemHasMode(item, activeMode))
      .slice(), activeMode);
    const title = `${marker.stageName || ''} / ${marker.name || ''}`;
    return `<div class="mapShopBackdrop" data-map-shop-backdrop>
      <section class="mapShopPanel" role="dialog" aria-label="${htmlEscape(title)}">
        <div class="mapShopHead">
          <div>
            <h2>${htmlEscape(marker.name || '商店')}</h2>
            <div class="mapShopMeta">${htmlEscape(marker.stageName || '')} / Shop ${htmlEscape(shop?.shopId || marker.shop || '')}${marker.variant ? ` · ${shopServer() === 'free' ? '免服' : '月服'}` : ''}</div>
          </div>
          <button type="button" class="ghost mapMiniBtn" data-map-shop-close>關閉</button>
        </div>
        <div class="mapShopActions">
          <div class="mapShopModes">
            <button type="button" class="${activeMode === 'sell' ? 'active' : ''}" data-map-shop-mode="sell">販賣</button>
            <button type="button" class="${activeMode === 'buy' ? 'active' : ''}" data-map-shop-mode="buy">回收</button>
          </div>
          ${marker.variant ? `<div class="mapShopModes mapShopServer" role="group" aria-label="伺服器">
            <button type="button" class="${shopServer() === 'month' ? 'active' : ''}" data-map-shop-server="month">月服</button>
            <button type="button" class="${shopServer() === 'free' ? 'active' : ''}" data-map-shop-server="free">免服</button>
          </div>` : ''}
          <button type="button" class="ghost mapShopOpenPage" data-map-shop-npc-talk>NPC 對話</button>
          <button type="button" class="ghost mapShopOpenPage" data-map-shop-open-page>查看商店頁</button>
        </div>
        <div class="mapShopItems">
          ${items.map(item => `<button type="button" class="mapShopItem" data-map-shop-item="${htmlEscape(item.itemId)}">
            ${shopItemIcon(item)}
            <span class="mapShopText">
              <strong>${htmlEscape(item.name || '')}</strong>
            </span>
            <span class="mapShopPrice">${priceText(modePrice(item, activeMode))}</span>
          </button>`).join('') || '<div class="empty">這個模式沒有商品資料。</div>'}
        </div>
      </section>
    </div>`;
  }

  async function showMapShopPanel(marker, mode){
    await ensureMapShopDataLoaded();
    const shop = shopById(marker.shop);
    if(!shop) return;
    closeMapShopPanel();
    (floatingMap?.open ? floatingMap : document.body).insertAdjacentHTML('beforeend', mapShopPanelHtml(marker, shop, mode || 'sell'));
    window.__szoMapShopMarker = marker;
    window.__szoMapShopMode = mode || 'sell';
  }

  function closeMapShopPanel(){
    document.querySelectorAll('.mapShopBackdrop').forEach(el => el.remove());
  }

  function markerAreaLabel(marker){
    return String(marker?.areaName || marker?.areaLabel || '').trim();
  }

  function markerAreaSuffix(marker){
    const label = markerAreaLabel(marker);
    return label ? ` / ${label}` : '';
  }

  function markerText(marker){
    return `${marker.name || ''} ${marker.id || ''} ${marker.level || ''} ${markerAreaLabel(marker)} ${marker.x || marker.coordX || ''} ${marker.y || marker.coordY || ''}`.toLowerCase();
  }

  function stageMatches(stage, q){
    if(state.npcTarget && q===state.npcTarget.name.toLowerCase()){
      return (stage.npcs||[]).some(n=>String(n.id)===state.npcTarget.id);
    }
    if(!q) return true;
    const head = `${stage.stageId || ''} ${stage.stageName || ''}`.toLowerCase();
    if(head.includes(q)) return true;
    return [...(stage.monsters || []), ...(stage.chests || [])].some(m => markerText(m).includes(q)) || (stage.npcs || []).some(n => markerText(n).includes(q));
  }

  function markerMatches(marker, q){
    if(state.npcTarget && q===state.npcTarget.name.toLowerCase()){
      return marker.kind==='npc' && String(marker.id)===state.npcTarget.id;
    }
    return !q || markerText(marker).includes(q);
  }

  function filteredStages(){
    const q = state.query.trim().toLowerCase();
    return (mapData?.stages || []).filter(stage => stageMatches(stage, q));
  }

  function mapSuggestionKey(kind, id, stageId, name, area){
    return `${kind}:${id || ''}:${stageId || ''}:${name || ''}:${area || ''}`;
  }

  function mapSearchSuggestions(limit = 10){
    const q = state.query.trim().toLowerCase();
    if(!q) return [];
    const rows = [];
    const seen = new Set();
    const push = row => {
      const key = mapSuggestionKey(row.kind, row.id, row.stageId, row.name, row.area || '');
      if(seen.has(key) || rows.length >= limit) return;
      seen.add(key);
      rows.push(row);
    };
    (mapData?.stages || []).forEach(stage => {
      const stageHead = `${stage.stageId || ''} ${stage.stageName || ''}`.toLowerCase();
      if(stageHead.includes(q)){
        push({
          kind: 'stage',
          id: stage.stageId,
          stageId: stage.stageId,
          name: stage.stageName,
          label: `${String(stage.stageId).padStart(3, '0')} ${stage.stageName}`,
          note: '地圖'
        });
      }
      [...monsterGroups(stage), ...monsterGroups(stage, 'chests')].forEach(group => {
        if(markerMatches(group, q)){
          push({
            kind: 'monster',
            id: group.id,
            stageId: stage.stageId,
            name: group.name,
            area: group.areaKey || group.areaName || group.areaLabel || '',
            label: `${group.name}${markerAreaSuffix(group)}`,
            note: `${stage.stageName}${markerAreaSuffix(group)} / Lv.${group.level || ''} / ${group.points?.length || 0} \u9ede`
          });
        }
      });
      (stage.npcs || []).forEach(npc => {
        const row = Object.assign({ kind: 'npc' }, npc);
        if(markerMatches(row, q)){
          push({
            kind: 'npc',
            id: npc.id,
            stageId: stage.stageId,
            name: npc.name,
            label: npc.name,
            note: `${stage.stageName}${roleLabel(npc.role) ? ' / ' + roleLabel(npc.role) : ''}`
          });
        }
      });
    });
    return rows;
  }

  function renderMapSuggestions(){
    const suggestions = mapSearchSuggestions();
    if(!state.query.trim() || !suggestions.length) return '';
    return `<div class="mapSuggestions" aria-label="搜尋候選">
      ${suggestions.map(s => `<button type="button" class="mapSuggestBtn" data-map-suggest="${htmlEscape(s.kind)}" data-id="${htmlEscape(s.id)}" data-stage="${htmlEscape(s.stageId)}" data-name="${htmlEscape(s.name)}" data-area="${htmlEscape(s.area || '')}">
        <span>${htmlEscape(s.label)}</span>
        <small>${htmlEscape(s.note)}</small>
      </button>`).join('')}
    </div>`;
  }

  function restoreMapSearchFocus(pos){
    const input = byId('mapSearchInput');
    if(!input) return;
    input.focus({ preventScroll: true });
    const p = Math.min(Number.isFinite(pos) ? pos : input.value.length, input.value.length);
    try{ input.setSelectionRange(p, p); }catch(e){}
  }

  function applyMapSuggestion(btn){
    state.floor=null;state.floorStageId=null;
    const kind = btn.dataset.mapSuggest;
    const id = btn.dataset.id || '';
    const stageId = Number(btn.dataset.stage);
    const name = btn.dataset.name || '';
    state.query = name;
    state.stageId = stageId;
    state.monsters.clear();
    state.npcs.clear();
    const stage = (mapData?.stages || []).find(s => Number(s.stageId) === stageId);
    if(kind === 'monster' && id){
      const area = btn.dataset.area || '';
      state.monsters.add(`${String(id)}:${String(area)}`);
    }
    if(kind === 'npc' && stage){
      (stage.npcs || []).forEach(n => {
        if(String(n.id || '') === String(id) || String(n.name || '') === name) state.npcs.add(npcKey(n));
      });
    }
    renderLoaded();
  }

  function currentStage(){
    const stages = filteredStages();
    if(!stages.length) return null;
    let stage = stages.find(s => Number(s.stageId) === Number(state.stageId));
    if(!stage){
      stage = stages[0];
      state.stageId = Number(stage.stageId);
      autoCheckMatches(stage);
    }
    if(stage.mapCategory==='tower' && state.floorStageId===Number(stage.stageId) && state.floor){
      return {...stage,stageName:`終末之塔 ${state.floor}樓`,
        monsters:(stage.monsters||[]).filter(m=>m.floor===state.floor),
        npcs:(stage.npcs||[]).filter(m=>m.floor===state.floor),
        chests:(stage.chests||[]).filter(m=>m.floor===state.floor),
        areas:(stage.areas||[]).filter(a=>a.floor===state.floor)};
    }
    return stage;
  }

  function monsterGroupKey(marker){
    const area = marker.areaKey || marker.areaName || marker.areaLabel || (marker.floor ? `tower-floor-${marker.floor}` : '') || marker.groupSignature || '';
    return `${String(marker.id || '')}:${String(area)}`;
  }

  function npcKey(marker){
    return `${marker.id}:${marker.x}:${marker.y}`;
  }

  function markerKey(marker){
    return marker.kind === 'npc' ? npcKey(marker) : monsterGroupKey(marker);
  }

  function autoCheckMatches(stage){
    state.monsters.clear();
    state.npcs.clear();
    const q = state.query.trim().toLowerCase();
    if(!q) return;
    [...monsterGroups(stage), ...monsterGroups(stage, 'chests')].forEach(group => { if(markerMatches(group, q)) state.monsters.add(markerKey(group)); });
    (stage.npcs || []).forEach(n => { if(markerMatches(Object.assign({ kind: 'npc' }, n), q)) state.npcs.add(npcKey(n)); });
  }

  function roleLabel(role){
    return { shop: '商店', function: '功能', mission: '任務', talk: '對話' }[role] || '';
  }

  function markerLabel(marker){
    const lv = marker.level ? ` Lv.${marker.level}` : '';
    const role = marker.kind === 'npc' ? roleLabel(marker.role) : '';
    const roleText = role ? ` / ${role}` : '';
    return `${marker.name || '\u672a\u547d\u540d'}${lv}${markerAreaSuffix(marker)}${roleText}`;
  }

  function coordLabel(marker){
    if(!SHOW_MAP_COORDS) return '';
    const x = marker.coordX ?? marker.x ?? '';
    const y = marker.coordY ?? marker.y ?? '';
    return `(${x}, ${y})`;
  }

  function monsterGroups(stage, collection = 'monsters'){
    const groups = new Map();
    (stage[collection] || []).forEach(marker => {
      const key = monsterGroupKey(marker);
      if(!groups.has(key)){
        groups.set(key, Object.assign({ kind: 'monster', points: [] }, marker));
      }
      groups.get(key).points.push(marker);
    });
    return [...groups.values()].sort((a, b) => {
      if(Number(stage.stageId) === 15){
        const region = (a.pingxiRegion || 99) - (b.pingxiRegion || 99);
        if(region) return region;
      }
      const fa = Number(stage.stageId) === 15 ? 0 : floorSortValue(a), fb = Number(stage.stageId) === 15 ? 0 : floorSortValue(b);
      if(fa !== fb) return fa - fb;
      const la = Number(a.level) || 0, lb = Number(b.level) || 0;
      return la - lb || String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant') || Number(a.id) - Number(b.id);
    });
  }

  function floorSortValue(marker){
    const direct = Number(marker?.floor);
    if(Number.isFinite(direct) && direct >= 0) return direct;
    const text = `${marker?.areaName || ''} ${marker?.areaLabel || ''} ${marker?.areaKey || ''}`;
    const m = text.match(/(?:第|tower-)(\d+)(?:層)?/);
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 99999;
  }

  function monsterGroupLabel(group){
    const lv = group.level ? ` Lv.${group.level}` : '';
    const area = markerAreaLabel(group);
    const areaText = area ? ` / ${area}` : '';
    const count = Array.isArray(group.points) ? group.points.length : 0;
    return `${group.name || '\u672a\u547d\u540d'}${lv}${areaText} / \u5171 ${count} \u9ede`;
  }

  function markerList(stage, kind){
    const rows = kind === 'npc' ? (stage.npcs || []).map(n => Object.assign({ kind: 'npc' }, n)) : monsterGroups(stage, kind === 'chest' ? 'chests' : 'monsters');
    const checked = kind === 'npc' ? state.npcs : state.monsters;
    if(!rows.length) return '<div class="muted mapEmptyLine">沒有資料</div>';
    let previousRegion = null;
    return rows.map(marker => {
      let heading = '';
      if(kind === 'monster' && Number(stage.stageId) === 15 && stage.monsters.some(m => m.activity === '虛空群魔大遊行')){
        const region = marker.pingxiRegion || 0;
        if(region !== previousRegion){
          previousRegion = region;
          const count = rows.filter(row => (row.pingxiRegion || 0) === region).length;
          heading = `<h3 class="mapRegionHeading" data-region="${region}">${region ? `第${['', '一', '二', '三', '四'][region]}區 · ${count} 隻` : '一般怪物'}</h3>`;
        }
      }
      const key = markerKey(marker);
      const label = kind !== 'npc' ? monsterGroupLabel(marker) : `${marker.name || '未命名'}${roleLabel(marker.role) ? ' / ' + roleLabel(marker.role) : ''}`;
      return `${heading}<label class="mapMarkerChoice">
        <input type="checkbox" data-map-${kind}="${htmlEscape(key)}" ${checked.has(key) ? 'checked' : ''}>
        <span>${htmlEscape(label)}</span>
      </label>`;
    }).join('');
  }

  function visibleMarkers(stage){
    const monsterRows = [...(stage.monsters || []), ...(stage.chests || [])].filter(m => state.monsters.has(monsterGroupKey(m))).map(m => Object.assign({ kind: 'monster' }, m));
    const npcRows = (stage.npcs || []).filter(n => state.npcs.has(npcKey(n))).map(n => Object.assign({ kind: 'npc' }, n));
    return monsterRows.concat(npcRows);
  }

  function areaLabels(stage){
    if(Number(stage.stageId) === 15 && (stage.monsters || []).some(m => m.activity === '虛空群魔大遊行')){
      return [
        {name:'第一區', x:82, y:61},
        {name:'第二區', x:59, y:29},
        {name:'第三區', x:43, y:49},
        {name:'第四區', x:17, y:60}
      ].map((area, i) => `<span class="mapAreaLabel mapPingxiRegion" data-region="${i + 1}" style="left:${area.x}%;top:${area.y}%;">${area.name}</span>`).join('');
    }
    return (stage.areas || []).map(area => {
      const left = Math.max(0, Math.min(100, Number(area.x || 0) / (Number(stage.width) || 1) * 100));
      const top = Math.max(0, Math.min(100, Number(area.y || 0) / (Number(stage.height) || 1) * 100));
      const label = area.label || area.name || '';
      if(!label) return '';
      return `<span class="mapAreaLabel" style="left:${left}%;top:${top}%;">${htmlEscape(label)}</span>`;
    }).join('');
  }

  // V774: exits to other maps (from MPC events, tools/import_map_exits.py) — an arrow that
  // points off the map plus the destination's name; tapping it opens that map.
  const EXIT_ARROW = '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="exitGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".55" stop-color="#f2b33d"/><stop offset="1" stop-color="#c47a12"/></linearGradient></defs><path d="M4 15h17V6l15 14-15 14v-9H4z" fill="url(#exitGold)" stroke="#2a1a05" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  function exitLabels(stage){
    const w = Number(stage.width) || 1, h = Number(stage.height) || 1;
    return (stage.exits || []).map(e => {
      const angle = Math.atan2(e.y - h / 2, e.x - w / 2) * 180 / Math.PI;
      const right = e.x > w / 2;
      const y = Math.max(22, Math.min(h - 22, e.y));
      const x = Math.max(22, Math.min(w - 22, e.x));
      const name = `往${e.label}${e.conditional ? '（有條件）' : ''}`;
      return `<button type="button" class="mapExit ${right ? 'toLeft' : 'toRight'}" data-exit-to="${htmlEscape(e.destination)}" style="left:${x / w * 100}%;top:${y / h * 100}%;--a:${angle.toFixed(1)}deg" title="${htmlEscape(name)}（點一下開啟這張地圖）"><span class="mapExitArrow">${EXIT_ARROW}</span><span class="mapExitName">${htmlEscape(name)}</span></button>`;
    }).join('');
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-exit-to]');
    if(!b) return;
    ev.preventDefault();
    state.stageId = Number(b.dataset.exitTo);
    state.floor = null; state.floorStageId = null;
    state.monsters.clear(); state.npcs.clear();
    const stage = currentStage();
    if(stage) autoCheckMatches(stage);
    renderLoaded();
  });
  function transferLabels(stage){
    if(stage.mapCategory!=='tower')return exitLabels(stage);
    const w = Number(stage.width) || 1, h = Number(stage.height) || 1;
    return (stage.transfers || []).map(point => {
      const x = Math.max(105, Math.min(w - 105, point.x));
      let y = point.y > h - 70 ? point.y - 30 : point.y + 32;
      for(const area of stage.areas || []){
        if(Math.abs(x - area.x) < 145 && Math.abs(y - area.y) < 36){
          y = area.y + 40 < h - 18 ? area.y + 40 : area.y - 40;
        }
      }
      const label = `往${point.label}${point.conditional ? '（有條件）' : ''}`;
      return `<span class="mapTransferLabel" data-transfer-event="${point.event}" style="left:${x/w*100}%;top:${y/h*100}%;" title="${htmlEscape(`MPC 事件 ${point.event}；目的地 ${point.destination}，位置 TAG ${point.tag}`)}">→ ${htmlEscape(label)}</span>`;
    }).join('');
  }

  // Ghost City MIXER/MIXER2 portraits that have no alpha attenuation in the PNG.
  // 6066 already stores half alpha, so it must not be faded a second time.
  const ghostCityOpaquePics = new Set([5037,5038,5172,5173,5178,5179,6061,6062,6063,6067]);
  function markerDots(stage){
    const w = Number(stage.width) || 1;
    const h = Number(stage.height) || 1;
    return visibleMarkers(stage).map(marker => {
      const left = Math.max(0, Math.min(100, Number(marker.x || 0) / w * 100));
      const top = Math.max(0, Math.min(100, Number(marker.y || 0) / h * 100));
      const cls = marker.role === 'trap' ? 'npc trapLight' : marker.kind === 'npc' ? 'npc' : 'monster';
      const src = markerImage(marker);
      const fallback = marker.kind === 'npc' ? 'N' : 'M';
      const fade = stage.stageName === '鬼城' && marker.kind === 'npc' && ghostCityOpaquePics.has(Number(marker.pic)) ? ' style="opacity:0.5"' : '';
      const inner = marker.role === 'trap' ? '<span class="trapSpark" aria-hidden="true">✦</span>' : src ? `<img src="${htmlEscape(src)}" alt=""${fade} onerror="szoMapImgRetry(this)"><span hidden>${fallback}</span>` : `<span>${fallback}</span>`;
      const shopAttrs = marker.kind === 'npc' && marker.shop ? ` data-map-shop="${htmlEscape(npcShopFor(marker))}"${(marker.shops || []).some(s => s.server === 'free') ? ' data-map-shop-variant="1"' : ''} data-map-shop-stage="${htmlEscape(stage.stageId)}" data-map-shop-stage-name="${htmlEscape(stage.stageName || '')}" data-map-shop-npc="${htmlEscape(marker.id || '')}" data-map-shop-name="${htmlEscape(marker.name || '')}" data-map-shop-x="${htmlEscape(marker.x ?? '')}" data-map-shop-y="${htmlEscape(marker.y ?? '')}" data-map-shop-coord-x="${htmlEscape(marker.coordX ?? marker.x ?? '')}" data-map-shop-coord-y="${htmlEscape(marker.coordY ?? marker.y ?? '')}"` : '';
      const monsterAttrs = marker.kind === 'monster' ? ` data-map-monster-dot="1" data-map-monster="${htmlEscape(marker.id || '')}" data-map-monster-stage="${htmlEscape(stage.stageId)}" data-map-monster-stage-name="${htmlEscape(stage.stageName || '')}" data-map-monster-name="${htmlEscape(marker.name || '')}" data-map-monster-level="${htmlEscape(marker.level || '')}" data-map-monster-pic="${htmlEscape(marker.pic || '')}" data-map-monster-area="${htmlEscape(markerAreaLabel(marker))}"` : '';
      const npcAttrs = marker.kind === 'npc' && marker.role !== 'trap' && !marker.shop && Number.isFinite(Number(marker.id)) ? ` data-map-npc-dot="${htmlEscape(stage.stageId)}:${htmlEscape(marker.id)}"` : '';
      return `<button type="button" class="mapDot ${cls}${src ? ' withImage' : ''}${marker.shop ? ' shopNpcDot' : ''}" style="left:${left}%;top:${top}%;" title="${htmlEscape(markerLabel(marker))}"${shopAttrs}${monsterAttrs}${npcAttrs}>
        ${inner}
      </button>`;
    }).join('') + placePin(stage);
  }
  // A place named by a quest (e.g. 鬼城 城隍廟 (85, 125)): in-game tile coordinates →
  // map pixels: x = gx·32, y = mapHeight − gy·32 (display coords are raw / 8).
  function placePin(stage){
    const t = state.pointTarget;
    if(!t || String(t.stageId) !== String(stage.stageId)) return '';
    const w = Number(stage.width) || 1, h = Number(stage.height) || 1;
    const left = Math.max(0, Math.min(100, t.gx * 4 / w * 100));
    const top = Math.max(0, Math.min(100, (h - t.gy * 4) / h * 100));
    return `<span class="mapPlacePin" style="left:${left}%;top:${top}%;" title="${htmlEscape(t.name)} (${t.gx}, ${t.gy})"><span class="mapPinBody"><b>📍</b><span>${htmlEscape(t.name)}</span></span></span>`;
  }

  function updateMapSelectionDom(stage){
    const target = stage || currentStage();
    if(!target) return;
    const overlay = document.querySelector('.mapOverlay');
    if(overlay) overlay.innerHTML = markerDots(target);
  }

  const MIN_ZOOM = 0.25;
  // Site map images are 1/8 of the game, so 800% equals the game's 1:1 view (detail comes from R2 tiles).
  const MAX_ZOOM = 8;
  function zoomValue(){
    const n = Number(state.zoom);
    if(!Number.isFinite(n)) return 1;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, n));
  }

  // ---- 1:1 tiles (Cloudflare R2). The 1/8 image stays underneath as the fallback. ----
  const TILE_BASE = 'https://pub-61de3bce509e4bdbbc3565a6e823fd8a.r2.dev/tiles/';
  const tileMeta = new Map();
  let tileFrame = 0;
  function loadTileMeta(stageId){
    if(tileMeta.has(stageId)) return tileMeta.get(stageId);
    const id = String(stageId).padStart(3, '0');
    const p = fetch(`${TILE_BASE}stage${id}/meta.json`, { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(m => { tileMeta.set(stageId, m || null); return m || null; })
      .catch(() => { tileMeta.set(stageId, null); return null; });
    tileMeta.set(stageId, p);
    return p;
  }
  function scheduleTiles(){
    if(tileFrame) return;
    tileFrame = requestAnimationFrame(() => { tileFrame = 0; updateTiles(); });
  }
  function updateTiles(){
    const stage = currentStage();
    const layer = document.querySelector('.mapTileLayer');
    const wrap = document.querySelector('.mapCanvasWrap');
    const imageStage = document.querySelector('.mapImageStage');
    if(!stage || !layer || !wrap || !imageStage) return;
    const sid = Number(stage.stageId);
    const meta = tileMeta.get(sid);
    if(meta === undefined || meta instanceof Promise){ Promise.resolve(loadTileMeta(sid)).then(scheduleTiles); return; }
    if(!meta || layer.dataset.stage !== String(sid)){ layer.innerHTML = ''; layer.dataset.stage = String(sid); if(!meta) return; }
    const z = zoomValue();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = meta.w / (Number(stage.width) || 1);           // game pixels per site-image pixel (8, or 16 for 峨嵋山)
    if(z <= 1.25){ layer.innerHTML = ''; return; }            // normal browsing uses the 1/8 image only; tiles start once zoomed in
    const Z = meta.maxZoom;
    const perScreen = k / (z * dpr);                           // game pixels per screen pixel
    const L = Math.max(0, Math.min(Z, Z - Math.max(0, Math.floor(Math.log2(Math.max(perScreen, 1e-6))))));
    const ts = meta.tile * Math.pow(2, Z - L) / k;            // tile size in site-image pixels
    const rs = imageStage.getBoundingClientRect(), rw = wrap.getBoundingClientRect();
    const pad = 64;
    const x0 = Math.max(0, (Math.max(rw.left, rs.left) - rs.left - pad) / z);
    const y0 = Math.max(0, (Math.max(rw.top, rs.top) - rs.top - pad) / z);
    const x1 = Math.min(Number(stage.width), (Math.min(rw.right, rs.right) - rs.left + pad) / z);
    const y1 = Math.min(Number(stage.height), (Math.min(rw.bottom, rs.bottom) - rs.top + pad) / z);
    if(x1 <= x0 || y1 <= y0) return;
    const id = String(sid).padStart(3, '0');
    const want = new Set();
    for(let ty = Math.floor(y0 / ts); ty * ts < y1; ty++){
      for(let tx = Math.floor(x0 / ts); tx * ts < x1; tx++){
        if(want.size > 400) break;
        const key = `${L}/${tx}_${ty}`;
        want.add(key);
        if(layer.querySelector(`img[data-tile="${key}"]`)) continue;
        const img = document.createElement('img');
        img.dataset.tile = key;
        img.alt = '';
        img.decoding = 'async';
        img.style.cssText = `left:${tx * ts}px;top:${ty * ts}px;width:${ts}px;height:${ts}px`;
        img.onerror = () => img.remove();
        img.onload = () => {
          img.classList.add('ready');
          // once this level is showing, drop tiles of other levels underneath it
          layer.querySelectorAll('img[data-level]').forEach(o => { if(o.dataset.level !== String(L) && !want.has(o.dataset.tile)) o.remove(); });
        };
        img.dataset.level = String(L);
        img.src = `${TILE_BASE}stage${id}/${key}.webp?v=${encodeURIComponent(meta.ver || '')}`;
        layer.appendChild(img);
      }
    }
    layer.querySelectorAll('img[data-level]').forEach(o => { if(o.dataset.level === String(L) && !want.has(o.dataset.tile)) o.remove(); });
  }

  function applyZoomToDom(stage){
    const z = zoomValue();
    const target = stage || currentStage();
    const surface = document.querySelector('.mapZoomSurface');
    const imageStage = document.querySelector('.mapImageStage');
    const label = document.querySelector('.mapZoomBar span');
    if(target && surface){
      surface.style.width = `${Math.round((Number(target.width) || 1) * z)}px`;
      surface.style.height = `${Math.round((Number(target.height) || 1) * z)}px`;
    }
    if(imageStage){ imageStage.style.transform = `scale(${z})`; imageStage.style.setProperty('--mz', String(z)); imageStage.classList.toggle('lifeSize', z >= MAX_ZOOM); }
    if(label) label.textContent = `${Math.round(z * 100)}%`;
    const input = document.getElementById('mapZoomInput');
    if(input && Number(input.value) !== z) input.value = String(z);
    if(label && z >= MAX_ZOOM) label.textContent = '1:1';
    scheduleTiles();
  }

  // V662: fit the whole stage into the visible map frame (used by the 符合畫面 button and when maximizing).
  function fitZoomToFrame(mode){
    const target = currentStage();
    const wrap = document.querySelector('.mapCanvasWrap');
    if(!target || !wrap) return;
    const bar = wrap.querySelector('.mapZoomBar');
    const w = Math.max(80, wrap.clientWidth - 24);
    const h = Math.max(80, wrap.clientHeight - (bar ? bar.offsetHeight : 0) - 24);
    const fitW = w / (Number(target.width) || 1), fitH = h / (Number(target.height) || 1);
    // 'height' fills the frame's height (phones held upright) and leaves sideways dragging; default shows the whole map.
    // 'fill' covers the whole frame (crop is reached by dragging).
    const raw = mode === 'height' ? fitH : mode === 'fill' ? Math.max(fitW, fitH) : Math.min(fitW, fitH);
    state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(raw * 100) / 100));
    applyZoomToDom(target);
    wrap.scrollTop = 0;
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
  }

  function autoFitMode(){
    return window.matchMedia && window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches ? 'height' : 'contain';
  }

  function setMapMaximized(on){
    state.maximized = !!on;
    state.fitKey = null;
    // Phones: start with the marker list tucked away so the map gets the whole screen.
    if(state.maximized && window.matchMedia && window.matchMedia('(max-width: 760px)').matches) state.listHidden = true;
    renderLoaded();
    requestAnimationFrame(() => {
      fitZoomToFrame(state.maximized ? autoFitMode() : 'contain');
      document.querySelector(state.maximized ? '[data-map-max]' : '.mapCanvasWrap [data-map-max]')?.focus({ preventScroll: true });
    });
  }

  function assetManifest(){
    // Same lookup as js/data/asset-media.js: the bundle registers itself under SZO_DATA_BUNDLES.
    return (window.SZO_DATA_BUNDLES && window.SZO_DATA_BUNDLES.asset_manifest) || window.SZO_ASSET_MANIFEST || {};
  }
  function assetBase(){
    return (assetManifest().base) || 'assets/test-media';
  }

  function assetVersion(){
    return String(
      (assetManifest().version) ||
      document.body?.dataset?.version ||
      'dev'
    );
  }

  function withAssetVersion(url){
    const src = String(url || '');
    if(!src) return '';
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}v=${encodeURIComponent(assetVersion())}`;
  }

  function pad4(v){
    return String(v || '').padStart(4, '0');
  }

  // V772: a busy map asks for hundreds of portraits at once and one can fail on a flaky
  // connection; retry twice before falling back to the N / M letter.
  window.szoMapImgRetry = function(img){
    const n = Number(img.dataset.retry || 0);
    if(n < 2){
      img.dataset.retry = String(n + 1);
      const base = img.getAttribute('src').replace(/[&?]r=\d+$/, '');
      setTimeout(() => { img.src = base + (base.includes('?') ? '&' : '?') + 'r=' + Date.now(); }, 600 * (n + 1));
      return;
    }
    img.hidden = true;
    if(img.nextElementSibling) img.nextElementSibling.hidden = false;
    img.parentElement && img.parentElement.classList.remove('withImage');
  };
  // NPCs whose in-game look differs from the client NPC.INI Pic (the server sends another
  // model). Checked against in-game screenshots. id -> {pic, from: only when NPC.INI still says this}
  const NPC_PIC_FIX = {
    6294: {pic: 6039, from: 6239},
    8411: {pic: 6023, from: 6019},
    8319: {pic: 6009, from: 6087},   // 馴獸師（祁州城）
    8320: {pic: 6009, from: 6087},   // 馴獸師（京城）— in game: blue jacket, white cap
    8321: {pic: 6009, from: 6087}    // 馴獸師（玄州城）
  };
  function markerImage(marker){
    if(marker.role === 'trap') return '';
    const pic = marker.pic;
    if(pic === undefined || pic === null || pic === '') return '';
    const base = assetBase();
    if(marker.kind === 'monster') return withAssetVersion(`${base}/monster-portraits/m${pic}.png`);
    const fix = NPC_PIC_FIX[Number(marker.id)];
    if(fix && (!fix.from || Number(fix.from) === Number(pic))) return withAssetVersion(`${base}/npc-portraits/n${fix.pic}.png`);
    return withAssetVersion(`${base}/npc-portraits/n${pic}.png`);
  }

  function mountMapSelector(){
    const select=byId('mapStageSelect');
    if(!select)return;
    const wrap=document.createElement('div');wrap.className='heroCombobox mapStageCombobox';
    const input=document.createElement('input');input.id='mapStageSearch';input.type='text';
    input.value=select.selectedOptions[0]?.textContent || '';
    input.placeholder='搜尋地圖名稱或編號';input.autocomplete='off';
    input.setAttribute('role','combobox');input.setAttribute('aria-label','地圖名稱或編號');
    input.setAttribute('aria-controls','mapStageChoices');input.setAttribute('aria-expanded','false');input.setAttribute('aria-autocomplete','list');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='heroChoiceToggle';toggle.textContent='▾';
    toggle.title='展開地圖名單';toggle.setAttribute('aria-label','展開地圖名單');
    const list=document.createElement('div');list.id='mapStageChoices';list.className='heroChoices';list.hidden=true;
    list.setAttribute('role','listbox');list.setAttribute('aria-label','地圖');
    const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.value=select.selectedOptions[0]?.textContent || '';};
    const show=(query='')=>{
      list.replaceChildren();
      let lastGroup='';
      for(const option of select.options){
        if(query && !option.textContent.toLowerCase().includes(query.trim().toLowerCase()))continue;
        const group=option.parentElement.label||'';
        if(group!==lastGroup){const heading=document.createElement('div');heading.className='muted';heading.textContent=group;list.append(heading);lastGroup=group;}
        const button=document.createElement('button');button.type='button';button.textContent=option.textContent;
        button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));
        button.addEventListener('pointerdown',e=>e.preventDefault());
        button.addEventListener('click',()=>{
          select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));byId('mapStageSearch')?.focus();
        });
        list.append(button);
      }
      if(!list.childElementCount){const empty=document.createElement('div');empty.className='muted';empty.textContent='找不到符合的地圖';list.append(empty);}
      list.hidden=false;input.setAttribute('aria-expanded','true');
      const selected=list.querySelector('[aria-selected="true"]');
      if(!query.trim()&&selected){
        list.scrollTop+=selected.getBoundingClientRect().top-list.getBoundingClientRect().top-(list.clientHeight-selected.offsetHeight)/2;
      }else list.scrollTop=0;
    };
    toggle.addEventListener('click',()=>show());input.addEventListener('click',()=>{show();input.select();});
    input.addEventListener('input',e=>{if(!e.isComposing)show(input.value);});
    input.addEventListener('compositionend',()=>show(input.value));
    input.addEventListener('keydown',e=>{
      if(e.isComposing)return;
      if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)show();(list.querySelector('[aria-selected="true"]')||list.querySelector('button'))?.focus();}
      if(e.key==='Enter' && !list.hidden){e.preventDefault();list.querySelector('button')?.click();}
      if(e.key==='Escape')close();
    });
    list.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();input.focus();}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();(e.key==='ArrowDown' ? e.target.nextElementSibling : e.target.previousElementSibling)?.focus();}
    });
    wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close();});
    select.hidden=true;select.before(wrap);wrap.append(input,toggle,list);
  }

  function renderLoaded(){
    const reader = byId('reader');
    if(!reader) return;
    const stages = filteredStages();
    const stage = currentStage();
    if(!stage){
      reader.innerHTML = `<section class="card mapPage"><h1>地圖查詢</h1>
        <div class="mapToolbar">
        <label>搜尋地圖 / 怪物 / NPC
          <input id="mapSearchInput" value="${htmlEscape(state.query)}" placeholder="例如：京城、大山犬、敖姬">
        </label>
        <button type="button" class="ghost mapClearSearchBtn" data-map-clear-search>清空搜尋</button>
      </div>
      ${renderMapSuggestions()}
        <div class="empty">找不到符合的地圖。</div></section>`;
      return;
    }
    const selectedKey=state.floorStageId===Number(stage.stageId)&&state.floor?`${stage.stageId}:${state.floor}`:String(stage.stageId);
    const scope=SZO_MAP_CLASS.get(stage.stageId);
    const stageOptions = `<optgroup label="${htmlEscape(scope.series||scope.group)}">${stages.filter(s=>SZO_MAP_CLASS.same(s.stageId,scope)).flatMap(s=>{
      const rows=s.mapCategory==='tower'?(s.areas||[]).map(a=>({key:`${s.stageId}:${a.floor}`,label:`終末之塔 ${a.floor}樓`})):[{key:String(s.stageId),label:`${String(s.stageId).padStart(3,'0')} ${s.stageName}`}];
      if(s.mapCategory==='tower'&&selectedKey===String(s.stageId))rows.unshift({key:String(s.stageId),label:s.stageName+'（全圖）'});
      return rows.map(r=>`<option value="${r.key}" ${r.key===selectedKey?'selected':''}>${htmlEscape(r.label)}</option>`);
    }).join('')}</optgroup>`;
    reader.innerHTML = `<section class="card mapPage">
      <h1>地圖查詢</h1>
      <div class="mapToolbar">
        <label>搜尋地圖 / 怪物 / NPC
          <input id="mapSearchInput" value="${htmlEscape(state.query)}" placeholder="例如：京城、大山犬、敖姬">
        </label>
        ${SZO_MAP_CLASS.controls('map',scope)}
        <label>${scope.group==='終末之塔'?'樓層':'地圖'}
          <select id="mapStageSelect">${stageOptions}</select>
        </label>
        <button type="button" class="ghost mapClearSearchBtn" data-map-clear-search>清空搜尋</button>
      </div>
      ${renderMapSuggestions()}
      <div class="mapLayout${state.maximized ? ' mapMaximized' : ''}${state.listHidden ? ' mapListHidden' : ''}">
        ${stage.flags?.includes('STAGE_FLAG_ForbidGive')?'<p class="notice" style="grid-column:1/-1">此地圖禁止交易／給予道具。</p>':''}
        <aside class="mapLeftPane">
        <details class="mapSide mapMonsterSide" data-map-panel="monster" ${state.panels.monster ? 'open' : ''}>
          <summary class="mapSideHead">
            <h2>怪物</h2>
            <div><button type="button" class="ghost mapMiniBtn" data-map-all="monster">全選</button><button type="button" class="ghost mapMiniBtn" data-map-none="monster">全不選</button></div>
          </summary>
          <div class="mapChoiceList">${markerList(stage, 'monster')}</div>
        </details>
        ${(stage.chests || []).length ? `<details class="mapSide mapChestSide" data-map-panel="chest" ${state.panels.chest ? 'open' : ''}>
          <summary class="mapSideHead">
            <h2>寶箱</h2>
            <div><button type="button" class="ghost mapMiniBtn" data-map-all="chest">全選</button><button type="button" class="ghost mapMiniBtn" data-map-none="chest">全不選</button></div>
          </summary>
          <div class="mapChoiceList">${markerList(stage, 'chest')}</div>
        </details>` : ''}
        <details class="mapSide mapNpcSide" data-map-panel="npc" ${state.panels.npc ? 'open' : ''}>
          <summary class="mapSideHead">
            <h2>NPC</h2>
            <div><button type="button" class="ghost mapMiniBtn" data-map-all="npc">全選</button><button type="button" class="ghost mapMiniBtn" data-map-none="npc">全不選</button></div>
          </summary>
          <div class="mapChoiceList">${markerList(stage, 'npc')}</div>
        </details>
        </aside>
        <div class="mapCanvasWrap">
          <div class="mapZoomBar">
            <div class="mapViewTools">
              <button type="button" class="ghost mapToolBtn" data-map-list-toggle aria-pressed="${state.listHidden ? 'true' : 'false'}">${state.listHidden ? '顯示清單' : '隱藏清單'}</button>
              <button type="button" class="ghost mapToolBtn" data-map-fit title="整張地圖縮放到可見範圍">整張地圖</button>
              <button type="button" class="ghost mapToolBtn" data-map-fill title="地圖填滿整個框，超出部分可拖曳查看">填滿畫面</button>
              <button type="button" class="ghost mapToolBtn mapMaxBtn" data-map-max aria-pressed="${state.maximized ? 'true' : 'false'}" title="${state.maximized ? '結束放大（Esc）' : '地圖佔滿整個視窗'}">${state.maximized ? '結束放大' : '放大地圖'}</button>
            </div>
            <label>縮放
              <input id="mapZoomInput" type="range" min="${MIN_ZOOM}" max="${MAX_ZOOM}" step="0.01" value="${zoomValue()}">
            </label>
            <span>${zoomValue() >= MAX_ZOOM ? '1:1' : Math.round(zoomValue() * 100) + '%'}</span>
          </div>
          <div class="mapLoading" id="mapImageLoading">地圖載入中</div>
          <div class="mapZoomSurface" style="width:${Math.round((Number(stage.width)||1)*zoomValue())}px;height:${Math.round((Number(stage.height)||1)*zoomValue())}px;">
            <div class="mapImageStage${zoomValue() >= MAX_ZOOM ? ' lifeSize' : ''}" style="transform:scale(${zoomValue()});--mz:${zoomValue()};width:${Number(stage.width)||1}px;height:${Number(stage.height)||1}px;">
              <img id="mapImage" src="${htmlEscape(withAssetVersion(stage.image))}" alt="${htmlEscape(stage.stageName)}" decoding="async" fetchpriority="high">
              <div class="mapTileLayer" aria-hidden="true"></div>
              <div class="mapAreaOverlay">${areaLabels(stage)}</div>
              <div class="mapTransferOverlay">${transferLabels(stage)}</div>
              <div class="mapOverlay">${markerDots(stage)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
    mountMapSelector();
    // V662: in maximized mode, a newly chosen stage is fitted to the window automatically.
    const fitKey = `${stage.stageId}:${state.floor || ''}`;
    if(state.maximized && state.fitKey !== fitKey && !(state.floorStageId===Number(stage.stageId)&&state.floor)){
      state.fitKey = fitKey;
      requestAnimationFrame(() => fitZoomToFrame(autoFitMode()));
    }
    if(state.floorStageId===Number(stage.stageId)&&state.floor){
      const area=stage.areas?.[0],canvas=reader.querySelector('.mapCanvasWrap');
      if(area&&canvas)requestAnimationFrame(()=>{
        canvas.scrollLeft=Math.max(0,area.x*zoomValue()-canvas.clientWidth/2);
        canvas.scrollTop=Math.max(0,area.y*zoomValue()-canvas.clientHeight/2);
      });
    }
    reader.querySelectorAll('[data-map-panel]').forEach(panel => {
      panel.querySelector('summary').addEventListener('click', event => {
        if(event.target.closest('button')) return;
        event.preventDefault();
        panel.open = !panel.open;
        state.panels[panel.dataset.mapPanel] = panel.open;
      });
      panel.addEventListener('toggle', () => {
        state.panels[panel.dataset.mapPanel] = panel.open;
      });
    });
    const img = byId('mapImage');
    const loading = byId('mapImageLoading');
    if(img && loading){
      const done = () => { loading.hidden = true; };
      if(img.complete) done();
      else img.addEventListener('load', done, { once: true });
      img.addEventListener('error', () => { loading.textContent = '地圖載入失敗'; }, { once: true });
    }
    scheduleTiles();
  }

  async function renderStageMapPage(){
    const wasFloating=!!floatingMap?.open, ticket=floatingRequest;
    if(floatingMap?.open) byId('reader').innerHTML = '<p role="status">地圖載入中…</p>';
    else if(typeof showPageLoading === 'function') showPageLoading('地圖查詢', '地圖載入中，請稍候。');
    else if(byId('reader')) byId('reader').innerHTML = '<section class="card pageLoadingCard"><h1>地圖載入中</h1><div class="muted">正在載入地圖資料，請稍候。</div></section>';
    await ensureMapDataLoaded();
    if(wasFloating&&(!floatingMap?.open||ticket!==floatingRequest))return;
    if(state.stageId === null){
      const first = (mapData.stages || [])[0];
      if(first) state.stageId = Number(first.stageId);
    }
    renderLoaded();
    const prewarmMonsterData = () => {
      ensureMapMonsterDataLoaded().catch(() => {});
    };
    if(typeof requestIdleCallback === 'function') requestIdleCallback(prewarmMonsterData, { timeout: 1500 });
    else setTimeout(prewarmMonsterData, 250);
  }

  let mapDragState = null;
  // V664: two-finger pinch zoom (touch) and Ctrl+wheel / trackpad pinch (desktop), anchored at the fingers or cursor.
  const mapPointers = new Map();
  let mapPinch = null;
  function dragTargetAllowed(target){
    if(!target?.closest) return false;
    if(target.closest('.mapZoomBar,.mapDot,button,input,select,label,a')) return false;
    return !!target.closest('.mapCanvasWrap');
  }
  function zoomAround(wrap, nextZoom, clientX, clientY){
    const imageStage = wrap.querySelector('.mapImageStage');
    if(!imageStage) return;
    const z0 = zoomValue();
    const r0 = imageStage.getBoundingClientRect();
    const px = (clientX - r0.left) / z0, py = (clientY - r0.top) / z0;   // map point under the fingers
    state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    applyZoomToDom();
    const z1 = zoomValue();
    const r1 = imageStage.getBoundingClientRect();
    wrap.scrollLeft += r1.left + px * z1 - clientX;
    wrap.scrollTop += r1.top + py * z1 - clientY;
  }
  function pinchMetrics(){
    const [a, b] = [...mapPointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function startPinch(wrap){
    if(mapDragState){ mapDragState.wrap.classList.remove('dragging'); mapDragState = null; }
    const m = pinchMetrics();
    mapPinch = { wrap, startDist: m.dist, startZoom: zoomValue(), x: m.x, y: m.y };
  }
  function startDragFrom(wrap, pointerId, x, y){
    mapDragState = { wrap, pointerId, x, y };
    wrap.classList.add('dragging');
  }
  function startMapDrag(ev){
    if(ev.button !== undefined && ev.button !== 0) return;
    const wrap = ev.target?.closest?.('.mapCanvasWrap');
    if(!wrap) return;
    // A second finger anywhere on the map starts a pinch, even over a marker.
    if(mapPointers.size === 1 && ev.pointerType === 'touch' && [...mapPointers.values()][0].wrap === wrap){
      mapPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, wrap });
      try{ wrap.setPointerCapture(ev.pointerId); }catch(e){}
      startPinch(wrap);
      ev.preventDefault();
      return;
    }
    if(!dragTargetAllowed(ev.target)) return;
    mapPointers.clear();
    mapPinch = null;
    mapPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, wrap });
    startDragFrom(wrap, ev.pointerId, ev.clientX, ev.clientY);
    try{ wrap.setPointerCapture(ev.pointerId); }catch(e){}
    ev.preventDefault();
  }
  function moveMapDrag(ev){
    const pt = mapPointers.get(ev.pointerId);
    if(!pt) return;
    pt.x = ev.clientX; pt.y = ev.clientY;
    if(mapPinch && mapPointers.size >= 2){
      const m = pinchMetrics();
      // follow the fingers' midpoint while zooming around it
      mapPinch.wrap.scrollLeft -= m.x - mapPinch.x;
      mapPinch.wrap.scrollTop -= m.y - mapPinch.y;
      mapPinch.x = m.x; mapPinch.y = m.y;
      zoomAround(mapPinch.wrap, mapPinch.startZoom * m.dist / mapPinch.startDist, m.x, m.y);
      ev.preventDefault();
      return;
    }
    if(!mapDragState || mapDragState.pointerId !== ev.pointerId) return;
    const dx = ev.clientX - mapDragState.x;
    const dy = ev.clientY - mapDragState.y;
    mapDragState.wrap.scrollLeft -= dx;
    mapDragState.wrap.scrollTop -= dy;
    mapDragState.x = ev.clientX;
    mapDragState.y = ev.clientY;
    ev.preventDefault();
  }
  function endMapDrag(ev){
    const pt = mapPointers.get(ev.pointerId);
    if(!pt) return;
    mapPointers.delete(ev.pointerId);
    try{ pt.wrap.releasePointerCapture(ev.pointerId); }catch(e){}
    if(mapPinch){
      mapPinch = null;
      // one finger still down: keep dragging with it
      const [[id, rest] = []] = [...mapPointers.entries()];
      if(rest) startDragFrom(rest.wrap, id, rest.x, rest.y);
      return;
    }
    if(mapDragState && mapDragState.pointerId === ev.pointerId){
      mapDragState.wrap.classList.remove('dragging');
      mapDragState = null;
    }
  }
  // Trackpad pinch arrives as wheel + ctrlKey; Ctrl+mouse wheel zooms too. Plain wheel still scrolls.
  document.addEventListener('wheel', ev => {
    if(!ev.ctrlKey) return;
    const wrap = ev.target?.closest?.('.mapCanvasWrap');
    if(!wrap) return;
    ev.preventDefault();
    // mouse wheels send ~100 per notch, trackpads a few units per event; cap each step at ±25%
    const factor = Math.max(0.8, Math.min(1.25, Math.exp(-ev.deltaY * 0.0025)));
    zoomAround(wrap, zoomValue() * factor, ev.clientX, ev.clientY);
  }, { passive: false, capture: true });

  document.addEventListener('compositionstart', ev => {
    if(ev.target?.id === 'mapSearchInput') state.composing = true;
  });

  document.addEventListener('scroll', ev => { if(ev.target?.classList?.contains('mapCanvasWrap')) scheduleTiles(); }, true);
  window.addEventListener('resize', scheduleTiles);
  document.addEventListener('pointerdown', startMapDrag, true);
  document.addEventListener('pointermove', moveMapDrag, true);
  document.addEventListener('pointerup', endMapDrag, true);
  document.addEventListener('pointercancel', endMapDrag, true);

  document.addEventListener('compositionend', ev => {
    if(ev.target?.id === 'mapSearchInput'){
      state.composing = false;
      const pos = ev.target.selectionStart ?? ev.target.value.length;
      state.query = ev.target.value || '';
      const stage = currentStage();
      if(stage) autoCheckMatches(stage);
      renderLoaded();
      restoreMapSearchFocus(pos);
    }
  });

  document.addEventListener('input', ev => {
    if(ev.target?.id === 'mapSearchInput'){
      if(state.composing || ev.isComposing) return;
      const pos = ev.target.selectionStart ?? ev.target.value.length;
      state.query = ev.target.value || '';
      const stage = currentStage();
      if(stage) autoCheckMatches(stage);
      renderLoaded();
      restoreMapSearchFocus(pos);
    }
    if(ev.target?.id === 'mapZoomInput'){
      const wrap = ev.target.closest('.mapCanvasWrap');
      if(!wrap) return;
      const bounds = wrap.getBoundingClientRect();
      const top = bounds.top + wrap.clientTop;
      const bottom = top + wrap.clientHeight;
      const barBottom = wrap.querySelector('.mapZoomBar')?.getBoundingClientRect().bottom ?? top;
      const y = (Math.max(top, Math.min(barBottom, bottom)) + bottom) / 2;
      zoomAround(wrap, Number(ev.target.value) || 1, bounds.left + wrap.clientLeft + wrap.clientWidth / 2, y);
    }
    const monster = ev.target?.dataset?.mapMonster || ev.target?.dataset?.mapChest;
    if(monster){
      ev.target.checked ? state.monsters.add(monster) : state.monsters.delete(monster);
      updateMapSelectionDom();
    }
    const npc = ev.target?.dataset?.mapNpc;
    if(npc){
      ev.target.checked ? state.npcs.add(npc) : state.npcs.delete(npc);
      updateMapSelectionDom();
    }
  });

  document.addEventListener('change', ev => {
    const level=ev.target?.id?.match(/^map(Category|Group|Series)Select$/);
    if(level){
      const scope=SZO_MAP_CLASS.change(SZO_MAP_CLASS.get(state.stageId),level[1],ev.target.value);
      const tower=scope.group==='終末之塔';
      const first=(mapData?.stages||[]).find(s=>SZO_MAP_CLASS.same(s.stageId,scope));
      if(!first)return;
      state.query='';state.npcTarget=null;state.stageId=Number(first.stageId);
      state.floor=tower?first.areas[0].floor:null;
      state.floorStageId=tower?state.stageId:null;
      state.monsters.clear();state.npcs.clear();
      const stage=currentStage();
      if(tower){
        monsterGroups(stage).forEach(group=>state.monsters.add(monsterGroupKey(group)));
        (stage.npcs||[]).forEach(n=>state.npcs.add(npcKey(n)));
      }
      renderLoaded();return;
    }
    if(ev.target?.id === 'mapStageSelect'){
      const [stageId,floor]=ev.target.value.split(':').map(Number);
      state.stageId = stageId;
      state.floor = floor||null;
      state.floorStageId = floor?stageId:null;
      state.monsters.clear();state.npcs.clear();
      const stage = currentStage();
      if(stage) autoCheckMatches(stage);
      if(stage&&floor){
        monsterGroups(stage).forEach(group=>state.monsters.add(monsterGroupKey(group)));
        (stage.npcs||[]).forEach(n=>state.npcs.add(npcKey(n)));
      }
      renderLoaded();
    }
  });

  document.addEventListener('click', ev => {
    const monsterDot = ev.target?.closest?.('.mapDot[data-map-monster-dot]');
    if(monsterDot){
      const id = monsterDot.dataset.mapMonster || '';
      if(id){
        ev.preventDefault();
        if(window.SZO_PREVIEW){window.SZO_PREVIEW.open('monster',id);return;}
        showMapMonsterPanel({
          kind: 'monster',
          id,
          name: monsterDot.dataset.mapMonsterName || '',
          level: monsterDot.dataset.mapMonsterLevel || '',
          pic: monsterDot.dataset.mapMonsterPic || '',
          stageId: Number(monsterDot.dataset.mapMonsterStage) || state.stageId,
          stageName: monsterDot.dataset.mapMonsterStageName || '',
          areaName: monsterDot.dataset.mapMonsterArea || ''
        });
        return;
      }
    }
    const npcDot = ev.target?.closest?.('.mapDot[data-map-npc-dot]');
    if(npcDot && window.SZO_PREVIEW){
      ev.preventDefault();
      window.SZO_PREVIEW.open('npc', npcDot.dataset.mapNpcDot);
      return;
    }
    const shopDot = ev.target?.closest?.('[data-map-shop]');
    if(shopDot){
      ev.preventDefault();
      const marker = {
        kind: 'npc',
        id: shopDot.dataset.mapShopNpc || '',
        name: shopDot.dataset.mapShopName || '',
        shop: shopDot.dataset.mapShop || '',
        variant: shopDot.dataset.mapShopVariant === '1',
        stageId: Number(shopDot.dataset.mapShopStage) || state.stageId,
        stageName: shopDot.dataset.mapShopStageName || '',
        x: Number(shopDot.dataset.mapShopX) || 0,
        y: Number(shopDot.dataset.mapShopY) || 0,
        coordX: shopDot.dataset.mapShopCoordX || shopDot.dataset.mapShopX || '',
        coordY: shopDot.dataset.mapShopCoordY || shopDot.dataset.mapShopY || ''
      };
      showMapShopPanel(marker, 'sell');
      return;
    }
    const suggest = ev.target?.closest?.('[data-map-suggest]');
    if(suggest){
      applyMapSuggestion(suggest);
      return;
    }
    const all = ev.target?.closest?.('[data-map-all]')?.dataset.mapAll;
    const none = ev.target?.closest?.('[data-map-none]')?.dataset.mapNone;
    const stage = currentStage();
    if(!stage || (!all && !none)) return;
    const kind = all || none;
    const set = kind === 'npc' ? state.npcs : state.monsters;
    const rows = kind === 'npc' ? (stage.npcs || []).map(n => Object.assign({ kind: 'npc' }, n)) : monsterGroups(stage, kind === 'chest' ? 'chests' : 'monsters');
    rows.forEach(row => set.delete(markerKey(row)));
    if(all) rows.forEach(row => set.add(markerKey(row)));
    const attr = `data-map-${kind}`;
    document.querySelectorAll(`input[${attr}]`).forEach(input => { input.checked = !!all; });
    updateMapSelectionDom(stage);
  });

  document.addEventListener('click', ev => {
    const tool = ev.target?.closest?.('[data-map-max],[data-map-fit],[data-map-fill],[data-map-list-toggle]');
    if(!tool || !tool.closest('.mapPage')) return;
    ev.preventDefault();
    if(tool.hasAttribute('data-map-max')){ setMapMaximized(!state.maximized); return; }
    if(tool.hasAttribute('data-map-fit')){ fitZoomToFrame('contain'); return; }
    if(tool.hasAttribute('data-map-fill')){ fitZoomToFrame('fill'); return; }
    state.listHidden = !state.listHidden;
    const layout = tool.closest('.mapLayout');
    layout?.classList.toggle('mapListHidden', state.listHidden);
    tool.textContent = state.listHidden ? '顯示清單' : '隱藏清單';
    tool.setAttribute('aria-pressed', state.listHidden ? 'true' : 'false');
  });

  document.addEventListener('keydown', ev => {
    if(ev.key !== 'Escape' || !state.maximized || floatingMap?.open) return;
    if(document.querySelector('dialog[open], .mapShopBackdrop')) return; // let an open preview/panel close first
    if(!document.querySelector('.mapLayout.mapMaximized')) return;
    ev.preventDefault();
    setMapMaximized(false);
  });

  document.addEventListener('click', ev => {
    if(!ev.target?.closest?.('[data-map-clear-search]')) return;
    state.query = '';
    state.monsters.clear();
    state.npcs.clear();
    renderLoaded();
  });

  document.addEventListener('click', ev => {
    const serverBtn = ev.target?.closest?.('[data-map-shop-server]');
    if(serverBtn && window.__szoMapShopMarker){
      ev.preventDefault();
      try{ localStorage.setItem('szo-shop-server', serverBtn.dataset.mapShopServer === 'free' ? 'free' : 'month'); }catch(e){}
      const marker = window.__szoMapShopMarker;
      const stage = (mapData?.stages || []).find(s => Number(s.stageId) === Number(marker.stageId));
      const npc = stage?.npcs?.find(n => String(n.id) === String(marker.id));
      if(npc) marker.shop = npcShopFor(npc);
      showMapShopPanel(marker, window.__szoMapShopMode || 'sell');
      const overlay = document.querySelector('.mapOverlay');
      if(overlay && stage) overlay.innerHTML = markerDots(stage);
      return;
    }
    const mode = ev.target?.closest?.('[data-map-shop-mode]');
    if(mode && window.__szoMapShopMarker){
      ev.preventDefault();
      showMapShopPanel(window.__szoMapShopMarker, mode.dataset.mapShopMode || 'sell');
      return;
    }
    const npcTalk = ev.target?.closest?.('[data-map-shop-npc-talk]');
    if(npcTalk && window.__szoMapShopMarker && window.SZO_PREVIEW){
      ev.preventDefault();
      const marker = window.__szoMapShopMarker;
      closeMapShopPanel();
      window.SZO_PREVIEW.open('npc', `${marker.stageId}:${marker.id}`);
      return;
    }
    const openPage = ev.target?.closest?.('[data-map-shop-open-page]');
    if(openPage && window.__szoMapShopMarker){
      ev.preventDefault();
      const marker = window.__szoMapShopMarker;
      closeMapShopPanel();
      (async () => {
        if(typeof window.ensureShopPageLoaded === 'function') await window.ensureShopPageLoaded();
        if(typeof window.openShopLocation === 'function') window.openShopLocation(marker.shop, marker.stageId, marker.id, marker.x, marker.y);
      })();
      return;
    }
    const close = ev.target?.closest?.('[data-map-shop-close]');
    if(close || ev.target?.matches?.('[data-map-shop-backdrop]')){
      ev.preventDefault();
      closeMapShopPanel();
    }
    const monsterDetail = ev.target?.closest?.('[data-map-monster-open-detail]');
    if(monsterDetail && window.__szoMapMonsterMarker){
      ev.preventDefault();
      const marker = window.__szoMapMonsterMarker;
      closeMapMonsterPanel();
      if(window.SZO_PREVIEW){window.SZO_PREVIEW.open('monster',String(marker.id));return;}
      (async () => {
        if(typeof window.showMonster !== 'function'){
          if(typeof window.ensureMonsterPageLoaded === 'function'){
            await window.ensureMonsterPageLoaded();
          }else if(typeof window.loadScriptGroupOnce === 'function'){
            await window.loadScriptGroupOnce('page_monster');
          }else if(typeof window.loadScriptGroup === 'function'){
            await window.loadScriptGroup('page_monster');
          }
        }
        if(typeof window.showMonster === 'function') window.showMonster(marker.id);
      })();
      return;
    }
    const monsterClose = ev.target?.closest?.('[data-map-monster-close]');
    if(monsterClose || ev.target?.matches?.('[data-map-monster-backdrop]')){
      ev.preventDefault();
      closeMapMonsterPanel();
    }
  });


  // ---- NPC info + dialogue viewer (data/npc-talk/n{id}.json, from the game's NPC.INI + MSG files) ----
  const npcTalkCache = new Map();
  const npcTalkState = { data: null, path: [], key: '' };
  async function loadNpcTalk(id){
    if(!npcTalkCache.has(id)){
      const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
      npcTalkCache.set(id, fetch(`data/npc-talk/n${id}.json?v=${v}`, { cache: 'force-cache' }).then(r => r.ok ? r.json() : null).catch(() => null));
    }
    return npcTalkCache.get(id);
  }
  function talkLine(data, id, depth = 0){
    const m = data.msgs[String(id)];
    if(!m || depth > 6) return '';
    if(m.x && m.n?.length) return talkLine(data, m.n[0], depth + 1);
    return m.m || '';
  }
  // Conditional jumps of a line that also has options. A jump to a node with the same text is the
  // designer chaining more checks (小福星 21006 → 21131), so its own jumps are listed in its place.
  function conditionalBranches(data, m, seen = new Set(), depth = 0){
    const out = [];
    if(depth > 4) return out;
    for(const t of m.tr || []){
      if(!t.j || seen.has(t.j)) continue;
      const c = t.c || [];
      if(c.length === 1 && (c[0] === '免服' || c[0] === '月服')) continue;
      seen.add(t.j);
      out.push(t);
    }
    for(const n of m.n || []){
      if(seen.has(n)) continue;
      seen.add(n);
      const to = data.msgs[String(n)];
      if(to && to.m === m.m) out.push(...conditionalBranches(data, to, seen, depth + 1));
      else out.push({ j: n, c: ['其他情況'] });
    }
    return out;
  }
  function npcTalkHTML(){
    const { data, path } = npcTalkState;
    if(!data) return '<p>這個 NPC 沒有對話資料。</p>';
    let id = path[path.length - 1];
    let m = data.msgs[String(id)];
    // a designer branch with one way forward is skipped
    // 月服 / 免服 versions of a line: follow the branch for the chosen server.
    const srv = shopServer() === 'free' ? '免服' : '月服';
    let hasServerBranch = false;
    for(let hop = 0; m && hop < 6; hop++){
      while(m && m.x && (m.n || []).length === 1 && !m.o){ id = m.n[0]; m = data.msgs[String(id)]; }
      const sb = (m?.tr || []).filter(t => t.j && t.c?.length === 1 && (t.c[0] === '免服' || t.c[0] === '月服'));
      if(!sb.length) break;
      hasServerBranch = true;
      const hit = sb.find(t => t.c[0] === srv);
      if(!hit) break;
      id = hit.j; m = data.msgs[String(id)];
    }
    if(!m) return '<p>這個 NPC 沒有對話資料。</p>';
    const serverSwitch = `<span class="npcTalkServer${hasServerBranch ? ' differs' : ''}" title="${hasServerBranch ? '這段對話月服、免服內容不同' : '切換月服／免服版本'}"><button type="button" class="${srv === '月服' ? 'active' : ''}" data-npc-talk-server="month">月服</button><button type="button" class="${srv === '免服' ? 'active' : ''}" data-npc-talk-server="free">免服</button></span>`;
    const nav = `<div class="npcTalkNav">${serverSwitch}${path.length > 1 ? '<button type="button" class="ghost" data-npc-talk-back>← 上一句</button>' : ''}${path.length > 1 ? '<button type="button" class="ghost" data-npc-talk-restart>回到開頭</button>' : ''}</div>`;
    const condChips = list => (list || []).map(c => `<span class="npcTalkCond">${htmlEscape(c)}</span>`).join('');
    const otherSrv = srv === '月服' ? '免服' : '月服';
    const effects = (m.tr || []).filter(t => t.a && !t.j && !(t.c || []).includes(otherSrv));
    const effectBox = effects.length ? `<div class="npcTalkEffects"><b>這段對話會：</b>${effects.map(t => `<div>${condChips(t.c)}${t.a.map(a => `<span class="npcTalkAct${/^交出|^金錢 -/.test(a) ? ' lose' : ''}">${htmlEscape(a)}</span>`).join('')}</div>`).join('')}</div>` : '';
    const branchButtons = () => {
      const seen = new Set();
      const rows = (m.tr || []).filter(t => t.j && !(t.c?.length === 1 && (t.c[0] === '免服' || t.c[0] === '月服'))).map(t => { seen.add(t.j); return t; });
      for(const t of m.tr || []) if(t.j && t.c?.length === 1 && (t.c[0] === '免服' || t.c[0] === '月服')) seen.add(t.j);
      for(const n of m.n || []) if(!seen.has(n)){ seen.add(n); rows.push({ j: n, c: rows.length ? ['其他情況'] : [] }); }
      return `<div class="npcTalkChoices">${rows.map(t => `<button type="button" data-npc-talk-go="${t.j}">${t.c?.length ? `<span class="npcTalkConds">${condChips(t.c)}</span>` : ''}${(t.a || []).length ? `<span class="npcTalkConds">${t.a.map(a => `<span class="npcTalkAct">${htmlEscape(a)}</span>`).join('')}</span>` : ''}<span>${htmlEscape(talkLine(data, t.j).slice(0, 60) || '（無對話）')}</span></button>`).join('')}</div>`;
    };
    if(m.x){
      return `${nav}<p class="npcTalkHint">這裡會依條件接到下列其中一段：</p>${effectBox}${branchButtons()}`;
    }
    const who = m.p ? '你' : (m.w || data.n);   // m.w: another speaker in this NPC's dialogue (MSGNAME)
    const shop = (m.s || []).length ? `<p class="npcTalkHint">此時會打開商店。</p>` : '';
    let next = '';
    if(m.o?.length){
      next = `<div class="npcTalkChoices">${m.o.map(([label, j]) => `<button type="button" ${j ? `data-npc-talk-go="${j}"` : 'disabled'}>${htmlEscape(label)}</button>`).join('')}</div>`;
      // In game the conditional jumps run before this line is shown (e.g. 持有某禮券 → 兌領提示).
      const alt = conditionalBranches(data, m);
      if(alt.length) next += `<details class="npcTalkAlt"><summary>身上帶著特定道具或符合條件時，開頭會改成這些（${alt.length} 種）</summary><div class="npcTalkChoices">${alt.map(t => `<button type="button" data-npc-talk-go="${t.j}"><span class="npcTalkConds">${condChips(t.c)}</span><span>${htmlEscape(talkLine(data, t.j).slice(0, 60) || '（無對話）')}</span></button>`).join('')}</div></details>`;
    }
    else if((m.n || []).length === 1) next = `<div class="npcTalkChoices"><button type="button" data-npc-talk-go="${m.n[0]}">繼續 ▸</button></div>`;
    else if((m.n || []).length > 1) next = `<p class="npcTalkHint">接下來依條件會是：</p>${branchButtons()}`;
    else if(!shop) next = '<div class="npcTalkChoices"><button type="button" data-npc-talk-end>（對話結束）關閉視窗</button></div>';
    if(shop && !next) next = '<div class="npcTalkChoices"><button type="button" data-npc-talk-end>（對話結束）關閉視窗</button></div>';
    const face = !m.p && m.f ? `<img class="npcTalkFace" src="${withAssetVersion(`${assetBase()}/npc-faces/f${m.f}.png`)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    return `${nav}<div class="npcTalkBubble${m.p ? ' you' : ''}${face ? ' hasFace' : ''}">${face}<div class="npcTalkText"><b>${htmlEscape(who)}</b><p>${htmlEscape(m.m || '').replace(/\n/g, '<br>')}</p></div></div>${effectBox}${shop}${next}`;
  }
  window.renderNpcPreviewHTML = async function(key){
    const [stageId, npcId, startMsg] = String(key).split(':');
    await ensureMapDataLoaded();
    const stage = (mapData.stages || []).find(s => String(s.stageId) === String(stageId));
    const marker = stage?.npcs?.find(n => String(n.id) === String(npcId)) || {};
    const data = await loadNpcTalk(npcId);
    npcTalkState.data = data; npcTalkState.path = data ? [data.t] : []; npcTalkState.key = key;
    if(data && startMsg && data.msgs[String(startMsg)] && Number(startMsg) !== data.t) npcTalkState.path.push(Number(startMsg));
    const src = markerImage(Object.assign({ kind: 'npc' }, marker));
    const name = data?.n || marker.name || 'NPC';
    const places = (mapData.stages || []).filter(s => (s.npcs || []).some(n => String(n.id) === String(npcId))).map(s => s.stageName);
    const roles = { shop: '商人', function: '功能 NPC', mission: '任務 NPC', talk: '對話 NPC', normal: 'NPC' };
    return `<div class="itemGroupedDetail npcPreview">
      <header class="itemIdentity">${src ? `<span class="npcPreviewSprite"><img src="${htmlEscape(src)}" alt=""></span>` : ''}<div><h1>${htmlEscape(name)}</h1>
        <div class="npcPreviewMeta">${htmlEscape(roles[marker.role] || 'NPC')}${data?.d ? '・' + htmlEscape(data.d) : ''}</div>
        <div class="npcPreviewMeta">${htmlEscape(stage?.stageName || '')}${places.length > 1 ? `（共 ${places.length} 張地圖：${htmlEscape([...new Set(places)].slice(0, 6).join('、'))}${places.length > 6 ? '…' : ''}）` : ''}</div></div></header>
      <h2>對話</h2><div class="npcTalk" data-npc-talk-key="${htmlEscape(key)}">${npcTalkHTML()}</div>
    </div>`;
  };
  window.openNpcMapFromKey = async function(key){
    const [stageId, npcId, startMsg] = String(key).split(':');
    await ensureMapDataLoaded();
    const stage = (mapData.stages || []).find(s => String(s.stageId) === String(stageId));
    const npc = stage?.npcs?.find(n => String(n.id) === String(npcId));
    if(stage) await window.openMapSearchLocation(stage.stageName, npc?.name || '', npcId);
  };
  window.npcPreviewHasShop = async function(key){
    const [stageId, npcId, startMsg] = String(key).split(':');
    await ensureMapDataLoaded();
    const stage = (mapData.stages || []).find(s => String(s.stageId) === String(stageId));
    return !!stage?.npcs?.find(n => String(n.id) === String(npcId))?.shop;
  };
  document.addEventListener('click', ev => {
    const box = ev.target?.closest?.('.npcTalk');
    if(!box || box.dataset.npcTalkKey !== npcTalkState.key) return;
    const go = ev.target.closest('[data-npc-talk-go]');
    if(go){ ev.preventDefault(); npcTalkState.path.push(Number(go.dataset.npcTalkGo)); }
    else if(ev.target.closest('[data-npc-talk-back]')){ ev.preventDefault(); if(npcTalkState.path.length > 1) npcTalkState.path.pop(); }
    else if(ev.target.closest('[data-npc-talk-restart]')){ ev.preventDefault(); npcTalkState.path = npcTalkState.path.slice(0, 1); }
    else if(ev.target.closest('[data-npc-talk-server]')){ ev.preventDefault(); try{ localStorage.setItem('szo-shop-server', ev.target.closest('[data-npc-talk-server]').dataset.npcTalkServer === 'free' ? 'free' : 'month'); }catch(e){} }
    else if(ev.target.closest('[data-npc-talk-end]')){ ev.preventDefault(); window.SZO_PREVIEW?.close(); return; }
    else return;
    box.innerHTML = npcTalkHTML();
  });

  window.openMonsterMapLocations = async function(monsterId, monsterName){
    enterFloatingMap();
    const ticket=++floatingRequest;
    state.monsters.clear();
    state.npcs.clear();
    await ensureMapDataLoaded();
    if(!floatingMap?.open||ticket!==floatingRequest)return;
    const target = String(monsterId || '');
    let foundName = monsterName || '';
    const stage = (mapData.stages || []).find(s => [...(s.monsters || []),...(s.chests || [])].some(m => {
      const ok = String(m.id) === target;
      if(ok && !foundName) foundName = m.name || '';
      return ok;
    }));
    state.query = foundName || target;
    if(stage){
      state.stageId = Number(stage.stageId);
      [...monsterGroups(stage),...monsterGroups(stage,'chests')].forEach(group => {
        if(String(group.id || '') === target) state.monsters.add(monsterGroupKey(group));
      });
    }
    await renderStageMapPage();
  };

  window.openBeastCaptureMap = async function(place){
    enterFloatingMap();
    const ticket=++floatingRequest;
    await ensureMapDataLoaded();
    if(!floatingMap?.open||ticket!==floatingRequest)return;
    const stage=mapData.stages.find(item=>Number(item.stageId)===Number(place.stageId));
    if(!stage)return;
    const ids=new Set(place.monsterIds.map(String));
    state.stageId=Number(stage.stageId);
    state.query=place.monsterName;
    state.monsters.clear();
    state.npcs.clear();
    monsterGroups(stage).filter(group=>ids.has(String(group.id))).forEach(group=>state.monsters.add(markerKey(group)));
    await renderStageMapPage();
  };

  window.openMapSearchLocation = async function(mapName, queryName, npcId, point){
    enterFloatingMap();
    const ticket=++floatingRequest;
    await ensureMapDataLoaded();
    if(!floatingMap?.open||ticket!==floatingRequest)return;
    const targetMap = String(mapName || '').trim();
    const targetQuery = String(queryName || '').trim();
    state.npcTarget=npcId?{id:String(npcId),name:targetQuery}:null;
    state.pointTarget = null;
    state.monsters.clear();
    state.npcs.clear();
    const norm = value => String(value || '').replace(/\s+/g, '').trim();
    const needle = norm(targetMap);
    const queryNeedle = norm(targetQuery);
    const stages = mapData.stages || [];
    const stageByQuery = queryNeedle ? stages.find(s => (s.monsters || []).some(m => norm(m.name || '').includes(queryNeedle) || queryNeedle.includes(norm(m.name || '')))
      || (s.npcs || []).some(n => norm(n.name || '').includes(queryNeedle) || queryNeedle.includes(norm(n.name || '')))) : null;
    const stage = stages.find(s => norm(s.stageName) === needle)
      || stages.find(s => norm(s.stageName).includes(needle) || needle.includes(norm(s.stageName)))
      || stages.find(s => `${String(s.stageId).padStart(3, '0')} ${s.stageName || ''}`.includes(targetMap))
      || stageByQuery;
    if(stage) state.stageId = Number(stage.stageId);
    if(point && stage && (Number(point.x) || Number(point.y))){
      state.pointTarget = { stageId: stage.stageId, gx: Number(point.x), gy: Number(point.y), name: targetQuery };
      state.query = targetMap;   // nothing on the map is named after the place; show the whole map
      const current = stage;
      await renderStageMapPage();
      return;
    }
    state.query = targetQuery || targetMap;
    const current = stage || currentStage();
    if(current) autoCheckMatches(current);
    await renderStageMapPage();
  };

  window.openShopMapByLabel = async function(label){
    enterFloatingMap();
    const ticket=++floatingRequest;
    await ensureMapDataLoaded();
    await ensureMapShopDataLoaded().catch(() => null);
    if(!floatingMap?.open||ticket!==floatingRequest)return;
    const raw = String(label || '').trim();
    const norm = value => String(value || '').replace(/\s+/g, '').replace(/舖/g, '鋪').trim();
    const text = norm(raw);
    const stageAliases = {
      '京城': '京城',
      '祁州': '祁州城',
      '玄州': '玄州城',
      '勇士村': '山林地訓練營',
      '劍俠村': '葬劍崖護法院',
      '術者村': '紫霞山養心觀',
      '道人村': '黑水潭地龍穴',
      '僧侶村': '踏雲頂梵天寺'
    };
    const npcAliases = {
      '打鐵鋪': '打鐵店長',
      '打鐵舖': '打鐵店長',
      '煉丹術士': '江湖術士',
      '煉丹術師': '江湖術士',
      '劍派傳功長老': '傳功長者',
      '傳功長老': '傳功長者',
      '買賣人': '買賣人'
    };
    let wantedStage = '';
    let wantedNpc = '';
    Object.keys(stageAliases).forEach(alias => {
      if(text.includes(norm(alias))) wantedStage = stageAliases[alias];
    });
    Object.values(stageAliases).forEach(name => {
      if(text.includes(norm(name))) wantedStage = name;
    });
    (mapData.stages || []).forEach(stage => {
      const stageName = norm(stage.stageName);
      if(stageName && text.includes(stageName)) wantedStage = stage.stageName;
    });
    Object.keys(npcAliases).forEach(alias => {
      if(text.includes(norm(alias))) wantedNpc = npcAliases[alias];
    });
    const suffix = text.replace(norm(wantedStage), '');
    if(!wantedNpc && suffix) wantedNpc = raw.replace(wantedStage, '').trim();
    const stage = (mapData.stages || []).find(s => wantedStage && norm(s.stageName) === norm(wantedStage))
      || (mapData.stages || []).find(s => wantedStage && (norm(s.stageName).includes(norm(wantedStage)) || norm(wantedStage).includes(norm(s.stageName))))
      || (mapData.stages || []).find(s => (s.npcs || []).some(n => n.shop && text.includes(norm(n.name || ''))));
    state.monsters.clear();
    state.npcs.clear();
    if(stage){
      state.stageId = Number(stage.stageId);
      const npc = (stage.npcs || []).find(n => n.shop && wantedNpc && norm(n.name) === norm(wantedNpc))
        || (stage.npcs || []).find(n => n.shop && wantedNpc && (norm(n.name).includes(norm(wantedNpc)) || norm(wantedNpc).includes(norm(n.name))))
        || (stage.npcs || []).find(n => n.shop && text.includes(norm(n.name || '')))
        || (stage.npcs || []).find(n => n.shop);
      state.query = npc?.name || raw;
      if(npc) state.npcs.add(npcKey(npc));
    }else{
      state.query = raw;
    }
    await renderStageMapPage();
  };

  window.openShopMapLocation = async function(info){
    enterFloatingMap();
    const ticket=++floatingRequest;
    await ensureMapDataLoaded();
    if(!floatingMap?.open||ticket!==floatingRequest)return;
    const targetStageId = Number(info?.stageId);
    const targetNpcId = String(info?.npcId || '');
    const targetShopId = String(info?.shopId || '');
    const targetX = String(info?.x ?? '');
    const targetY = String(info?.y ?? '');
    state.monsters.clear();
    state.npcs.clear();
    const stage = (mapData.stages || []).find(s => Number(s.stageId) === targetStageId)
      || (mapData.stages || []).find(s => (s.npcs || []).some(n => String(n.shop || '') === targetShopId));
    if(stage){
      state.stageId = Number(stage.stageId);
      const npc = (stage.npcs || []).find(n =>
        String(n.id || '') === targetNpcId
        && (!targetX || String(n.x ?? '') === targetX)
        && (!targetY || String(n.y ?? '') === targetY)
      ) || (stage.npcs || []).find(n => String(n.shop || '') === targetShopId);
      if(npc){
        state.query = npc.name || '';
        state.npcs.add(npcKey(npc));
      }else{
        state.query = info?.npcName || '';
      }
    }
    await renderStageMapPage();
  };

  window.ensureMapPageLoaded = async function(){ return true; };
  window.renderStageMapPage = renderStageMapPage;
})();

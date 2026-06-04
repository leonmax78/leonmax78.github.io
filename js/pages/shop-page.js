// V300: shop sale information page with item detail and container contents.
(function(){
  const SHOP_DATA_URL = 'data/shop_selected_11_fixed.json';
  const SHOP_ORDER = [430,433,436,432,435,438,911,890,891,893,895];
  const state = {
    data: null,
    activeShopId: '430',
    query: '',
    loading: null
  };

  function by(id){ return document.getElementById(id); }
  function escHtml(value){
    if(typeof esc === 'function') return esc(value);
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function itemName(item){ return String(item?.name || item?.Name || '').trim(); }
  function nameOfSafe(row){
    try{ return typeof nameOf === 'function' ? nameOf(row) : String(row?.Name || row?.name || '').trim(); }
    catch(e){ return String(row?.Name || row?.name || '').trim(); }
  }
  function price(value){
    if(value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if(!Number.isFinite(n)) return escHtml(value);
    return n.toLocaleString('zh-TW');
  }
  function syncData(){
    try{ if(typeof window.SZO_SYNC_DATA === 'function') window.SZO_SYNC_DATA(); }catch(e){}
    return window.SZO_DATA || {};
  }
  function getItemIndex(){
    const d = syncData();
    if(d.itemIndex && Object.keys(d.itemIndex).length) return d.itemIndex;
    try{ if(itemIndex && Object.keys(itemIndex).length) return itemIndex; }catch(e){}
    return window.itemIndex || {};
  }
  function getMonsters(){
    const d = syncData();
    if(Array.isArray(d.monsters) && d.monsters.length) return d.monsters;
    try{ if(Array.isArray(monsters) && monsters.length) return monsters; }catch(e){}
    return Array.isArray(window.monsters) ? window.monsters : [];
  }
  function normalizedName(value){
    return String(value || '').replace(/\s+/g, '').trim();
  }
  function parseDropRows(value){
    try{ if(typeof parseDropSafe === 'function') return parseDropSafe(value); }catch(e){}
    try{ if(typeof parseDrop === 'function') return parseDrop(value); }catch(e){}
    const nums = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
    if(nums.length < 4) return [];
    const raw = [];
    for(let i = 2; i + 1 < nums.length; i += 2){
      const id = String(nums[i]).trim();
      const weight = Number(nums[i + 1]);
      if(id && id !== '0' && Number.isFinite(weight) && weight > 0) raw.push([id, weight]);
    }
    const total = raw.reduce((sum, row) => sum + row[1], 0);
    return total ? raw.map(([dropId, weight]) => [dropId, weight / total * 100, weight, total]) : [];
  }
  function findContainerForItem(itemId, names){
    const id = String(itemId || '').trim();
    const wanted = names.map(normalizedName).filter(Boolean);
    const list = getMonsters().filter(row => String(row?.DropItem || '').trim() !== '');
    const byName = list.find(row => wanted.includes(normalizedName(nameOfSafe(row))));
    if(byName) return byName;
    return list.find(row => String(row?.ID || '').trim() === id) || null;
  }
  function containerContents(container){
    const itemsById = getItemIndex();
    return parseDropRows(container?.DropItem).map(([dropId, rate]) => {
      const iid = String(dropId || '').trim();
      const it = itemsById[iid] || null;
      return { itemId: iid, rate: Number(rate) || 0, item: it, name: it ? nameOfSafe(it) : ('道具 ID ' + iid) };
    }).sort((a,b) => b.rate - a.rate || Number(a.itemId) - Number(b.itemId));
  }
  function orderedShops(){
    const shops = Array.isArray(state.data?.shops) ? state.data.shops : [];
    const map = new Map(shops.map(shop => [Number(shop.shopId), shop]));
    const ordered = SHOP_ORDER.map(id => map.get(id)).filter(Boolean);
    shops.forEach(shop => { if(!SHOP_ORDER.includes(Number(shop.shopId))) ordered.push(shop); });
    return ordered;
  }
  async function loadShopData(){
    if(state.data) return state.data;
    if(state.loading) return state.loading;
    state.loading = fetch(SHOP_DATA_URL + '?v=' + encodeURIComponent(document.body?.dataset?.version || 'dev'))
      .then(res => {
        if(!res.ok) throw new Error('Shop data load failed');
        return res.json();
      })
      .then(data => {
        state.data = data;
        const first = orderedShops()[0];
        if(first) state.activeShopId = String(first.shopId);
        return data;
      });
    return state.loading;
  }
  function matches(item, shop){
    const q = state.query.trim().toLowerCase();
    if(!q) return true;
    return [
      shop.shopName,
      shop.shopId,
      item.itemId,
      item.name,
      item.sellPrice,
      item.buyPrice
    ].join(' ').toLowerCase().includes(q);
  }
  function shopNav(shops){
    return '<aside class="shopSideNav">'
      + '<div class="shopSideTitle">商店販售資訊</div>'
      + shops.map(shop => {
        const active = String(shop.shopId) === state.activeShopId;
        return `<button type="button" class="shopSideBtn ${active ? 'active' : ''}" data-shop-tab="${escHtml(shop.shopId)}"><span>${escHtml(shop.shopName)}</span><small>${escHtml(shop.items?.length || 0)} 筆</small></button>`;
      }).join('')
      + '</aside>';
  }
  function shopTable(shop, items){
    const rows = items.map(item => `<tr>
      <td><button type="button" class="shopItemLink" data-shop-item="${escHtml(item.itemId)}" data-shop-name="${escHtml(itemName(item))}">${escHtml(itemName(item))}<small>ID ${escHtml(item.itemId)}</small></button></td>
      <td class="num">${price(item.sellPrice)}</td>
      <td class="num">${price(item.buyPrice)}</td>
    </tr>`).join('');
    return `<section class="shopBlock">
      <div class="shopBlockHead">
        <h2>${escHtml(shop.shopName)}</h2>
        <span>${items.length} / ${shop.items?.length || 0} 筆</span>
      </div>
      <div class="tableWrap shopTableWrap">
        <table class="shopTable">
          <thead><tr><th>物品</th><th>販賣金額</th><th>回收金額</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted">沒有符合條件的物品。</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
  }
  function shopBlocksHTML(shops){
    const searching = state.query.trim() !== '';
    if(searching){
      const blocks = shops.map(shop => {
        const items = (shop.items || []).filter(item => matches(item, shop));
        return items.length ? shopTable(shop, items) : '';
      }).join('');
      return blocks || '<div class="empty">全部商店都沒有符合條件的物品。</div>';
    }
    const visible = shops.filter(shop => String(shop.shopId) === state.activeShopId);
    return visible.map(shop => shopTable(shop, shop.items || [])).join('') || '<div class="empty">沒有商店資料。</div>';
  }
  function updateShopBlocks(){
    const box = document.querySelector('.shopBlocks');
    if(box) box.innerHTML = shopBlocksHTML(orderedShops());
  }
  function renderLoaded(){
    const shops = orderedShops();
    if(!shops.some(shop => String(shop.shopId) === state.activeShopId) && shops[0]) state.activeShopId = String(shops[0].shopId);
    const blocks = shopBlocksHTML(shops);
    const reader = by('reader');
    if(!reader) return;
    reader.innerHTML = `<section class="card shopPage">
      <div class="shopHeader">
        <div>
          <h1>特殊商店販賣資訊</h1>
        </div>
        <div class="shopCount">${shops.length} 間商店</div>
      </div>
      <div class="shopLayout">
        ${shopNav(shops)}
        <div class="shopMainPane">
          <div class="shopTools">
            <input id="shopSearch" value="${escHtml(state.query)}" placeholder="搜尋全部商店的物品、ID、金額">
          </div>
          <div class="shopBlocks">${blocks}</div>
        </div>
      </div>
    </section>`;
    const input = by('shopSearch');
    if(input) input.focus({preventScroll:true});
  }
  async function renderShopPage(){
    window.v86LastView = 'shop';
    const reader = by('reader');
    if(reader) reader.innerHTML = '<section class="card shopPage"><h1>特殊商店販賣資訊</h1><div class="muted">資料載入中...</div></section>';
    try{
      await loadShopData();
      renderLoaded();
    }catch(err){
      if(reader) reader.innerHTML = '<section class="card shopPage"><h1>特殊商店販賣資訊</h1><div class="empty">商店資料載入失敗，請重新整理一次。</div></section>';
    }
    try{ if(typeof closeDrawer === 'function') closeDrawer(); }catch(e){}
    try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){}
  }
  function detailRows(it){
    if(!it) return [];
    try{
      if(typeof itemDetailRows === 'function') return itemDetailRows(it).filter(x => x[1] !== '' && x[1] !== undefined && x[1] !== null && String(x[1]).trim() !== '0');
    }catch(e){}
    return Object.entries(it).filter(([,v]) => v !== '' && v !== undefined && v !== null && String(v).trim() !== '0');
  }
  async function showShopItem(id, fallbackName){
    window.v86LastView = 'shop';
    const itemId = String(id || '').trim();
    const reader = by('reader');
    if(reader) reader.innerHTML = '<section class="card itemCompact"><button class="backBtn" type="button" data-shop-back>← 返回特殊商店販賣資訊</button><h1>資料載入中...</h1></section>';
    if(typeof window.ensureLookupDataLoaded === 'function') await window.ensureLookupDataLoaded();
    const it = getItemIndex()[itemId];
    const title = it ? nameOfSafe(it) : (fallbackName || ('ID ' + itemId));
    const container = findContainerForItem(itemId, [title, fallbackName]);
    const contents = containerContents(container);
    const kv = detailRows(it).map(([k,v]) => {
      const cls = String(v).length > 34 ? ' itemFullRow' : '';
      return `<div class="kv${cls}"><div class="k">${escHtml(k)}</div><div class="v">${escHtml(v)}</div></div>`;
    }).join('');
    const contentRows = contents.map(row => {
      return `<tr>
        <td><button type="button" class="shopItemLink" data-shop-item="${escHtml(row.itemId)}" data-shop-name="${escHtml(row.name)}">${escHtml(row.name)}<small>ID ${escHtml(row.itemId)}</small></button></td>
        <td>${escHtml(row.rate.toFixed(6))}%</td>
      </tr>`;
    }).join('');
    const sourceLine = container ? `<div class="muted">來源資料：${escHtml(nameOfSafe(container))} / ID ${escHtml(container.ID || '')}</div>` : '';
    if(reader){
      reader.innerHTML = `<section class="card itemCompact shopItemDetail">
        <button class="backBtn" type="button" data-shop-back>← 返回特殊商店販賣資訊</button>
        <h1>${escHtml(title)}</h1>
        <div class="muted">商店物品 ID ${escHtml(itemId)}</div>
        <h2>物品說明 ITEM</h2>
        ${it ? `<div class="kvGrid">${kv}</div>` : '<div class="empty">ITEM 資料中找不到這個物品，只顯示商店資料。</div>'}
        <h2>打開後內容 / 掉落資料</h2>
        ${sourceLine}
        ${contents.length ? `<div class="tableWrap"><table class="shopDropTable"><thead><tr><th>道具</th><th>機率</th></tr></thead><tbody>${contentRows}</tbody></table></div>` : '<div class="empty">目前找不到這個物品打開後的內容資料。</div>'}
      </section>`;
    }
    try{ history.pushState({app:'detail',view:'shopItem'}, '', '#shop-item-' + encodeURIComponent(itemId)); }catch(e){}
    try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){}
  }

  document.addEventListener('click', function(ev){
    const shopItem = ev.target && ev.target.closest ? ev.target.closest('[data-shop-item]') : null;
    if(shopItem){
      ev.preventDefault();
      ev.stopPropagation();
      showShopItem(shopItem.dataset.shopItem, shopItem.dataset.shopName || '');
      return;
    }
    const back = ev.target && ev.target.closest ? ev.target.closest('[data-shop-back]') : null;
    if(back){
      ev.preventDefault();
      ev.stopPropagation();
      renderShopPage();
      return;
    }
    const tab = ev.target && ev.target.closest ? ev.target.closest('[data-shop-tab]') : null;
    if(tab){
      ev.preventDefault();
      state.activeShopId = tab.dataset.shopTab || state.activeShopId;
      state.query = '';
      renderLoaded();
    }
  }, true);
  document.addEventListener('input', function(ev){
    if(ev.target && ev.target.id === 'shopSearch'){
      state.query = ev.target.value || '';
      updateShopBlocks();
    }
  }, true);

  window.renderShopPage = renderShopPage;
  window.showShopItem = showShopItem;
})();

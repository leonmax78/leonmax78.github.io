// V208 embedded original reverse UI fallback from app-core.js
function searchReverseItemsOriginalV208(){
 const input=byId('reverseQ'); if(!input)return;
 window.v86ReverseQ=input.value;
 const q=input.value.trim().toLowerCase();
 if(!q){byId('reverseResults').innerHTML='<div class="muted">請輸入道具名稱</div>';return}
 const seenItems=new Set();
 const arr=[];
 for(const it of items){
  if(!itemSearchText(it).includes(q))continue;
  const key=String(it.ID||nameOf(it)||'').trim();
  if(seenItems.has(key))continue;
  seenItems.add(key);
  arr.push(it);
  if(arr.length>=100)break;
 }
 byId('reverseResults').innerHTML=arr.map(it=>`<button class="resultItem" data-rev="${esc(it.ID)}"><div class="rName">${esc(nameOf(it))}</div><div class="rSub">Lv.${esc(it.Level||'')}｜${esc(itemTypeName(it.Type)||'')}｜ID ${esc(it.ID)}</div></button>`).join('')||'<div class="muted">找不到道具</div>';
}

function showReverseOriginalV208(id){
 window.v86LastView='reverse';
 history.pushState({app:'detail',view:'reverse'},'','#reverse-'+id);
 const it=itemIndex[String(id).trim()]; if(!it)return; const arr=dropReverse[String(id).trim()]||[];
 byId('reader').innerHTML=`<section class="card"><button class="backBtn" onclick="goBackToPrevious()">← 返回查詢</button><h1>${esc(nameOf(it))}</h1><div class="muted">掉落反查｜共 ${arr.length} 筆</div>${arr.length?`<div class="tableWrap"><table><thead><tr><th>怪物</th><th>Lv.</th><th>機率</th><th>位置</th></tr></thead><tbody>${arr.map(x=>`<tr data-monster="${esc(x.monster.ID)}"><td>${esc(nameOf(x.monster))}</td><td>${esc(x.monster.Level||'')}</td><td>${x.rate.toFixed(6)}%</td><td>${esc(locOf(nameOf(x.monster))||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">沒有怪物掉落這個道具。</div>'}</section>`;
 closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}

// V208 reverse.js
// Drop reverse search module; search is de-duplicated, detail UI restored to original.
// app-core.js still keeps the original functions for now; this module provides the active override.

function searchReverseItems(){
 const input=byId('reverseQ'); if(!input)return;
 window.v86ReverseQ=input.value;
 const q=input.value.trim().toLowerCase();
 if(!q){byId('reverseResults').innerHTML='<div class="muted">請輸入道具名稱</div>';return}
 const seenItems=new Set();
 const arr=[];
 for(const it of items){
  if(!itemSearchText(it).includes(q))continue;
  const key=String(it.ID||nameOf(it)||'').trim();
  if(seenItems.has(key))continue;
  seenItems.add(key);
  arr.push(it);
  if(arr.length>=100)break;
 }
 byId('reverseResults').innerHTML=arr.map(it=>`<button class="resultItem" data-rev="${esc(it.ID)}"><div class="rName">${esc(nameOf(it))}</div><div class="rSub">Lv.${esc(it.Level||'')}｜${esc(itemTypeName(it.Type)||'')}｜ID ${esc(it.ID)}</div></button>`).join('')||'<div class="muted">找不到道具</div>';
}

function showReverse(id){
 window.v86LastView='reverse';
 history.pushState({app:'detail',view:'reverse'},'','#reverse-'+id);
 const it=itemIndex[String(id).trim()]; if(!it)return; const arr=dropReverse[String(id).trim()]||[];
 byId('reader').innerHTML=`<section class="card"><button class="backBtn" onclick="goBackToPrevious()">← 返回查詢</button><h1>${esc(nameOf(it))}</h1><div class="muted">掉落反查｜共 ${arr.length} 筆</div>${arr.length?`<div class="tableWrap"><table><thead><tr><th>怪物</th><th>Lv.</th><th>機率</th><th>位置</th></tr></thead><tbody>${arr.map(x=>`<tr data-monster="${esc(x.monster.ID)}"><td>${esc(nameOf(x.monster))}</td><td>${esc(x.monster.Level||'')}</td><td>${x.rate.toFixed(6)}%</td><td>${esc(locOf(nameOf(x.monster))||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">沒有怪物掉落這個道具。</div>'}</section>`;
 closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}

// V203 active reverse overrides with ITEM ID de-duplication.
(function(){
  function by(id){return document.getElementById(id)}
  function esc2(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function name2(it){
    try{return typeof nameOf==='function'?nameOf(it):(it?.Name||'')}catch(e){return it?.Name||''}
  }
  function searchText2(it){
    try{return typeof itemSearchText==='function'?itemSearchText(it):''}catch(e){
      return (name2(it)+' '+(it?.ID||'')+' '+(it?.Level||'')+' '+(it?.Type||'')).toLowerCase();
    }
  }
  function type2(it){
    try{return (typeof itemTypeName==='function'?itemTypeName(it.Type):it.Type)||it.Type||''}catch(e){return it?.Type||''}
  }
  function dedupByItemId(arr){
    const map=new Map();
    (arr||[]).forEach(it=>{
      const key=String(it?.ID||'').trim() || String(name2(it)||'').trim();
      if(key && !map.has(key))map.set(key,it);
    });
    return [...map.values()];
  }
  function dedupDrops(arr){
    const map=new Map();
    (arr||[]).forEach(x=>{
      const mid=String(x?.monster?.ID||x?.ID||x?.monster_id||'').trim();
      const rate=String(x?.rateText||x?.rate||x?.weight||'').trim();
      const key=mid+'|'+rate;
      if(key && !map.has(key))map.set(key,x);
    });
    return [...map.values()];
  }

  window.searchReverseItems=function(){
    const input=by('reverseQ');
    if(!input)return;
    window.v86ReverseQ=input.value;
    const q=input.value.trim().toLowerCase();
    const box=by('reverseResults');
    if(!box)return;

    if(!q){
      box.innerHTML='<div class="muted">請輸入道具名稱</div>';
      return;
    }

    const arr=dedupByItemId((items||[]).filter(it=>searchText2(it).includes(q))).slice(0,100);

    box.innerHTML=arr.map(it=>`
      <button class="resultItem" data-rev="${esc2(it.ID)}">
        <div class="rName">${esc2(name2(it))}</div>
        <div class="rSub">Lv.${esc2(it.Level||'')}｜${esc2(type2(it))}｜ID ${esc2(it.ID)}</div>
      </button>
    `).join('') || '<div class="muted">找不到道具</div>';
  };

  // V208：app-core.js 已移除舊 showReverse，因此由 reverse.js 內嵌原版 UI。
  window.showReverse=function(id){
    if(typeof showReverseOriginalV208==='function'){
      return showReverseOriginalV208(id);
    }
  };

  window.SZO_REVERSE_MODULE = {
    searchReverseItems: window.searchReverseItems,
    showReverse: window.showReverse,
    dedupByItemId,
    dedupDrops
  };
})();


// V210a reverse search fallback
try{
  if(typeof window.searchReverseItems==='function'){
    const oldReverseSearch = window.searchReverseItems;
    window.searchReverseItems = function(){
      try{
        return oldReverseSearch();
      }catch(err){
        console.warn('V210a reverse fallback', err);

        const q = (document.getElementById('reverseQ')?.value || '').trim().toLowerCase();
        const box = document.getElementById('reverseResults');
        if(!box)return;

        const arr = (window.items||[]).filter(it=>{
          const txt = typeof window.itemSearchText==='function'
            ? window.itemSearchText(it)
            : ((it?.Name||'')+' '+(it?.ID||'')).toLowerCase();
          return txt.includes(q);
        }).slice(0,100);

        box.innerHTML = arr.map(it=>`
          <button class="resultItem" onclick="showReverse('${it.ID}')">
            <div class="rName">${it.Name||''}</div>
            <div class="rSub">Lv.${it.Level||''}｜${it.Type||''}｜ID ${it.ID||''}</div>
          </button>
        `).join('') || '<div class="muted">找不到道具</div>';
      }
    };
  }
}catch(e){console.warn('V210a reverse patch failed',e);}


// V210b：強制修正掉落反查搜尋。
// 不再依賴舊 searchReverseItems，也不依賴 itemSearchText 是否在 window 上。
// 直接掃 items 全資料，搜尋 Name / ID / Level / Type / Help，並依 ITEM ID 去重。
(function(){
  function by(id){return document.getElementById(id)}
  function e(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function nm(it){
    try{return typeof nameOf==='function'?nameOf(it):(it?.Name||'')}catch(err){return it?.Name||''}
  }
  function typeName(it){
    try{return (typeof itemTypeName==='function'?itemTypeName(it.Type):it.Type)||it.Type||''}catch(err){return it?.Type||''}
  }
  function text(it){
    let status = '';
    let kind = '';
    try{ status = typeof itemStatus==='function' ? itemStatus(it) : ''; }catch(err){}
    try{ kind = typeof itemKind==='function' ? itemKind(it) : ''; }catch(err){}
    return [
      nm(it),
      it?.ID,
      it?.Level,
      it?.CLevel,
      it?.Type,
      typeName(it),
      it?.Help,
      status,
      kind
    ].join(' ').toLowerCase();
  }
  function dedup(arr){
    const map=new Map();
    (arr||[]).forEach(it=>{
      const key=String(it?.ID||'').trim() || String(nm(it)||'').trim();
      if(key && !map.has(key))map.set(key,it);
    });
    return [...map.values()];
  }

  window.searchReverseItems=function(){
    const input=by('reverseQ');
    const box=by('reverseResults');
    if(!input||!box)return;

    window.v86ReverseQ=input.value;
    const q=String(input.value||'').trim().toLowerCase();

    if(!q){
      box.innerHTML='<div class="muted">請輸入道具名稱</div>';
      return;
    }

    const src = Array.isArray(window.SZO_DATA?.items) ? window.SZO_DATA.items : (Array.isArray(window.items) ? window.items : []);
    const arr = dedup(src.filter(it=>text(it).includes(q))).slice(0,100);

    box.innerHTML = arr.map(it=>`
      <button type="button" class="resultItem" data-rev="${e(it.ID)}">
        <div class="rName">${e(nm(it))}</div>
        <div class="rSub">Lv.${e(it.Level||'')}｜${e(typeName(it))}｜ID ${e(it.ID||'')}</div>
      </button>
    `).join('') || '<div class="muted">找不到道具</div>';
  };

  document.addEventListener('input',function(ev){
    if(ev.target && ev.target.id==='reverseQ'){
      window.searchReverseItems();
    }
  },true);
})();


// V210c：反查資料橋接修正。
// 使用 window.SZO_DATA.items / itemIndex / dropReverse，不再依賴 app-core 內部 let 作用域。
(function(){
  function by(id){return document.getElementById(id)}
  function e(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function nm(it){
    try{return typeof nameOf==='function'?nameOf(it):(it?.Name||'')}catch(err){return it?.Name||''}
  }
  function typeName(it){
    try{return (typeof itemTypeName==='function'?itemTypeName(it.Type):it.Type)||it.Type||''}catch(err){return it?.Type||''}
  }
  function text(it){
    return [
      nm(it),
      it?.ID,
      it?.Level,
      it?.CLevel,
      it?.Type,
      typeName(it),
      it?.Help
    ].join(' ').toLowerCase();
  }
  function dedup(arr){
    const map=new Map();
    (arr||[]).forEach(it=>{
      const key=String(it?.ID||'').trim() || String(nm(it)||'').trim();
      if(key && !map.has(key))map.set(key,it);
    });
    return [...map.values()];
  }

  window.searchReverseItems=function(){
    const input=by('reverseQ');
    const box=by('reverseResults');
    if(!input||!box)return;

    window.v86ReverseQ=input.value;
    const q=String(input.value||'').trim().toLowerCase();

    if(!q){
      box.innerHTML='<div class="muted">請輸入道具名稱</div>';
      return;
    }

    const src = Array.isArray(window.SZO_DATA?.items) ? window.SZO_DATA.items : [];
    const arr = dedup(src.filter(it=>text(it).includes(q))).slice(0,100);

    box.innerHTML = arr.map(it=>`
      <button type="button" class="resultItem" data-rev="${e(it.ID)}">
        <div class="rName">${e(nm(it))}</div>
        <div class="rSub">Lv.${e(it.Level||'')}｜${e(typeName(it))}｜ID ${e(it.ID||'')}</div>
      </button>
    `).join('') || '<div class="muted">找不到道具</div>';
  };
})();


// V210d：最終反查搜尋修正。
// 每次搜尋前呼叫 window.SZO_SYNC_DATA()，直接同步 app-core 內部 items。
(function(){
  function by(id){return document.getElementById(id)}
  function e(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function nm(it){
    try{return typeof nameOf==='function'?nameOf(it):(it?.Name||'')}catch(err){return it?.Name||''}
  }
  function typeNameText(it){
    try{return (typeof itemTypeName==='function'?itemTypeName(it.Type):it.Type)||it.Type||''}catch(err){return it?.Type||''}
  }
  function makeText(it){
    let extra='';
    try{extra += ' '+(typeof itemKind==='function'?itemKind(it):'');}catch(err){}
    try{extra += ' '+(typeof itemStatus==='function'?itemStatus(it):'');}catch(err){}
    return [
      nm(it),
      it?.ID,
      it?.Level,
      it?.CLevel,
      it?.Type,
      typeNameText(it),
      it?.Help,
      extra
    ].join(' ').toLowerCase();
  }
  function dedup(arr){
    const map=new Map();
    (arr||[]).forEach(it=>{
      const key=String(it?.ID||'').trim() || String(nm(it)||'').trim();
      if(key && !map.has(key))map.set(key,it);
    });
    return [...map.values()];
  }
  function getItems(){
    try{
      if(typeof window.SZO_SYNC_DATA==='function')window.SZO_SYNC_DATA();
    }catch(err){console.warn('SZO_SYNC_DATA call failed',err)}
    if(Array.isArray(window.SZO_DATA?.items) && window.SZO_DATA.items.length)return window.SZO_DATA.items;
    if(Array.isArray(window.items) && window.items.length)return window.items;
    return [];
  }

  window.searchReverseItems=function(){
    const input=by('reverseQ');
    const box=by('reverseResults');
    if(!input||!box)return;

    window.v86ReverseQ=input.value;
    const q=String(input.value||'').trim().toLowerCase();

    if(!q){
      box.innerHTML='<div class="muted">請輸入道具名稱</div>';
      return;
    }

    const src=getItems();
    const arr=dedup(src.filter(it=>makeText(it).includes(q))).slice(0,100);

    if(!src.length){
      box.innerHTML='<div class="muted">道具資料尚未同步，請等資料載入完成後再試一次</div>';
      return;
    }

    box.innerHTML=arr.map(it=>`
      <button type="button" class="resultItem" data-rev="${e(it.ID)}">
        <div class="rName">${e(nm(it))}</div>
        <div class="rSub">Lv.${e(it.Level||'')}｜${e(typeNameText(it))}｜ID ${e(it.ID||'')}</div>
      </button>
    `).join('') || `<div class="muted">找不到道具（已搜尋 ${src.length} 筆道具）</div>`;
  };

  document.addEventListener('input',function(ev){
    if(ev.target && ev.target.id==='reverseQ'){
      window.searchReverseItems();
    }
  },true);
})();

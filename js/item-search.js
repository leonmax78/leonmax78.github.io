// V115：安全恢復版。
// 以 V112 為基底，不再攔截主選單，避免怪物查詢 / 掉落反查 / 武魂消失。
// 只修改道具查詢欄位：保留名稱、類型、等級、系列快選、專剋。
(function(){
  function id(x){return document.getElementById(x)}
  function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function s(v){
    if(v===undefined||v===null)return '';
    if(typeof v==='object'){
      if(v.value!==undefined)return String(v.value).trim();
      if(v.label!==undefined)return String(v.label).trim();
      return '';
    }
    return String(v).trim();
  }
  function n(it){return (typeof nameOf==='function'?nameOf(it):(it?.Name||''))||''}
  function num(v){return typeof intOf==='function'?intOf(v):(parseInt(v,10)||0)}
  function tname(t){return (typeof itemTypeName==='function'?itemTypeName(t):'')||t||''}
  function kname(it){try{return (typeof itemKind==='function'?itemKind(it):'')||''}catch(e){return ''}}
  function textOf(it){
    let base='';
    try{base=typeof itemSearchText==='function'?itemSearchText(it):''}catch(e){}
    return (base+' '+n(it)+' '+(it?.ID||'')+' '+(it?.Level||'')+' '+(it?.Type||'')+' '+tname(it?.Type)+' '+kname(it)+' '+(it?.Help||'')).toLowerCase();
  }
  function rows(){
    try{
      if(typeof eqEquipList==='function')return (eqEquipList()||[]).filter(Boolean);
      if(typeof eqData==='function')return ((eqData().equipment)||[]).filter(Boolean);
    }catch(e){console.warn('eq rows failed',e)}
    try{return ((EQUIP_COMPOUND_DATA&&EQUIP_COMPOUND_DATA.equipment)||[]).filter(Boolean)}catch(e){}
    return [];
  }
  function eid(eq){return s(eq?.item_id||eq?.Item||eq?.ID)}
  function eseries(eq){return s(eq?.series_group||eq?.series)}
  function uniq(arr){return [...new Set((arr||[]).map(s).filter(Boolean))]}
  function opt(values, selected, label){
    return '<option value="">'+h(label)+'</option>'+values.map(v=>'<option value="'+h(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+h(v)+'</option>').join('');
  }
  function dedup(arr){
    const m=new Map();
    (arr||[]).forEach(it=>{
      const key=s(it?.ID)||n(it);
      if(key&&!m.has(key))m.set(key,it);
    });
    return [...m.values()];
  }

  let cache=null;
  function buildCache(){
    const eqs=rows();
    const byId=new Map();
    const series=[];
    for(const eq of eqs){
      const idd=eid(eq);
      if(idd){
        if(!byId.has(idd))byId.set(idd,[]);
        byId.get(idd).push({series:eseries(eq)});
      }
      series.push(eseries(eq));
    }
    cache={byId, series:uniq(series)};
    return cache;
  }
  function getCache(){return cache||buildCache()}
  function selectedSeries(){return id('itemEqSeries')?.value||''}
  function itemMatchSeries(it, series){
    if(!series)return true;
    const list=getCache().byId.get(s(it?.ID));
    if(!list||!list.length)return false;
    return list.some(m=>m.series===series);
  }
  function latest(limit=320){
    return dedup((items||[]).slice().reverse().filter(it=>n(it))).slice(0,limit).map(it=>'<button type="button" class="resultItem" data-item="'+h(it.ID)+'"><div class="rName">'+h(n(it))+'</div><div class="rSub">Lv.'+h(it.Level||'')+'｜'+h(tname(it.Type)||it.Type||'')+'｜'+(kname(it)?'專剋 '+h(kname(it))+'｜':'')+'ID '+h(it.ID||'')+'</div></button>').join('') || '<div class="muted">沒有道具資料</div>';
  }
  function fill(){
    const c=getCache();
    if(id('itemEqSeries'))id('itemEqSeries').innerHTML=opt(c.series,window.v110ItemEqSeries||'','全部系列');
    const kindSel=id('itemKind');
    if(kindSel){
      const kinds=uniq((items||[]).map(it=>kname(it))).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
      kindSel.innerHTML=opt(kinds,window.v110ItemKind||'','全部專剋');
    }
  }

  // 只覆蓋「道具查詢」頁；reverse/compound 一律交回原本 renderItemPage。
  const oldRender = window.renderItemPage;
  window.renderItemPage=function(tab='item'){
    if(tab!=='item'){
      if(typeof oldRender==='function')return oldRender(tab);
      return;
    }
    buildCache();
    const reader=id('reader'); if(!reader)return;
    reader.innerHTML=`<section class="card latestSearchPage itemAdvancedSearchPage"><h1>道具查詢</h1>
      <div class="latestQueryLayout">
        <div class="latestMainPane">
          <div class="kvGrid">
            <div class="kv"><div class="k">道具名稱 / ID / 類型</div><div class="v"><input id="itemQ" placeholder="例如：宮殤、277、火傷、吸血" value="${h(window.v86ItemQ||'')}"></div></div>
            <div class="kv"><div class="k">類型</div><div class="v"><select id="itemType"></select></div></div>
            <div class="kv"><div class="k">等級起</div><div class="v"><input id="itemMin" type="number" value="${h(window.v86ItemMin||'')}"></div></div>
            <div class="kv"><div class="k">等級迄</div><div class="v"><input id="itemMax" type="number" value="${h(window.v86ItemMax||'')}"></div></div>
            <div class="kv"><div class="k">系列快選</div><div class="v"><select id="itemEqSeries"></select></div></div>
            <div class="kv"><div class="k">專剋屬性</div><div class="v"><select id="itemKind"></select></div></div>
          </div>
          <div class="notice" style="font-size:12px">系列快選依合成模擬清單建立；類型則依 ITEM.INI 原始 Type 欄位篩選。</div>
          <div class="results" id="itemResults"></div>
        </div>
        <aside class="latestSidePane">
          <div class="latestSideTitle">最新道具清單</div>
          <div class="latestSideHint">依 ITEM.INI 原始順序反向顯示，越新的道具越上面。</div>
          <div class="latestList">${latest()}</div>
        </aside>
      </div>
    </section>`;

    const sel=id('itemType');
    if(sel){
      sel.innerHTML='<option value="">全部類型</option>'+Object.entries(ITEM_TYPE_MAP||{}).map(([k,v])=>`<option value="${h(k)}" ${String(k)===String(window.v86ItemType||'')?'selected':''}>${h(v)}</option>`).join('');
      sel.value=window.v86ItemType||'';
    }
    fill();

    ['itemQ','itemType','itemMin','itemMax','itemEqSeries','itemKind'].forEach(x=>{
      const el=id(x); if(!el)return;
      el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{
        window.v86ItemType=id('itemType')?.value||'';
        window.v110ItemEqSeries=id('itemEqSeries')?.value||'';
        window.v110ItemKind=id('itemKind')?.value||'';
        searchItems();
      });
    });
    searchItems();
  };

  window.searchItems=function(){
    try{
      const itemQ=id('itemQ'); if(!itemQ)return;
      window.v86ItemQ=itemQ.value;
      window.v86ItemType=id('itemType')?.value||'';
      window.v86ItemMin=id('itemMin')?.value||'';
      window.v86ItemMax=id('itemMax')?.value||'';
      window.v110ItemEqSeries=id('itemEqSeries')?.value||'';
      window.v110ItemKind=id('itemKind')?.value||'';

      const q=window.v86ItemQ.trim().toLowerCase();
      const type=window.v86ItemType;
      const min=window.v86ItemMin?num(window.v86ItemMin):null;
      const max=window.v86ItemMax?num(window.v86ItemMax):null;
      const kind=window.v110ItemKind;
      const series=selectedSeries();
      const has=!!(q||type||window.v86ItemMin||window.v86ItemMax||kind||series);
      const box=id('itemResults'); if(!box)return;
      if(!has){box.innerHTML='';return;}

      const arr=dedup((items||[]).filter(it=>
        (!q||textOf(it).includes(q)) &&
        (!type||String(it.Type||'')===String(type)) &&
        (min===null||num(it.Level)>=min) &&
        (max===null||num(it.Level)<=max) &&
        (!kind||kname(it)===kind) &&
        itemMatchSeries(it,series)
      )).slice(0,180);

      box.innerHTML=arr.map(it=>'<button type="button" class="resultItem" data-item="'+h(it.ID)+'"><div class="rName">'+h(n(it))+'</div><div class="rSub">Lv.'+h(it.Level||'')+'｜'+h(tname(it.Type)||it.Type||'')+'｜'+(kname(it)?'專剋 '+h(kname(it))+'｜':'')+'ID '+h(it.ID||'')+'</div></button>').join('')||'<div class="muted">找不到道具</div>';
    }catch(e){
      console.error('V115 searchItems failed',e);
      const box=id('itemResults'); if(box)box.innerHTML='<div class="muted">篩選發生錯誤，請回報這組條件。</div>';
    }
  };
})();

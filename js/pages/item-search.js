// V240: enhanced item search page.
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
    return dedup((items||[]).slice().reverse().filter(it=>n(it))).slice(0,limit).map(it=>{
      const sub=['Lv.'+h(it.Level||''), h(tname(it.Type)||it.Type||''), kname(it)?'專剋 '+h(kname(it)):'', 'ID '+h(it.ID||'')].filter(Boolean).join('｜');
      return '<button type="button" class="resultItem" data-item="'+h(it.ID)+'"><div class="rName">'+h(n(it))+'</div><div class="rSub">'+sub+'</div></button>';
    }).join('') || '<div class="muted">沒有道具資料</div>';
  }
  function fill(){
    const c=getCache();
    if(id('itemEqSeries'))id('itemEqSeries').innerHTML=opt(c.series,window.v110ItemEqSeries||'','?券蝟餃?');
    const kindSel=id('itemKind');
    if(kindSel){
      const kinds=uniq((items||[]).map(it=>kname(it))).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
      kindSel.innerHTML=opt(kinds,window.v110ItemKind||'','?券撠?');
    }
  }

  const oldRender = window.renderItemPage;
  window.renderItemPage=function(tab='item'){
    if(tab!=='item'){
      if(typeof oldRender==='function')return oldRender(tab);
      return;
    }
    if(typeof window.ensureItemDataLoaded==="function" && (!Array.isArray(items)||!items.length)) {
      const reader=id("reader");
      if(reader)reader.innerHTML="<section class=\"card\"><h1>道具資料讀取中</h1><div class=\"muted\">正在載入道具資料。第一次開啟需要一點時間。</div></section>";
      window.ensureItemDataLoaded().then(ok=>{if(ok)window.renderItemPage(tab);});
      return;
    }
    buildCache();
    const reader=id('reader'); if(!reader)return;
    reader.innerHTML=`<section class="card latestSearchPage itemAdvancedSearchPage"><h1>??亥岷</h1>
      <div class="latestQueryLayout">
        <div class="latestMainPane">
          <div class="kvGrid">
            <div class="kv"><div class="k">??迂 / ID / 憿?</div><div class="v"><input id="itemQ" placeholder="靘?嚗悅畾扎?77??瑯銵" value="${h(window.v86ItemQ||'')}"></div></div>
            <div class="kv"><div class="k">憿?</div><div class="v"><select id="itemType"></select></div></div>
            <div class="kv"><div class="k">蝑?韏?/div><div class="v"><input id="itemMin" type="number" value="${h(window.v86ItemMin||'')}"></div></div>
            <div class="kv"><div class="k">蝑?餈?/div><div class="v"><input id="itemMax" type="number" value="${h(window.v86ItemMax||'')}"></div></div>
            <div class="kv"><div class="k">蝟餃?敹恍</div><div class="v"><select id="itemEqSeries"></select></div></div>
            <div class="kv"><div class="k">撠?撅祆?/div><div class="v"><select id="itemKind"></select></div></div>
          </div>
          <div class="notice" style="font-size:12px">蝟餃?敹恍靘??芋?祆??桀遣蝡?憿??? ITEM.INI ?? Type 甈?蝭拚??/div>
          <div class="results" id="itemResults"></div>
        </div>
        <aside class="latestSidePane">
          <div class="latestSideTitle">??圈??瑟???/div>
          <div class="latestSideHint">靘?ITEM.INI ??????憿舐內嚗??啁??頞??Ｕ?/div>
          <div class="latestList">${latest()}</div>
        </aside>
      </div>
    </section>`;

    const sel=id('itemType');
    if(sel){
      sel.innerHTML='<option value="">?券憿?</option>'+Object.entries(ITEM_TYPE_MAP||{}).map(([k,v])=>`<option value="${h(k)}" ${String(k)===String(window.v86ItemType||'')?'selected':''}>${h(v)}</option>`).join('');
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

      box.innerHTML=arr.map(it=>{
        const sub=['Lv.'+h(it.Level||''), h(tname(it.Type)||it.Type||''), kname(it)?'專剋 '+h(kname(it)):'', 'ID '+h(it.ID||'')].filter(Boolean).join('｜');
        return '<button type="button" class="resultItem" data-item="'+h(it.ID)+'"><div class="rName">'+h(n(it))+'</div><div class="rSub">'+sub+'</div></button>';
      }).join('')||'<div class="muted">沒有找到道具</div>';
    }catch(e){
      console.error('V115 searchItems failed',e);
      const box=id('itemResults'); if(box)box.innerHTML='<div class="muted">蝭拚?潛??航炊嚗????璇辣??/div>';
    }
  };
})();

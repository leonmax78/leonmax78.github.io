(function(){
 const categories=['武器','防具','仙器','飾品'];
 const category=r=>r.category==='特殊飾品'?'飾品':r.category;
 const record=e=>SZO_EQUIPMENT_TAXONOMY.byId[e.item_id];
 const tags=e=>record(e).tags.filter(t=>(!eqState.series||t.family===eqState.series)&&(!eqState.tier||t.collection===eqState.tier));
 let source,cache=[];
 window.eqEquipList=function(){
  if(source===items)return cache;
  source=items;
  cache=items.filter(it=>{
   const r=SZO_EQUIPMENT_TAXONOMY.byId[it.ID];
   return r&&categories.includes(category(r))&&!String(it.Flag||'').split(',').map(x=>x.trim()).includes('ITEM_NO_REFINE')&&!String(it.Class||'').split(',').includes('CLASS_PET');
  }).map(it=>{
   const r=SZO_EQUIPMENT_TAXONOMY.byId[it.ID];
   return {uid:'item_'+it.ID,item_id:it.ID,name:it.Name,main_category:category(r),display_type:compTypeToDisplay(it.Type==='HIDDEN_WEAPON2'?'HIDDEN_WEAPON':it.Type),type_codes:[it.Type],item_type_raw:it.Type,raw_item:it,base_stats:eqBuildBaseStatsFromItemIni(it,{}),_stats_source:'ITEM.INI',search_text:[it.Name,it.ID,compTypeToDisplay(it.Type),it.Help].join(' ')};
  });
  return cache;
 };
 function professionMatches(e){
  const value=eqState.profession||'',classes=String(e.raw_item.Class||'').split(',').filter(Boolean);
  return !value||(value.startsWith('series:')?tags(e).some(t=>t.variant===value.slice(7)):value==='unrestricted'?!classes.length:!classes.length||classes.includes(value));
 }
 function candidates(){return eqEquipList().filter(e=>(!eqState.main||e.main_category===eqState.main)&&(!eqState.series&&!eqState.tier||tags(e).length));}
 function fill(id,values,label,key){
  const el=byId(id);if(!el)return;
  el.replaceChildren(new Option(label,''),...values.map(v=>new Option(v.label||v,v.value||v)));
  el.value=eqState[key]||'';eqState[key]=el.value;
 }
 window.eqRefreshFilters=function(){
  fill('eqMain',categories,'全部大類','main');
  const all=eqEquipList().filter(e=>!eqState.main||e.main_category===eqState.main);
  fill('eqSeries',eqUnique(all.flatMap(e=>record(e).tags.map(t=>t.family))).filter(x=>x!=='寵物裝備'),'全部系列','series');
  if(!eqState.series)eqState.tier='';
  const family=all.filter(e=>!eqState.series||record(e).tags.some(t=>t.family===eqState.series));
  const collections=eqState.series?eqUnique(family.flatMap(e=>record(e).tags.filter(t=>t.family===eqState.series).map(t=>t.collection))):[];
  const six=['終極系列','皇系列','星系列','創系列','終系列','帝系列','無系列','絕系列','超系列','真系列','初代系列'];
  const collectionOrder=new Map();
  family.forEach(e=>record(e).tags.filter(t=>t.family===eqState.series).forEach(t=>collectionOrder.set(t.collection,Math.max(collectionOrder.get(t.collection)??-1,record(e).order??-1))));
  collections.sort((a,b)=>eqState.series==='六滅系列'?six.indexOf(a)-six.indexOf(b):(collectionOrder.get(b)??-1)-(collectionOrder.get(a)??-1));
  fill('eqTier',collections,'全部細分類','tier');
  byId('eqTier').closest('.kv').hidden=!collections.length;
  const rows=candidates(),variants=eqUnique(rows.flatMap(e=>tags(e).map(t=>t.variant)));
  fill('eqProfession',[{value:'unrestricted',label:'不限職業'},...Object.entries(SZO_DISPLAY.values.Class).filter(([k])=>k!=='CLASS_PET').map(([value,label])=>({value,label})),...variants.map(label=>({value:'series:'+label,label}))],'全部職業／特仕系列','profession');
  const types=new Set(rows.filter(professionMatches).map(e=>e.display_type));
  fill('eqType',eqUnique(Object.values(ITEM_TYPE_MAP)).filter(t=>types.has(t)),'全部類型','type');
 };
 window.eqFilteredEquipment=function(){
  const query=String(eqState.q||'').trim().toLowerCase(),types=Object.values(ITEM_TYPE_MAP);
  return candidates().filter(e=>professionMatches(e)&&(!eqState.type||e.display_type===eqState.type)&&(!query||e.search_text.toLowerCase().includes(query))&&(eqState.min===''||eqState.min===undefined||Number(e.raw_item.Level||0)>=Number(eqState.min))&&(eqState.max===''||eqState.max===undefined||Number(e.raw_item.Level||0)<=Number(eqState.max)))
   .sort((a,b)=>types.indexOf(a.display_type)-types.indexOf(b.display_type)||(record(b).order??-1)-(record(a).order??-1));
 };
 let limit=180;
 window.eqRefreshList=function(){
  const box=byId('eqList');if(!box)return;
  const rows=eqFilteredEquipment();
  box.innerHTML=`<div class="muted">共 ${rows.length} 筆，已顯示 ${Math.min(limit,rows.length)} 筆</div>`+rows.slice(0,limit).map(e=>`<button class="resultItem" data-eq-uid="${esc(e.uid)}">${window.SZO_ASSET_MEDIA?.img(SZO_ASSET_MEDIA.itemIconSrc(e.raw_item),e.name,'assetThumb itemThumb')||''}<div><div class="rName">${esc(e.name)}</div><div class="rSub">${esc(e.main_category)} / ${esc(e.display_type)} / Lv.${esc(e.raw_item.Level||'')} / ID ${esc(e.item_id)}</div></div></button>`).join('')+(rows.length>limit?'<button type="button" class="ghost" id="eqMore">載入更多</button>':'')+(!rows.length?'<div class="empty">沒有符合的裝備。</div>':'');
 };
 window.eqSelected=()=>eqEquipList().find(e=>e.uid===eqState.uid)||null;
 window.renderEquipmentCompoundPage=function(){
  if(!compoundDataReady){ensureCompoundDataLoaded().then(ok=>{if(ok)renderEquipmentCompoundPage();});return;}
  window.v86LastView='item';limit=180;
  const field=(label,id,input=false)=>`<div class="kv"><div class="k">${label}</div><div class="v">${input?`<input id="${id}" type="${id==='eqQ'?'text':'number'}" value="${esc(eqState[{eqQ:'q',eqMin:'min',eqMax:'max'}[id]]||'')}">`:`<select id="${id}"></select>`}</div></div>`;
  byId('reader').innerHTML=`<section class="card compoundTaxonomyPage"><h1>常用配方合成模擬</h1><div class="kvGrid">${field('裝備名稱 / ID','eqQ',true)}${field('大類','eqMain')}${field('系列','eqSeries')}${field('細分類 / 武匣','eqTier')}${field('職業 / 特仕系列','eqProfession')}${field('類型','eqType')}${field('最低 Lv','eqMin',true)}${field('最高 Lv','eqMax',true)}</div><div class="itemFilterActions"><button type="button" id="eqClearFilters">清空篩選</button></div><div class="results" id="eqList"></div></section>`;
  eqRefreshFilters();eqRefreshList();SZO_ITEM_FILTER_SEARCH.enhance();closeDrawer();window.scrollTo({top:0,behavior:'instant'});
 };
 document.addEventListener('change',e=>{
  if(e.target.id==='eqProfession'){eqState.profession=e.target.value;eqState.type='';eqRefreshFilters();limit=180;eqRefreshList();}
 });
 document.addEventListener('input',e=>{
  if(['eqMin','eqMax'].includes(e.target.id)){eqState[e.target.id==='eqMin'?'min':'max']=e.target.value;limit=180;eqRefreshList();}
 });
 document.addEventListener('click',e=>{
  if(e.target.id==='eqMore'){limit+=180;eqRefreshList();}
  if(e.target.id==='eqClearFilters'){for(const k of ['main','series','tier','type','q','profession','min','max'])eqState[k]='';renderEquipmentCompoundPage();}
 });
})();

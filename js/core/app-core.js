// V220: AUTH_REQUIRED / RAW_BASE / FILES moved to js/core/app-settings.js.
// V234: ??/靽桃毀鞈????賣芋蝯?箇洵銝甈∩蝙?冽????伐??踹?擐?擐活??憭芣??
// V220: ITEM_TYPE_MAP moved to js/data/type-maps.js.
// V220: SUBTYPE_MAP moved to js/data/type-maps.js.
// V220: RACE_MAP moved to js/data/type-maps.js.
// V234: DATA / TRAINING_DATA ?寧暺脤?蟡極?瑟????乓?


let monsters=[],items=[],magics=[],statuses=[],monsterLocations={};
let compoundIniRecipes=[];
let compoundConfigData=null;
let changeBodyIniSouls=[];
let itemIndex={},magicIndex={},statusIndex={},dropReverse={};

  
  SZO_SYNC_DATA(); // V210d after index build
// V210c嚗??折鞈?? window嚗?憭璅∠? reverse.js / item.js ?舐帘摰???  window.SZO_DATA = window.SZO_DATA || {};
  window.SZO_DATA.items = items;
  window.SZO_DATA.itemIndex = itemIndex;
  window.SZO_DATA.dropReverse = dropReverse;
  window.items = items;
  window.itemIndex = itemIndex;
  window.dropReverse = dropReverse;
let currentView='home';
let mainDataLoadPromise=null;
let mainDataReady=false;
let itemDataLoadPromise=null;
let itemDataReady=false;
let monsterDataLoadPromise=null;
let monsterDataReady=false;
let optionalMainDataLoadPromise=null;
let compoundDataLoadPromise=null;
let compoundDataReady=false;
let soulIniLoadPromise=null;
let soulIniReady=false;
let jiangshenToolLoadPromise=null;
let jiangshenToolReady=false;
let jiangshenSetDelegating=false;
const lazyScriptLoads={};
const dataBundleLoads={};

function loadScriptOnce(src){
 if(!src)return Promise.resolve();
 if(lazyScriptLoads[src])return lazyScriptLoads[src];
 const existing=[...document.scripts].find(s=>{
  const raw=s.getAttribute('src')||'';
  if(raw===src)return true;
  try{return new URL(s.src,location.href).pathname.endsWith('/'+src.replace(/^\.?\//,''));}
  catch(e){return raw.split('?')[0].endsWith(src.replace(/^\.?\//,''));}
 });
 if(existing && existing.dataset.loaded==='1')return Promise.resolve(src);
 lazyScriptLoads[src]=new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=src;
  s.async=false;
  s.onload=()=>{s.dataset.loaded='1';resolve(src);};
  s.onerror=()=>reject(new Error("Failed to load script: "+src));
  document.body.appendChild(s);
 });
 return lazyScriptLoads[src];
}

// V210d: keep shared data references synced for extracted modules.
function SZO_SYNC_DATA(){
  try{
    window.SZO_DATA = window.SZO_DATA || {};
    window.SZO_DATA.items = Array.isArray(items) ? items : [];
    window.SZO_DATA.itemIndex = itemIndex || {};
    window.SZO_DATA.dropReverse = dropReverse || {};
    window.SZO_DATA.monsters = Array.isArray(monsters) ? monsters : [];
    window.SZO_DATA.magicIndex = magicIndex || {};
    window.SZO_DATA.statusIndex = statusIndex || {};
    window.items = window.SZO_DATA.items;
    window.monsters = window.SZO_DATA.monsters;
    window.itemIndex = window.SZO_DATA.itemIndex;
    window.dropReverse = window.SZO_DATA.dropReverse;
    return window.SZO_DATA;
  }catch(e){
    console.warn('SZO_SYNC_DATA failed', e);
    window.SZO_DATA = window.SZO_DATA || {};
    return window.SZO_DATA;
  }
}
window.SZO_SYNC_DATA = SZO_SYNC_DATA;


// V220: byId moved to js/utils/common-utils.js.
// V220: esc moved to js/utils/common-utils.js.
// V220: nameOf moved to js/utils/common-utils.js.
// V220: intOf moved to js/utils/common-utils.js.
// V220: fmt moved to js/utils/common-utils.js.
// V220: normHex moved to js/utils/common-utils.js.
// V220: raceName moved to js/utils/common-utils.js.
// V220: subtypeName moved to js/utils/common-utils.js.
// [V210] itemTypeName moved active to js/item.js

// V220: statusName moved to js/utils/common-utils.js.
// V220: magicName moved to js/utils/common-utils.js.
// [V210] itemKind moved active to js/item.js


// v88g嚗??? index.html ??頛荔??寞??賢??芾? ITEM.INI ??ExtraStatus??// 銝??? StatusID / Effect / EFFECT_GIVE ??蝟餌絞甈?嚗?＊蝷箸? StatusID:EFFECT_GIVE??// [V210] itemStatus moved active to js/item.js


// v88g嚗??瑁???? index.html ??雿?摨?銝剜??迂嚗?????? 0 甈?????// V220: ITEM_DETAIL_ORDER moved to js/data/type-maps.js.
// V220: ITEM_DETAIL_RENAME moved to js/data/type-maps.js.

// [V210] itemDetailRows moved active to js/item.js


// [V210] itemAbilityFields moved active to js/item.js


// V220: openDrawer moved to js/utils/common-utils.js.
// V220: closeDrawer moved to js/utils/common-utils.js.
// V220: setTopStatus moved to js/utils/common-utils.js.

function renderJiangHome(){
 byId('reader').innerHTML='';
}

function adoptPreloadedMonsterBundle(){
 const bundle=window.SZO_DATA_BUNDLES&&window.SZO_DATA_BUNDLES.monsters;
 if(Array.isArray(bundle)&&bundle.length&&!monsters.length){
  monsters=bundle;
  monsterDataReady=true;
  try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
  return true;
 }
 return Array.isArray(monsters)&&monsters.length>0;
}

function openJiangMenuOnly(){
 currentView='jiang';
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='jiang'));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 byId('jiangForm')?.classList.add('active');
 renderJiangHome();
}
async function setView(view){
 currentView=view;
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 if(view==='home'){renderHome(); closeDrawer();}
 else if(view==='jiang'){openJiangMenuOnly();}
 else if(view==='monster'){renderMonsterPage(); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 else if(view==='item'){openItemMenuOnly();}
 else if(view==='shop'){if(typeof renderShopPage==='function')renderShopPage();}
 else if(view==='soul'){
  currentView='soul';
  document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='soul'));
  document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
  await ensureSoulDataLoaded();
  if(typeof window.renderSoulCalcPage==='function') window.renderSoulCalcPage();
  closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
 }
 else if(view==='reverse'){await renderItemPage('reverse'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
}
function setJiang(kind){
 openJiangMenuOnly();
 (async()=>{
  if(!(await ensureJiangshenToolLoaded()))return;
  if(!jiangshenSetDelegating && window.setJiang && window.setJiang !== setJiang){
   jiangshenSetDelegating=true;
   try{return window.setJiang(kind);}
   finally{jiangshenSetDelegating=false;}
  }
  fillJiangFields(kind);
 })();
}

async function renderItemPage(tab='item'){
 const activeItem=tab==='item';
 const activeReverse=tab==='reverse';
 if(tab==='compound'){if(await ensureCompoundDataLoaded())renderEquipmentCompoundPage();return;}
 byId('reader').innerHTML=activeItem?`<section class="card"><h1>??亥岷</h1>
  <div class="kvGrid">
    <div class="kv"><div class="k">??迂 / ID / 憿?</div><div class="v"><input id="itemQ" placeholder="靘?嚗蟡???77" value="${esc(window.v86ItemQ||'')}"></div></div>
    <div class="kv"><div class="k">憿?</div><div class="v"><select id="itemType"></select></div></div>
    <div class="kv"><div class="k">蝑?韏?/div><div class="v"><input id="itemMin" type="number" value="${esc(window.v86ItemMin||'')}"></div></div>
    <div class="kv"><div class="k">蝑?餈?/div><div class="v"><input id="itemMax" type="number" value="${esc(window.v86ItemMax||'')}"></div></div>
  </div>
  <div class="results" id="itemResults"></div>
 </section>`:`<section class="card"><h1>??</h1>
  <div class="kvGrid"><div class="kv"><div class="k">頛詨??迂</div><div class="v"><input id="reverseQ" placeholder="靘?嚗劑瘞?脩?鋡?020" value="${esc(window.v86ReverseQ||'')}"></div></div></div>
  <div class="results" id="reverseResults"></div>
 </section>`;
 const sel=byId('itemType');
 if(sel){sel.innerHTML='<option value="">?券憿?</option>'+Object.entries(ITEM_TYPE_MAP).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join(''); sel.value=window.v86ItemType||'';}
 if(activeItem){
  if(itemDataReady||mainDataReady)searchItems();
  else{
   const box=byId('itemResults'); if(box)box.innerHTML='<div class="muted">資料載入中，請稍等。</div>';
   ensureLookupDataLoaded().then(ok=>{if(ok)searchItems();});
  }
 }else if(activeReverse){
  if(mainDataReady)searchReverseItems();
  else{
   const box=byId('reverseResults'); if(box)box.innerHTML='<div class="muted">資料載入中，請稍等。</div>';
   ensureLookupDataLoaded().then(ok=>{if(ok)searchReverseItems();});
  }
 }
}
function openItemMenuOnly(){
 currentView='item';
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='item'));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 byId('itemForm')?.classList.add('active');
 byId('reader').innerHTML='';
}
async function setItemSub(kind){
 openItemMenuOnly();
 if(kind==='item'){await renderItemPage('item'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 if(kind==='reverse'){await renderItemPage('reverse'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 if(kind==='compound'){if(await ensureCompoundDataLoaded())renderEquipmentCompoundPage(); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
}
function renderHome(){
 byId('reader').innerHTML='<section class="homeBlank" aria-label="首頁"><img class="homeLogo" src="assets/index_logo.png" alt="決戰神州II 龍川事變"></section>';
}
function renderLoad(){
 const old=byId('loadCard');
 if(old)old.remove();
}
function loadLine(msg,type='info'){
 if(type!=='bad')return;
 let card=byId('loadCard');
 if(!card){
  card=document.createElement('section');
  card.className='card';
  card.id='loadCard';
  card.innerHTML="<h1>Data load failed</h1><div id=\"loadLines\" class=\"muted\"></div>";
  byId('reader').prepend(card);
 }
 const el=byId('loadLines');
 if(!el)return;
 const cls=type==='ok'?'loadOk':type==='bad'?'loadBad':'loadLine';
 el.innerHTML+=`<div class="${cls}">${msg}</div>`;
}
// V220: empty moved to js/utils/common-utils.js.

// V220: candidateUrls moved to js/core/data-loader-utils.js.
// V220: fetchTimeout moved to js/core/data-loader-utils.js.
// V220: fetchFirst moved to js/core/data-loader-utils.js.
// V220: parseIni moved to js/core/data-loader-utils.js.
// V220: parseCSVLine moved to js/core/data-loader-utils.js.
// V220: parseLocations moved to js/core/data-loader-utils.js.
// [V201] parseDrop moved to js/monster.js

function parseDropSafe(v){
 if(typeof parseDrop==='function')return parseDrop(v);
 const nums=String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(nums.length<4)return [];
 const raw=[];
 for(let i=2;i+1<nums.length;i+=2){
  const id=String(nums[i]).trim();
  const w=Number(nums[i+1]);
  if(id&&id!=='0'&&Number.isFinite(w)&&w>0)raw.push([id,w]);
 }
 const total=raw.reduce((s,x)=>s+x[1],0);
 return total?raw.map(([id,w])=>[id,w/total*100,w,total]):[];
}

function buildDataIndexes(){
 itemIndex={};magicIndex={};statusIndex={};dropReverse={};
 for(const it of items)itemIndex[String(it.ID).trim()]=it;
 for(const m of magics)magicIndex[String(m.ID).trim()]=m;
 for(const s of statuses)statusIndex[String(intOf(s.ID))]=s;
 const seenReverse=new Set();
 for(const m of monsters){
  const mid=String(m.ID||nameOf(m)||'').trim();
  for(const [iid,rate] of parseDropSafe(m.DropItem)){
   const key=mid+'|'+String(iid).trim();
   if(seenReverse.has(key))continue;
   seenReverse.add(key);
   if(!dropReverse[iid])dropReverse[iid]=[];
   dropReverse[iid].push({monster:m,rate});
  }
 }
 for(const iid of Object.keys(dropReverse)){
  const map=new Map();
  for(const row of dropReverse[iid]){
   const key=String(row.monster?.ID||nameOf(row.monster)||'').trim();
   if(!map.has(key) || (row.rate||0)>(map.get(key).rate||0))map.set(key,row);
  }
  dropReverse[iid]=[...map.values()].sort((a,b)=>b.rate-a.rate);
 }
 const sel=byId('itemType'); if(sel){sel.innerHTML='<option value="">?券憿?</option>'+Object.entries(ITEM_TYPE_MAP).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')}
 try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){console.warn('reverse sync failed',e)} // V101 reverse sync after buildDataIndexes
}

async function loadDataBundle(key){
 window.SZO_DATA_BUNDLES=window.SZO_DATA_BUNDLES||{};
 if(window.SZO_DATA_BUNDLES[key]!==undefined)return window.SZO_DATA_BUNDLES[key];
 if(dataBundleLoads[key])return dataBundleLoads[key];
 setTopStatus("Loading "+key);
 const fileMap={
  items:'data/items.bundle.js',
  monsters:'data/monsters.bundle.js',
  magic:'data/magic.bundle.js',
  status:'data/status.bundle.js',
  locations:'data/locations.bundle.js',
  drop_reverse:'data/drop_reverse.bundle.js',
  build_meta:'data/build_meta.bundle.js'
 };
 const src=fileMap[key];
 if(!src)return null;
 dataBundleLoads[key]=loadScriptOnce(src).then(()=>window.SZO_DATA_BUNDLES[key]??null).catch(()=>null);
 return dataBundleLoads[key];
}

async function fetchJsonFile(path){
 const key=String(path||'').replace(/^data\//,'').replace(/\.json$/,'');
 const mapped=key==='drop_reverse'?'drop_reverse':key;
 const bundle=await loadDataBundle(mapped);
 if(bundle!==null && bundle!==undefined)return bundle;
 try{
  const res=await fetchTimeout('./'+path,60000);
  if(!res.ok)return null;
  return await res.json();
 }catch(e){
  return null;
 }
}

function buildDataIndexesFromJson(prebuiltReverse){
 itemIndex={};magicIndex={};statusIndex={};dropReverse={};
 for(const it of items)itemIndex[String(it.ID).trim()]=it;
 for(const m of magics)magicIndex[String(m.ID).trim()]=m;
 for(const s of statuses)statusIndex[String(intOf(s.ID))]=s;
 const monsterById={};
 for(const m of monsters)monsterById[String(m.ID).trim()]=m;
 if(prebuiltReverse && typeof prebuiltReverse==='object'){
  for(const [itemId,rows] of Object.entries(prebuiltReverse)){
   dropReverse[String(itemId)]=(rows||[]).map(row=>{
    const monster=monsterById[String(row.monsterId)]||{ID:row.monsterId,Name:row.monsterName};
    return {monster,rate:Number(row.rate)||0,weight:Number(row.weight)||0};
   }).filter(x=>x.monster);
  }
 }else{
  for(const m of monsters){
   for(const [iid,rate] of parseDropSafe(m.DropItem)){
    if(!dropReverse[iid])dropReverse[iid]=[];
    dropReverse[iid].push({monster:m,rate});
   }
  }
 }
 try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){console.warn('json sync failed',e)}
}

async function loadMainDataFromJson(){
 const [mon,item,prebuiltReverse]=await Promise.all([
  loadDataBundle('monsters'),
  loadDataBundle('items'),
  loadDataBundle('drop_reverse')
 ]);
 if(!Array.isArray(mon)||!mon.length||!Array.isArray(item)||!item.length)return false;
 monsters=mon;
 items=item;
 magics=[];
 statuses=[];
 monsterLocations={};
 buildDataIndexesFromJson(prebuiltReverse);
 loadOptionalJsonData();
 return true;
}

async function loadMonsterDataFromJson(){
 if(adoptPreloadedMonsterBundle())return true;
 const mon=await loadDataBundle('monsters');
 if(!Array.isArray(mon)||!mon.length)return false;
 monsters=mon;
 monsterDataReady=true;
 try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
 loadOptionalJsonData();
 return true;
}

function loadOptionalJsonData(){
 Promise.allSettled([
  loadDataBundle('magic').then(data=>{ if(Array.isArray(data))magics=data; }),
  loadDataBundle('status').then(data=>{ if(Array.isArray(data))statuses=data; }),
  loadDataBundle('locations').then(data=>{ if(data&&typeof data==='object'&&!Array.isArray(data))monsterLocations=data; })
 ]).then(()=>{
  magicIndex={};
  statusIndex={};
  for(const m of magics)magicIndex[String(m.ID).trim()]=m;
  for(const s of statuses)statusIndex[String(intOf(s.ID))]=s;
  try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
 }).catch(e=>console.warn('optional json load failed',e));
}

async function loadItemDataFromJson(){
 const item=await loadDataBundle('items');
 if(!Array.isArray(item)||!item.length)return false;
 items=item;
 magics=[];
 statuses=[];
 itemIndex={};magicIndex={};statusIndex={};
 for(const it of items)itemIndex[String(it.ID).trim()]=it;
 try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
 loadOptionalJsonData();
 return true;
}
async function loadAllData(){
 if(mainDataReady)return true;
 if(mainDataLoadPromise)return mainDataLoadPromise;
 mainDataLoadPromise=(async()=>{
  renderLoad();
  setTopStatus("Loading data");
  try{
   if(await loadMainDataFromJson()){
    mainDataReady=true;
    itemDataReady=true;
    setTopStatus("Ready");
    if(currentView==='home')renderHome();
    return true;
   }
   const [mon,item]=await Promise.all([
    fetchFirst(FILES.monsters,'?芰 INI'),
    fetchFirst(FILES.items,'? INI')
   ]);

   const missing=[];
   if(mon.missing)missing.push('MONSTER_C.INI');
   if(item.missing)missing.push('ITEM.INI');
   if(missing.length)throw new Error("Required data files failed to load: "+missing.join(', '));

   monsters=parseIni(mon.text);
   items=parseIni(item.text);
   magics=[];
   statuses=[];
   monsterLocations={};

   // Remove placeholder rows from source INI files.
   monsters=monsters.filter(x=>{
     const n=nameOf(x).trim().toUpperCase();
     return n && n!=='UNKNOWN' && n!=='NULL';
   });
   items=items.filter(x=>{
     const n=nameOf(x).trim().toUpperCase();
     return n && n!=='UNKNOWN' && n!=='NULL';
   });

   if(!monsters.length||!items.length)throw new Error("Required data is empty: monsters="+monsters.length+", items="+items.length);

   buildDataIndexes();
   mainDataReady=true;
   setTopStatus("Ready");
   if(currentView==='home')renderHome();
   loadOptionalMainData();
   return true;
  }catch(e){
   mainDataLoadPromise=null;
   setTopStatus("Load failed");
   loadLine(String(e.message||e),'bad');
   const manual=byId('manualGroup'); if(manual)manual.style.display='block';
   return false;
  }
 })();
 return mainDataLoadPromise;
}

function loadOptionalMainData(){
 if(optionalMainDataLoadPromise)return optionalMainDataLoadPromise;
 optionalMainDataLoadPromise=Promise.allSettled([
  fetchFirst(FILES.magics,'MAGIC.INI').then(magic=>{
   if(!magic.missing)magics=parseIni(magic.text);
  }),
  fetchFirst(FILES.statuses,'STATUS.INI').then(status=>{
   if(!status.missing)statuses=parseIni(status.text);
  }),
  fetchFirst(FILES.locations,'monster locations CSV').then(loc=>{
   if(!loc.missing)monsterLocations=parseLocations(loc.text);
  })
 ]).then(()=>{
  magicIndex={};
  statusIndex={};
  for(const m of magics)magicIndex[String(m.ID).trim()]=m;
  for(const s of statuses)statusIndex[String(intOf(s.ID))]=s;
  try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
 }).catch(e=>console.warn('optional data load failed',e));
 return optionalMainDataLoadPromise;
}

async function ensureItemDataLoaded(){
 return await ensureLookupDataLoaded();
}
window.ensureItemDataLoaded = ensureItemDataLoaded;

async function ensureItemDataLoadedOld(){
 if(mainDataReady){itemDataReady=true;return true;}
 if(itemDataReady)return true;
 if(itemDataLoadPromise)return itemDataLoadPromise;
 itemDataLoadPromise=(async()=>{
  setTopStatus("Loading item data");
  try{
   if(await loadItemDataFromJson()){
    itemDataReady=true;
    setTopStatus("Ready");
    return true;
   }
   const item=await fetchFirst(FILES.items,'ITEM.INI');
   if(item.missing)throw new Error("Required item data files failed to load: ITEM.INI");
   items=parseIni(item.text).filter(x=>{
    const n=nameOf(x).trim().toUpperCase();
    return n && n!=='UNKNOWN' && n!=='NULL';
   });
   magics=[];
   statuses=[];
   itemIndex={};magicIndex={};statusIndex={};
   for(const it of items)itemIndex[String(it.ID).trim()]=it;
   itemDataReady=true;
   setTopStatus("Ready");
   try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
   loadOptionalMainData();
   return true;
  }catch(e){
   itemDataLoadPromise=null;
   setTopStatus("Item data load failed");
   loadLine(String(e.message||e),'bad');
   return false;
  }
 })();
 return itemDataLoadPromise;
}

async function ensureMonsterDataLoaded(){
 return await ensureLookupDataLoaded();
}
window.ensureMonsterDataLoaded = ensureMonsterDataLoaded;

async function ensureLookupDataLoaded(){
 if(mainDataReady&&itemDataReady&&monsterDataReady)return true;
 if(mainDataLoadPromise)return mainDataLoadPromise;
 mainDataLoadPromise=loadAllData();
 const ok=await mainDataLoadPromise;
 if(ok){
  itemDataReady=true;
  monsterDataReady=true;
 }
 return ok;
}
window.ensureLookupDataLoaded = ensureLookupDataLoaded;

async function ensureMonsterDataLoadedOld(){
 if(monsterDataReady||mainDataReady)return true;
 if(monsterDataLoadPromise)return monsterDataLoadPromise;
 monsterDataLoadPromise=(async()=>{
  setTopStatus("Loading monster data");
  try{
   if(await loadMonsterDataFromJson()){
    setTopStatus("Ready");
    return true;
   }
   const mon=await fetchFirst(FILES.monsters,'MONSTER_C.INI');
   if(mon.missing)throw new Error("Required monster data files failed to load: MONSTER_C.INI");
   monsters=parseIni(mon.text).filter(x=>{
    const n=nameOf(x).trim().toUpperCase();
    return n && n!=='UNKNOWN' && n!=='NULL';
   });
   if(!monsters.length)throw new Error("Monster data is empty");
   monsterDataReady=true;
   setTopStatus("Ready");
   try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){}
   loadOptionalMainData();
   return true;
  }catch(e){
   monsterDataLoadPromise=null;
   setTopStatus("Monster data load failed");
   loadLine(String(e.message||e),'bad');
   return false;
  }
 })();
 return monsterDataLoadPromise;
}

async function ensureMainDataLoaded(){
 if(mainDataReady)return true;
 return await loadAllData();
}
window.ensureMainDataLoaded = ensureMainDataLoaded;

async function ensureCompoundDataLoaded(){
 if(compoundDataReady)return true;
 if(compoundDataLoadPromise)return compoundDataLoadPromise;
 compoundDataLoadPromise=(async()=>{
  setTopStatus("Loading compound data");
  try{
   if(typeof ensureLookupDataLoaded==='function'){
    const lookupOk=await ensureLookupDataLoaded();
    if(!lookupOk)throw new Error("Required lookup data failed to load before compound data");
   }
   await loadScriptOnce('js/data/equip-compound-data.js');
   const [comp,compCfg]=await Promise.all([
    fetchFirst(FILES.compounds||[],'? INI'),
    fetchFirst(FILES.compoundConfigs||[],'??蝬脩?閮剖? JSON')
   ]);
   try{
     compoundConfigData=compCfg.missing?null:JSON.parse(compCfg.text);
   }catch(e){
     compoundConfigData=null;
     console.warn('compound_config.json 閫??憭望?',e);
   }
   try{
     compoundIniRecipes=comp.missing?[]:buildCompoundRecipesFromIni(comp.text);
   }catch(e){
     compoundIniRecipes=[];
     console.warn("COMPOUND.INI parse failed",e);
   }
   compoundDataReady=true;
   setTopStatus("Ready");
   return true;
  }catch(e){
   compoundDataLoadPromise=null;
   setTopStatus("Compound data load failed");
   loadLine(String(e.message||e),'bad');
   return false;
  }
 })();
 return compoundDataLoadPromise;
}

async function ensureJiangshenToolLoaded(){
 if(jiangshenToolReady)return true;
 if(jiangshenToolLoadPromise)return jiangshenToolLoadPromise;
 jiangshenToolLoadPromise=(async()=>{
  const groups=window.SZO_SCRIPT_GROUPS||{};
  const list=[
   ...(groups.data_jiangshen||[]),
   ...(groups.data_training||[]),
   ...(groups.calc_jiangshen||[]),
   ...(groups.features_jiangshen||[]),
   ...(groups.enhancements_jiangshen||[])
  ];
  try{
   setTopStatus("Loading jiangshen tool");
   byId("reader").innerHTML="<section class=\"card\"><h1>Jiangshen tool loading</h1><div class=\"muted\">Loading jiangshen data and calculator.</div></section>";
   for(const src of list)await loadScriptOnce(src);
   jiangshenToolReady=true;
   setTopStatus("Ready");
   return true;
  }catch(e){
   jiangshenToolLoadPromise=null;
   setTopStatus("Jiangshen tool load failed");
   loadLine(String(e.message||e),'bad');
   return false;
  }
 })();
 return jiangshenToolLoadPromise;
}
window.ensureJiangshenToolLoaded = ensureJiangshenToolLoaded;

async function ensureSoulDataLoaded(){
 if(soulIniReady && typeof window.renderSoulCalcPage==='function')return true;
 if(soulIniLoadPromise)return soulIniLoadPromise;
 soulIniLoadPromise=(async()=>{
  try{
   const groups=window.SZO_SCRIPT_GROUPS||{};
   const list=[
    ...(groups.data_soul||[]),
    ...(groups.features_soul||[])
   ];
   byId('reader').innerHTML='<section class="card"><h1>Soul tool loading</h1><div class="muted">Loading soul data only when this tool is opened.</div></section>';
   for(const src of list)await loadScriptOnce(src);
   if(typeof buildSoulDataFromChangeBodyIni!=='function')throw new Error('Soul data tool is not loaded');
   const cb=await fetchFirst(FILES.changebody||[],'甇阡? INI');
   changeBodyIniSouls=cb.missing?[]:buildSoulDataFromChangeBodyIni(cb.text);
   window.changeBodyIniSouls=changeBodyIniSouls;
   soulIniReady=true;
   return true;
  }catch(e){
   soulIniReady=true;
   changeBodyIniSouls=[];
   window.changeBodyIniSouls=changeBodyIniSouls;
   console.warn('甇阡? INI 霈?仃??雿輻?批??鞈?',e);
   return true;
  }
 })();
 return soulIniLoadPromise;
}
function locOf(n){return monsterLocations[n]||''}
// [V201] monsterSearchText moved to js/monster.js

// [V201] uniqueMonsterValues moved to js/monster.js

// [V201] monsterRaceOptionsHTML moved to js/monster.js

// [V201] monsterSubtypeOptionsHTML moved to js/monster.js

// [V201] filterMonsterList moved to js/monster.js

// [V201] monsterResultsHTML moved to js/monster.js

// [V201] renderMonsterPage moved to js/monster.js

// [V201] searchMonstersMain moved to js/monster.js

function searchMonsters(){searchMonstersMain();}

// [V201] monsterSkillText moved to js/monster.js

// [V201] monsterMoneyText moved to js/monster.js

// [V201] monsterDropRows moved to js/monster.js

// [V201] monsterDropsTableHTML moved to js/monster.js

// [V201] showMonsterDropPage moved to js/monster.js


// V227: compactWan / breakSuggestText moved to js/calc/jiangshen-calc.js.
// [V201] showMonster moved to js/monster.js

// [V210] itemSearchText moved active to js/item.js

function searchItems(){
 const itemQ=byId('itemQ'); if(!itemQ)return;
 window.v86ItemQ=itemQ.value;
 window.v86ItemType=byId('itemType')?.value||'';
 window.v86ItemMin=byId('itemMin')?.value||'';
 window.v86ItemMax=byId('itemMax')?.value||'';

 const q=itemQ.value.trim().toLowerCase();
 const type=window.v86ItemType;
 const min=window.v86ItemMin?intOf(window.v86ItemMin):null;
 const max=window.v86ItemMax?intOf(window.v86ItemMax):null;

 const hasFilter = !!(q || type || window.v86ItemMin || window.v86ItemMax);
 const box=byId('itemResults');
 if(!box)return;
 if(!hasFilter){box.innerHTML='';return;}

 const arr=items.filter(it=>
  (!q||itemSearchText(it).includes(q)) &&
  (!type||it.Type===type) &&
  (min===null||intOf(it.Level)>=min) &&
  (max===null||intOf(it.Level)<=max)
 ).slice(0,150);

 box.innerHTML=arr.map(it=>`<button class="resultItem" data-item="${esc(it.ID)}"><div class="rName">${esc(nameOf(it))}</div><div class="rSub">Lv.${esc(it.Level||'')}嚚?{esc(itemTypeName(it.Type)||it.Type||'')}嚚D ${esc(it.ID)}</div></button>`).join('')||'<div class="muted">?曆??圈???/div>';
}
// [V210] showItem moved active to js/item.js



// V226: searchReverseItems / showReverse moved active to js/pages/reverse-page.js.



// v88o 靽桃毀璈鞈?嚗銝??shenzhou_training_data_with_ability(3).json ?批?嚗??憭???JSON 瑼?// V212: TRAINING_DATA 撌脩宏??js/data/training-data.js嚗 script-manifest.js ??app-core.js ???乓?

// Jiangshen mobile
// V227: STATS / DISPLAY_NAMES / EXP_ITEMS and jiangshen formula helpers moved to js/calc/jiangshen-calc.js.
function fillJiangFields(kind){
 const opts='<option value="">蝛箇</option>'+DISPLAY_NAMES.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 const stars1=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>${i} ??/option>`).join('');
 const stars20=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} ??/option>`).join('');

 if(kind==='support'){
  // V222: support comparison is handled by js/features/jiangshen/support-slots-compare.js.
  if(typeof window.renderSupportSlotsPage === 'function'){
    window.renderSupportSlotsPage();
  }else{
    byId("reader").innerHTML="<section class=\"card\"><h1>Support comparison</h1><div class=\"notice\">Support comparison is loading.</div></section>";
  }
 }


 if(kind==='compare'){
  byId('reader').innerHTML=`<section class="card"><h1>????撽耨蝺渲岫蝞?/h1><h2>銝駁?蟡?頛?/h2><div class="kvGrid">
  <div class="kv"><div class="k">?? A</div><div class="v"><select id="jsA">${opts}</select><label>??</label><select id="jsAS">${stars20}</select></div></div>
  <div class="kv"><div class="k">?? B</div><div class="v"><select id="jsB">${opts}</select><label>??</label><select id="jsBS">${stars20}</select></div></div>
  </div><div class="quick"><button id="calcCompare">?Ｙ?瘥???small>瘥??拐?銝駁?蟡?榆??/small></button></div></section>`;
 }

 if(kind==='stars'){
  byId('reader').innerHTML=`<section class="card"><h1>????撽耨蝺渲岫蝞?/h1><h2>20??</h2><div class="muted">?豢???敺??Ｙ? 0嚚?0 ???渲?蜇銵具?/div><div class="kvGrid">
  <div class="kv"><div class="k">?豢???</div><div class="v"><select id="jsStarName">${opts}</select></div></div>
  </div><div class="quick"><button id="calcStars">?Ｙ? 0嚚?0 ??蜇銵?small>摰憿舐內??蝑??/small></button></div></section>`;
 }

 if(kind==='starAura'){
  byId('reader').innerHTML=`<section class="card"><h1>????撽耨蝺渲岫蝞?/h1><h2>?? / ?除</h2>
  <h3>??嚗?閬????賊?</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">?桀???</div><div class="v"><select id="needCur">${Array.from({length:21},(_,i)=>`<option value="${i}">${i} ??/option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">?格???</div><div class="v"><select id="needTar">${Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} ??/option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">撌脫???擳??/div><div class="v"><input id="needOwned" type="number" value="0"></div></div>
    <div class="kv"><div class="k">????</div><div class="v"><input id="needRate" type="number" value="1"></div></div>
  </div>
  <h3>?除嚗???除</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">?桀?蝑?</div><div class="v"><input id="auraCur" type="number" value="1"></div></div>
    <div class="kv"><div class="k">?格?蝑?</div><div class="v"><input id="auraTar" type="number" value="20"></div></div>
  </div>
  <div class="quick"><button id="calcStarAura">閮?<small>閮??閬????賊???瘞?</small></button></div></section>`;
 }

 if(kind==='expPill'){
  byId('reader').innerHTML=`<section class="card"><h1>????撽耨蝺渲岫蝞?/h1><h2>蝑? / 蝬?銝?/h2>
  <div class="calcTabs">
    <button class="calcTab active" data-exp-tab="need">蝑?蝬?</button>
    <button class="calcTab" data-exp-tab="eat">蝬?銝孵?蝑?/button>
  </div>
  <div id="expTabNeed">
    <h3>蝑?嚗?閬?蝬???/h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">?曉蝑?</div><div class="v"><input id="expCur" type="number" value="1"></div></div>
      <div class="kv"><div class="k">?格?蝑?</div><div class="v"><input id="expTar" type="number" value="2000"></div></div>
    </div>
    <div class="quick"><button id="calcExpNeed">閮??閬?撽?small>??銋云???賬?????/small></button></div>
  </div>
  <div id="expTabEat" style="display:none">
    <h3>蝬?銝對??號?舀??撟曄?</h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">?曉蝑?</div><div class="v"><input id="eatStartLv" type="number" value="1"></div></div>
      <div class="kv"><div class="k">蝬?銝孵雿???</div><div class="v"><input id="eatUnitYi" type="number" value="100"></div></div>
      <div class="kv"><div class="k">蝬?銝寞??/div><div class="v"><input id="eatCount" type="number" value="1"></div></div>
    </div>
    <div class="quick"><button id="calcEatPill">閮???<small>靘??桐?憛?100 隞?” 100 ??/small></button></div>
  </div>
  </section>`;
 }

 if(kind==='training'){
  renderTrainingCalc();
  closeDrawer();
  window.scrollTo({top:0,behavior:'smooth'});
  return;
 }
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}
function updateSupportOptions(){
 const selects=[...document.querySelectorAll('.jsSupportName')];
 const values=selects.map(s=>s.value);
 const chosen=values.filter(Boolean);
 for(const sel of selects){
  const self=sel.value;
  const current=self;
  sel.innerHTML='<option value="">蝛箇</option>'+DISPLAY_NAMES.filter(n=>n===current || !chosen.includes(n)).map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('');
 }
}
// V238: restored Chinese training calculator UI and filtering.
function trainingData(){
 return (typeof TRAINING_DATA!=="undefined"&&TRAINING_DATA&&Array.isArray(TRAINING_DATA.data))?TRAINING_DATA.data:[];
}
function trainingGroupOrder(){
 return (typeof TRAINING_DATA!=="undefined"&&TRAINING_DATA&&Array.isArray(TRAINING_DATA.groupOrder))?TRAINING_DATA.groupOrder:[];
}
function trainingGroupRank(g){
 const idx=trainingGroupOrder().indexOf(g||'');
 return idx>=0?idx:999;
}
function trainingElementRank(text){
 const s=String(text||'');
 const order=['體魄','力量','智慧','靈敏','血量','精力','攻擊','防禦','術防','抗性'];
 const idx=order.findIndex(k=>s.includes(k));
 return idx>=0?idx:999;
}
function trainingDisplayName(name){return String(name||'');}
function trainingDiamondGroups(){return trainingGroupOrder().slice(5,8).filter(Boolean);}
function trainingEtherGroups(){return trainingGroupOrder().slice(8,10).filter(Boolean);}
function trainingFilterGroups(value){
 if(value==='group_diamond')return trainingDiamondGroups();
 if(value==='group_ether')return trainingEtherGroups();
 return value?[value]:[];
}
function trainingGroupLabel(g){
 const order=trainingGroupOrder();
 const labels=['四聖諦','天照珠玉','靈丹','聖靈煉金','真元'];
 const idx=order.indexOf(g||'');
 if(idx>=0&&idx<labels.length)return labels[idx];
 if(g==='group_diamond')return '聖鑽相關';
 if(g==='group_ether')return '乙太相關';
 return g||'全部分類';
}
function trainingViewGroupValue(g){
 if(trainingDiamondGroups().includes(g))return 'group_diamond';
 if(trainingEtherGroups().includes(g))return 'group_ether';
 return g||'';
}
function sortedTrainingData(){
 return trainingData().map((x,i)=>({x,i})).sort((a,b)=>{
  const ga=trainingGroupRank(a.x.group),gb=trainingGroupRank(b.x.group);
  if(ga!==gb)return ga-gb;
  const ea=trainingElementRank((a.x.item||'')+trainingDisplayName(a.x.name)+(a.x.stat||''));
  const eb=trainingElementRank((b.x.item||'')+trainingDisplayName(b.x.name)+(b.x.stat||''));
  if(ea!==eb)return ea-eb;
  return trainingDisplayName(a.x.name).localeCompare(trainingDisplayName(b.x.name),'zh-Hant');
 });
}
function sortMaterialEntries(entries){
 return entries.sort((a,b)=>String(a[0]||'').localeCompare(String(b[0]||''),'zh-Hant'));
}
function appendTrainingNote(x){return String((x&&x.note)||'').trim();}
function trainingLevelNeed(x,cur,tar){
 let need=0;
 for(let lv=cur;lv<tar;lv++)need+=Number((x.costs||[])[lv]||0);
 return need;
}
function renderTrainingCalc(){
 const order=trainingGroupOrder();
 const groupOptions=[...order.slice(0,5), 'group_diamond', 'group_ether'].filter(Boolean);
 const groupOpts='<option value="">全部分類</option>'+groupOptions.map(g=>`<option value="${esc(g)}">${esc(trainingGroupLabel(g))}</option>`).join('');
 function card(pair){
  const x=pair.x,i=pair.i;
  const max=Number(x.maxLevel||0);
  const cur=Math.min(max,Math.max(0,Number(x.defaultCurrentLevel||0)));
  const tar=Math.min(max,Math.max(cur,Number(x.defaultTargetLevel||max)));
  const fullNeed=trainingLevelNeed(x,0,max);
  const defaultNeed=trainingLevelNeed(x,cur,tar);
  const sub=x.subGroup?` / ${x.subGroup}`:'';
  const note=appendTrainingNote(x);
  const derived=x.inputMode==='derived';
  return `<div class="trainCard" data-train-row="${i}" data-group="${esc(trainingViewGroupValue(x.group||''))}">
    <div class="trainCardHead"><div><div class="trainName">${esc(trainingDisplayName(x.name||''))}</div><div class="trainSub">${esc(trainingGroupLabel(x.group||'')+sub)} / ${esc(trainingDisplayName(x.stat||''))}</div></div><div class="trainBadge">滿階 ${max}</div></div>
    <div class="trainNeedBox"><b>需要材料</b>${esc(x.item||'材料')} x <span class="trainNeed" data-i="${i}">${fmt(defaultNeed)}</span><div class="rSub">0 到滿階：${fmt(fullNeed)}</div></div>
    ${note?`<div class="trainNote">${esc(note)}</div>`:''}
    <div class="trainLevels">
      <div><label>目前階</label><input class="trainCur" data-i="${i}" type="number" min="0" max="${max}" value="${cur}" ${derived?'readonly':''}></div>
      <div><label>目標階</label><input class="trainTar" data-i="${i}" type="number" min="0" max="${max}" value="${tar}" ${derived?'readonly':''}></div>
    </div>
  </div>`;
 }
 byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>修練機制</h2>
 <div class="notice">選擇目前階與目標階，會計算需要材料，以及從目前階提升到目標階增加的能力。計算結果預設隱藏，按下「計算修練」後才會顯示。</div>
 <div class="kvGrid">
  <div class="kv"><div class="k">分類篩選</div><div class="v"><select id="trainGroupFilter">${groupOpts}</select></div></div>
  <div class="kv"><div class="k">快速設定</div><div class="v"><div class="quick" style="margin-top:0"><button id="trainCurrentZero" type="button">目前階歸0<small>只把目前階設為 0，目標階不變</small></button><button id="trainCurrentMax" type="button">目前階滿階<small>只把目前階設為滿階，目標階不變</small></button></div></div></div>
 </div>
 <h3>修練項目</h3>
 <div class="trainingList">${sortedTrainingData().map(card).join('')}</div>
 <div class="quick"><button id="calcTraining" type="button">計算修練<small>只統計目前分類篩選內的項目</small></button></div>
 <div id="trainingResultWrap" style="display:none"><div id="trainingResult"></div></div>
 </section>`;
 bindTrainingControls();
 applyTrainingDerivedLevels();
 updateTrainingNeeds();
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}
function bindTrainingControls(){
 const group=byId('trainGroupFilter');
 if(group)group.onchange=function(){filterTrainingRows();};
 const zero=byId('trainCurrentZero');
 if(zero)zero.onclick=function(e){e.preventDefault();setTrainingCurrentZero();};
 const max=byId('trainCurrentMax');
 if(max)max.onclick=function(e){e.preventDefault();setTrainingCurrentMax();};
 const calc=byId('calcTraining');
 if(calc)calc.onclick=function(e){e.preventDefault();calcTraining();};
 document.querySelectorAll('.trainCur,.trainTar').forEach(el=>{
  el.oninput=function(){updateTrainingNeeds();};
  el.onchange=function(){clampTrainingInputs();updateTrainingNeeds();};
 });
}
function filterTrainingRows(){
 const g=byId('trainGroupFilter')?.value||'';
 document.querySelectorAll('[data-train-row]').forEach(el=>{el.style.display=(!g||el.dataset.group===g)?'':'none';});
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='none';
}
function applyTrainingDerivedLevels(){
 const data=trainingData();
 const idToIndex=Object.fromEntries(data.map((x,i)=>[x.id,i]));
 data.forEach((x,i)=>{
  if(x.inputMode!=='derived'||!x.deriveRule||!Array.isArray(x.deriveRule.sourceIds))return;
  const curVals=[],tarVals=[];
  for(const sid of x.deriveRule.sourceIds){
   const si=idToIndex[sid]; if(si===undefined)continue;
   const sdata=data[si]; const smax=Number(sdata.maxLevel||0);
   const curEl=document.querySelector(`.trainCur[data-i="${si}"]`);
   const tarEl=document.querySelector(`.trainTar[data-i="${si}"]`);
   if(curEl)curVals.push(Math.max(0,Math.min(smax,intOf(curEl.value,0))));
   if(tarEl)tarVals.push(Math.max(0,Math.min(smax,intOf(tarEl.value,smax))));
  }
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  const max=Number(x.maxLevel||0);
  if(curEl&&curVals.length)curEl.value=Math.max(0,Math.min(max,Math.min(...curVals)));
  if(tarEl&&tarVals.length)tarEl.value=Math.max(0,Math.min(max,Math.min(...tarVals)));
 });
}
function clampTrainingInputs(){
 trainingData().forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(!curEl||!tarEl)return;
  let cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  let tar=Math.max(0,Math.min(max,intOf(tarEl.value,max)));
  if(tar<cur)tar=cur;
  curEl.value=cur; tarEl.value=tar;
 });
 applyTrainingDerivedLevels();
 updateTrainingNeeds();
}
function updateTrainingNeeds(){
 applyTrainingDerivedLevels();
 trainingData().forEach((x,i)=>{
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  const needEl=document.querySelector(`.trainNeed[data-i="${i}"]`);
  if(!curEl||!tarEl||!needEl)return;
  const cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  const tar=Math.max(cur,Math.min(max,intOf(tarEl.value,max)));
  needEl.textContent=fmt(trainingLevelNeed(x,cur,tar));
 });
}
function setTrainingCurrentZero(){
 trainingData().forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  if(curEl)curEl.value=0;
 });
 updateTrainingNeeds();
}
function setTrainingCurrentMax(){
 trainingData().forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  if(curEl)curEl.value=max;
 });
 updateTrainingNeeds();
}
function setTrainingAllMax(){setTrainingCurrentZero();}
function clearTrainingTargets(){setTrainingCurrentMax();}
function calcTraining(){
 window.v86LastView='jiang';
 clampTrainingInputs();
 const selectedGroup=byId('trainGroupFilter')?.value||'';
 const selectedGroups=trainingFilterGroups(selectedGroup);
 const effectOrder=(typeof TRAINING_DATA!=="undefined"&&TRAINING_DATA&&TRAINING_DATA.effectStatOrder)||[];
 const costByItem={};
 const gainByStat=Object.fromEntries(effectOrder.map(s=>[s,0]));
 const detail=[];
 const data=trainingData();
 for(let i=0;i<data.length;i++){
  const x=data[i];
  if(selectedGroups.length && !selectedGroups.includes(x.group))continue;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(!curEl||!tarEl)continue;
  const cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  const tar=Math.max(cur,Math.min(max,intOf(tarEl.value,max)));
  if(tar<=cur)continue;
  const cost=trainingLevelNeed(x,cur,tar);
  if(cost && !x.excludeFromItemSummary){costByItem[x.item||'材料']=(costByItem[x.item||'材料']||0)+cost;}
  const curEff=(x.effectsByLevel||[])[cur]||{};
  const tarEff=(x.effectsByLevel||[])[tar]||{};
  const gains={};
  const keys=new Set([...Object.keys(curEff),...Object.keys(tarEff),...(x.effectStats||[])]);
  keys.forEach(k=>{const v=Number(tarEff[k]||0)-Number(curEff[k]||0); if(v){gains[k]=v; gainByStat[k]=(gainByStat[k]||0)+v;}});
  detail.push({name:trainingDisplayName(x.name||''), group:x.group||'', subGroup:x.subGroup||'', item:x.item||'', cur, tar, cost, gains, note:appendTrainingNote(x), noCost:!!x.excludeFromItemSummary});
 }
 const costRows=sortMaterialEntries(Object.entries(costByItem)).map(([item,n])=>`<tr><td>${esc(item)}</td><td>${fmt(n)}</td></tr>`).join('');
 const allStats=[...effectOrder,...Object.keys(gainByStat).filter(s=>!effectOrder.includes(s))];
 const gainRows=allStats.filter(s=>gainByStat[s]).map(s=>`<tr><td>${esc(trainingDisplayName(s))}</td><td>+${fmt(gainByStat[s])}</td></tr>`).join('');
 const detailRows=detail.sort((a,b)=>trainingGroupRank(a.group)-trainingGroupRank(b.group)||trainingElementRank(a.item+a.name)-trainingElementRank(b.item+b.name)||a.name.localeCompare(b.name,'zh-Hant')).map(d=>{
  const gainText=Object.entries(d.gains).map(([k,v])=>`${trainingDisplayName(k)}+${fmt(v)}`).join('、')||'-';
  const sub=d.subGroup?` / ${d.subGroup}`:'';
  const materialText=d.noCost?'不列入材料統計':`${d.item} x ${fmt(d.cost)}`;
  return `<tr><td><b>${esc(d.name)}</b><div class="rSub">${esc(trainingGroupLabel(d.group)+sub)}</div>${d.note?`<div class="rSub">${esc(d.note)}</div>`:''}</td><td>${d.cur} → ${d.tar}</td><td>${esc(materialText)}</td><td>${esc(gainText)}</td></tr>`;
 }).join('');
 const title=selectedGroup?`計算結果：${esc(trainingGroupLabel(selectedGroup))}`:'計算結果';
 byId('trainingResult').innerHTML=`<h3>${title}</h3>
 ${detail.length?'':'<div class="empty">目前沒有選擇要提升的項目，請調整目標階後再計算。</div>'}
 ${costRows?`<h3>材料總計</h3><div class="tableWrap"><table><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${costRows}</tbody></table></div>`:''}
 ${gainRows?`<h3>增加能力</h3><div class="tableWrap"><table><thead><tr><th>能力</th><th>增加值</th></tr></thead><tbody>${gainRows}</tbody></table></div>`:''}
 ${detailRows?`<h3>明細</h3><div class="tableWrap"><table><thead><tr><th>項目</th><th>階數</th><th>材料</th><th>增加能力</th></tr></thead><tbody>${detailRows}</tbody></table></div>`:''}`;
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='block';
 byId('trainingResult').scrollIntoView({behavior:'smooth',block:'start'});
}
function goBackToPrevious(targetView){
 const v=targetView||window.v86LastView||currentView||'home';
 if(v==='item'){
  openItemMenuOnly();
  Promise.resolve(renderItemPage('item')).then(()=>{
   closeDrawer();
   window.scrollTo({top:0,behavior:'smooth'});
  });
 }
 else if(v==='reverse')setView('reverse');
 else if(v==='monster')setView('monster');
 else if(v==='jiang')setView('jiang');
 else setView('home');
}
window.addEventListener('popstate',()=>goBackToPrevious());


function backLabelFor(view){
 if(view==='monster')return '返回怪物查詢';
 if(view==='item')return '返回道具查詢';
 if(view==='reverse')return '返回道具反查';
 if(view==='shop')return '返回商店販賣資訊';
 if(view==='jiang')return '返回降神、經驗、修練試算';
 return '返回首頁';
}
function backButtonHTML(view){
 return `<button class="backBtn" onclick="goBackToPrevious('${view||''}')">← ${esc(backLabelFor(view||window.v86LastView||currentView))}</button>`;
}

function initEvents(){
 byId('openMenuBtn').onclick=openDrawer;byId('closeMenuBtn').onclick=closeDrawer;byId('backdrop').onclick=closeDrawer;
 document.addEventListener('change',e=>{if(e.target.classList&&e.target.classList.contains('jsSupportName'))updateSupportOptions(); if(e.target.classList&&(e.target.classList.contains('trainCur')||e.target.classList.contains('trainTar'))){clampTrainingInputs(); updateTrainingNeeds();}});
 document.addEventListener('click',e=>{const v=e.target.closest('[data-view]')?.dataset.view;if(v){if(v==='jiang')openJiangMenuOnly();else setView(v);}const o=e.target.closest('[data-open]')?.dataset.open;if(o){setView(o);if(window.innerWidth<980)openDrawer()}const jo=e.target.closest('[data-jiang-open]')?.dataset.jiangOpen;if(jo){setJiang(jo)}const io=e.target.closest('[data-item-open]')?.dataset.itemOpen;if(io){setItemSub(io)}const jk=e.target.closest('[data-jiang]')?.dataset.jiang;if(jk)setJiang(jk);const mid=e.target.closest('[data-monster]')?.dataset.monster;if(mid){e.preventDefault();e.stopPropagation();showMonster(mid);return;}const iid=e.target.closest('[data-item]')?.dataset.item;if(iid)showItem(iid);const rid=e.target.closest('[data-rev]')?.dataset.rev;if(rid)showReverse(rid);const rr=e.target.closest('[data-reverse-item]')?.dataset.reverseItem;if(rr)showReverse(rr);const equid=e.target.closest('[data-eq-uid]')?.dataset.eqUid;if(equid){openEquipmentSim(equid);}const eg=e.target.closest('[data-eq-group]')?.dataset.eqGroup;if(eg){eqRenderPreview();}const er=e.target.closest('[data-eq-recipe]')?.dataset.eqRecipe;if(er){eqToggleRecipe(er);}const esr=e.target.closest('[data-eq-sim-recipe]')?.dataset.eqSimRecipe;if(esr){eqSimToggleRecipe(esr);}if(e.target.classList&&e.target.classList.contains('jsSupportName'))updateSupportOptions();if(e.target.id==='calcSupport')calcSupport();if(e.target.id==='calcCompare')calcCompare();if(e.target.id==='calcStars')calcStars();if(e.target.id==='calcNeeds')calcNeeds();if(e.target.id==='calcStarAura')calcStarAura();if(e.target.id==='calcExpNeed')calcExpNeed();if(e.target.id==='calcEatPill')calcEatPill();if(e.target.id==='calcTraining')calcTraining();if(e.target.id==='eqShowMaterials')showEquipmentMaterials();if(e.target.id==='eqBackToSim')eqRenderPreview();if(e.target.id==='eqBackToList')renderEquipmentCompoundPage();if(e.target.id==='eqOpenRandom')renderEquipmentRandomPage();if(e.target.id==='eqSimOnce'){eqRandomOnce();renderEquipmentRandomPage(true);}if(e.target.id==='eqSimClear'){const keep=Object.assign({},eqState.simSelectedRecipes||{});eqResetRandom(false);eqState.simSelectedRecipes=keep;renderEquipmentRandomPage(true);}if(e.target.id==='trainCurrentZero'||e.target.id==='trainAllMax')setTrainingCurrentZero();if(e.target.id==='trainCurrentMax'||e.target.id==='trainClear')setTrainingCurrentMax();const et=e.target.closest('[data-exp-tab]');if(et){document.querySelectorAll('.calcTab').forEach(b=>b.classList.remove('active'));et.classList.add('active');byId('expTabNeed').style.display=et.dataset.expTab==='need'?'block':'none';byId('expTabEat').style.display=et.dataset.expTab==='eat'?'block':'none';}});
 ['monsterQ','monsterMin','monsterMax'].forEach(id=>{const el=byId(id); if(el)el.addEventListener('input',searchMonsters);});
 
 
 document.addEventListener('input',e=>{if(e.target.classList&&(e.target.classList.contains('trainCur')||e.target.classList.contains('trainTar'))){updateTrainingNeeds();} if(e.target.id==='eqQ'){eqState.q=e.target.value;eqRefreshList();} if(e.target.classList&&e.target.classList.contains('eqRecipeCount')){eqSetRecipeCount(e.target.dataset.eqRecipeCount,e.target.value);}
 if(['monsterQMain','monsterMinMain','monsterMaxMain','monsterRaceMain','monsterSubtypeMain'].includes(e.target.id))searchMonstersMain();if(['itemQ','itemMin','itemMax'].includes(e.target.id))searchItems();if(e.target.id==='reverseQ')searchReverseItems();});
 document.addEventListener('change',e=>{if(e.target.id==='itemType')searchItems();if(e.target.id==='trainGroupFilter')filterTrainingRows();if(['eqMain','eqSeries','eqTier','eqType'].includes(e.target.id)){eqState[e.target.id.replace('eq','').toLowerCase()]=e.target.value; if(e.target.id==='eqMain'){eqState.series='';eqState.tier='';eqState.type='';} if(e.target.id==='eqSeries'){eqState.tier='';eqState.type='';} if(e.target.id==='eqTier'){eqState.type='';} eqState.uid='';eqState.recipeId='';renderEquipmentCompoundPage();} if(e.target.id==='eqSelect'){openEquipmentSim(e.target.value);} if(e.target.matches('[data-eq-recipe-select]')&&e.target.value){eqAddRecipe(e.target.value);} if(e.target.matches('[data-eq-sim-recipe-select]')&&e.target.value){eqSimAddRecipe(e.target.value);}});
 document.addEventListener('click',e=>{const tab=e.target.closest('[data-item-tab]')?.dataset.itemTab;if(tab){renderItemPage(tab);}});
 byId('manualFiles').addEventListener('change',async e=>{alert('這個版本目前不需要手動載入檔案。');});
}
function initAuth(){ if(!AUTH_REQUIRED)return true; try{const key=localStorage.getItem('combined_manual_tool_license_key'); if(key&&typeof validateLicenseKey==='function'){validateLicenseKey(key);return true}}catch(e){} byId('mainShell').style.display='none';byId('licenseModal').style.display='flex';return false}
async function init(){
 initEvents();
 adoptPreloadedMonsterBundle();
 renderHome();
 const ok=initAuth();
 if(ok){
  setTimeout(()=>ensureMonsterDataLoaded().then(()=>{if(currentView==='home')renderHome();}),500);
 }
}
window.SZOAppInit = init;

const AUTH_REQUIRED = false;
const RAW_BASE = 'https://raw.githubusercontent.com/leonmax78/leonmax78.github.io/main/';
const FILES = {
  monsters:['MONSTER_C.INI','MONSTER_C.ini','monster_c.ini','MONSTER.INI','monster.ini'],
  items:['ITEM.INI','item.ini'],
  magics:['MAGIC.INI','magic.ini'],
  statuses:['STATUS.INI','status.ini'],
  locations:['一般怪物位置.csv','一般怪物位置.CSV','monsterLocations.csv','monster_locations.csv','怪物位置.csv'],
  compounds:['COMPOUND.INI','COMPOUN.INI','COMPOUND.ini','COMPOUN.ini','compound.ini','compoun.ini'],
  compoundConfigs:['data/compound_config.json','compound_config.json'],
  changebody:['CHANGEBODYITEM.INI','ChangeBodyItem.ini','changebodyitem.ini','CHANGEBODY.INI','changebody.ini'],
  version:['data_version.txt']
};
// V212: EQUIP_COMPOUND_DATA 已移到 js/data/equip-compound-data.js，由 script-manifest.js 在 app-core.js 前載入。

const ITEM_TYPE_MAP={"SWORD":"劍","BLADE":"刀","WHISK":"拂塵","STAFF":"禪杖","HIDDEN_WEAPON":"暗器","SPEAR":"槍","ROD":"棍","AXE":"斧","HAMMER":"錘","SHIELD":"盾牌","HELMET":"頭盔","ARMOR":"鎧甲","BRACER":"護腕","BOOT":"鞋子","ORNAMENT":"飾品","UNDER_BOOT":"仙器"};
const SUBTYPE_MAP={"0x00000001|0x00000001":"百姓","0x00000001|0x00000002":"官差","0x00000001|0x00000004":"正道中人","0x00000001|0x00000008":"正十字軍","0x00000001|0x00000010":"天兵","0x00000001|0x00000020":"天界神","0x00000001|0x00000040":"艾濟王族","0x00000001|0x00000080":"禁軍","0x00000002|0x00000001":"盜匪","0x00000002|0x00000002":"蠻族","0x00000002|0x00000004":"叛軍","0x00000002|0x00000008":"侏人族","0x00000002|0x00000010":"十字軍","0x00000002|0x00000020":"女巫","0x00000002|0x00000040":"墮真者","0x00000002|0x00000080":"艾濟冥司","0x00000002|0x00000100":"太極國","0x00000002|0x00000200":"天門教","0x00000004|0x00000001":"夜叉族","0x00000004|0x00000002":"巨魔族","0x00000004|0x00000004":"修羅族","0x00000004|0x00000008":"夸父族","0x00000004|0x00000010":"刑天族","0x00000004|0x00000020":"百眼族","0x00000004|0x00000040":"土行族","0x00000004|0x00000080":"鷹翅族","0x00000004|0x00000100":"惡魔","0x00000004|0x00000200":"冥河","0x00000004|0x00000400":"魔界","0x00000008|0x00000001":"亡魂","0x00000008|0x00000002":"殭屍","0x00000008|0x00000004":"骷髏","0x00000008|0x00000008":"魅","0x00000008|0x00000010":"水母","0x00000008|0x00000020":"四兇","0x00000008|0x00000040":"木乃伊","0x00000010|0x00000001":"石怪","0x00000010|0x00000002":"樹精","0x00000010|0x00000004":"火妖","0x00000010|0x00000008":"水鬼","0x00000010|0x00000010":"花精","0x00000010|0x00000020":"靈芝精","0x00000010|0x00000040":"人蔘精","0x00000010|0x00000080":"風靈","0x00000010|0x00000100":"火元素","0x00000010|0x00000200":"水元素","0x00000010|0x00000400":"地元素","0x00000010|0x00000800":"風元素","0x00000010|0x00001000":"蝶精","0x00000010|0x00002000":"食人花","0x00000020|0x00000001":"蜘蛛精","0x00000020|0x00000002":"妖靈","0x00000020|0x00000004":"鬼卒","0x00000020|0x00000008":"蟾蜍精","0x00000020|0x00000010":"蛇妖","0x00000020|0x00000020":"蝦兵","0x00000020|0x00000040":"蜂后","0x00000020|0x00000080":"兔精","0x00000020|0x00000100":"熊妖","0x00000020|0x00000200":"虎妖","0x00000020|0x00000400":"狐妖","0x00000020|0x00000800":"狸妖","0x00000020|0x00001000":"豬妖","0x00000020|0x00002000":"猴妖","0x00000020|0x00004000":"蟹兵","0x00000020|0x00008000":"鯊兵","0x00000020|0x00010000":"章魚","0x00000020|0x00020000":"蕈傘人","0x00000020|0x00040000":"地靈","0x00000020|0x00080000":"蜥蜴人","0x00000020|0x00100000":"鷹女","0x00000020|0x00200000":"蝸牛","0x00000020|0x00400000":"狼人","0x00000040|0x00000001":"蟾蜍","0x00000040|0x00000002":"蜘蛛","0x00000040|0x00000004":"蠍子","0x00000040|0x00000008":"蛇類","0x00000040|0x00000010":"蜈蚣","0x00000040|0x00000020":"蜜蜂","0x00000040|0x00000040":"蠶","0x00000040|0x00000080":"蛤蟆","0x00000080|0x00000001":"狂猴","0x00000080|0x00000002":"巨猿","0x00000080|0x00000004":"猛虎","0x00000080|0x00000008":"惡狼","0x00000080|0x00000010":"豬類","0x00000080|0x00000020":"犬類","0x00000080|0x00000040":"鼠類","0x00000080|0x00000080":"蝙蝠","0x00000080|0x00000100":"蜥蜴","0x00000080|0x00000200":"鱷魚","0x00000080|0x00000400":"龜","0x00000080|0x00000800":"羊類","0x00000080|0x00001000":"牛類","0x00000080|0x00002000":"馬類","0x00000080|0x00004000":"豹類","0x00000080|0x00008000":"地底猛獸","0x00000080|0x00010000":"象類","0x00000080|0x00020000":"駱駝","0x00000080|0x00040000":"獅","0x00000080|0x00080000":"貓熊","0x00000080|0x00100000":"犀牛","0x00000080|0x00200000":"巨狸","0x00000080|0x00400000":"熊","0x00000100|0x00000001":"雞類","0x00000100|0x00000002":"鷹類","0x00000100|0x00000004":"蛾","0x00000200|0x00000001":"陵墓兵俑","0x00000200|0x00000002":"晶石怪","0x00000200|0x00000004":"人面獅身","0x00000200|0x00000008":"機關人","0x00000400|0x00000001":"巨蛟","0x00000400|0x00000002":"龍王","0x00000400|0x00000004":"飛龍","0x00000400|0x00000008":"西方龍","0x00000400|0x00000010":"雲蛟","0x00000400|0x00000020":"艾濟諸神","0x00000400|0x00000040":"龍龜","0x00000800|0x00000001":"鳳凰","0x00000800|0x00000002":"仙鶴","0x00000800|0x00000004":"孔雀","0x00000800|0x00000008":"娃娃魚","0x00001000|0x00000001":"麒麟","0x00001000|0x00000002":"兔仙","0x00001000|0x00000004":"狐仙","0x00001000|0x00000008":"狸仙","0x00001000|0x00000010":"紫靈貂","0x00001000|0x00000020":"蒼狼","0x00001000|0x00000040":"白鹿","0x00002000|0x00000001":"機關","0x00002000|0x00000002":"寶箱","0x00002000|0x00000004":"旗子","0x00002000|0x00000008":"專有怪","0x00002000|0x00000010":"魔王","0x00004000|0x00000001":"海魚","0x00004000|0x00000002":"蠑螈","0x00008000|0x00000001":"蛇眼星","0x00008000|0x00000002":"方舟","0x00008000|0x00000004":"太古深淵","0x00008000|0x00000008":"九界樹","0x00008000|0x00000010":"鬥羅關","0x00008000|0x00000020":"誅仙庭"};
const RACE_MAP={"0x00000001":"正道系","0x00000002":"惡人系","0x00000004":"魔族系","0x00000008":"死靈系","0x00000010":"精怪系","0x00000020":"妖物系","0x00000040":"蠱毒系","0x00000080":"猛獸系","0x00000100":"凶禽系","0x00000200":"魔偶系","0x00000400":"神獸系","0x00000800":"仙禽系","0x00001000":"靈獸系","0x00002000":"特殊類","0x00004000":"海獸系","0x00008000":"宇外系"};
// V212: DATA 已移到 js/data/jiangshen-data.js，由 script-manifest.js 在 app-core.js 前載入。



let monsters=[],items=[],magics=[],statuses=[],monsterLocations={};
let compoundIniRecipes=[];
let compoundConfigData=null;
let changeBodyIniSouls=[];
let itemIndex={},magicIndex={},statusIndex={},dropReverse={};

  
  SZO_SYNC_DATA(); // V210d after index build
// V210c：把內部資料掛到 window，讓外部模組 reverse.js / item.js 可穩定讀取。
  window.SZO_DATA = window.SZO_DATA || {};
  window.SZO_DATA.items = items;
  window.SZO_DATA.itemIndex = itemIndex;
  window.SZO_DATA.dropReverse = dropReverse;
  window.items = items;
  window.itemIndex = itemIndex;
  window.dropReverse = dropReverse;
let currentView='home';

// V210d：資料同步橋接。外部模組可呼叫 window.SZO_SYNC_DATA() 取得 app-core 內部資料。
function SZO_SYNC_DATA(){
  try{
    window.SZO_DATA = window.SZO_DATA || {};
    window.SZO_DATA.items = Array.isArray(items) ? items : [];
    window.SZO_DATA.itemIndex = itemIndex || {};
    window.SZO_DATA.dropReverse = dropReverse || {};
    window.SZO_DATA.monsters = Array.isArray(monsters) ? monsters : [];
    window.SZO_DATA.magicIndex = magicIndex || {};
    window.SZO_DATA.statusIndex = statusIndex || {};
    return window.SZO_DATA;
  }catch(e){
    console.warn('SZO_SYNC_DATA failed', e);
    window.SZO_DATA = window.SZO_DATA || {};
    return window.SZO_DATA;
  }
}
window.SZO_SYNC_DATA = SZO_SYNC_DATA;


function byId(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function nameOf(o){return String((o&&o.Name)||'').trim()}
function intOf(v,d=0){const n=parseInt(String(v??'').replace(/,/g,''),10);return Number.isFinite(n)?n:d}
function fmt(n){if(typeof n==='bigint')return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); const x=Number(n); if(!Number.isFinite(x))return String(n??''); return Math.round(x).toLocaleString('en-US')}
function normHex(v){if(!v)return "";v=String(v).trim();if(/^0x/i.test(v))return "0x"+v.slice(2).toUpperCase().padStart(8,"0");const n=Number(v);if(Number.isFinite(n))return "0x"+n.toString(16).toUpperCase().padStart(8,"0");return v.toUpperCase()}
function raceName(v){const h=normHex(v);return RACE_MAP[h]||h||''}
function subtypeName(type,sub){const th=normHex(type), sh=normHex(sub);return SUBTYPE_MAP[`${th}|${sh}`]||sh||''}
// [V210] itemTypeName moved active to js/item.js

function statusName(id){return statusIndex[String(intOf(id))]?.Name||''}
function magicName(id){return magicIndex[String(intOf(id))]?.Name||''}
// [V210] itemKind moved active to js/item.js


// v88g：依舊版 index.html 的邏輯，特殊能力只讀 ITEM.INI 的 ExtraStatus。
// 不再掃描 StatusID / Effect / EFFECT_GIVE 這些系統欄位，避免顯示成 StatusID:EFFECT_GIVE。
// [V210] itemStatus moved active to js/item.js


// v88g：道具能力依舊版 index.html 的欄位順序與中文名稱，不再用「所有非 0 欄位」亂列。
const ITEM_DETAIL_ORDER=['ID','Name','Type','Kind','ExtraStatus','Level','CLevel','HP','MP','Con','Str','Int','Dex','ExtraDef','Damage','MagicAttack','MagicDef','IceDef','FireDef','LightningDef','DarkDef','ParalysisRes','PosionRes','BlindRes','SilentRes','Value'];
const ITEM_DETAIL_RENAME={'Name':'名稱','Type':'類型','Kind':'專剋','ExtraStatus':'特殊能力','Level':'等級','CLevel':'職等','HP':'血量','MP':'精力','Con':'體魄','Str':'力量','Int':'智慧','Dex':'靈敏','ExtraDef':'物理防禦','MagicAttack':'術法攻擊','MagicDef':'術法防禦','IceDef':'冰防','FireDef':'火防','LightningDef':'電防','DarkDef':'冥防','ParalysisRes':'抗定身','PosionRes':'抗毒','BlindRes':'抗盲目','SilentRes':'抗禁咒','Value':'價值'};

// [V210] itemDetailRows moved active to js/item.js


// [V210] itemAbilityFields moved active to js/item.js


function openDrawer(){byId('drawer').classList.add('open');byId('backdrop').classList.add('open')}
function closeDrawer(){byId('drawer').classList.remove('open');byId('backdrop').classList.remove('open')}
function setTopStatus(s){byId('topStatus').textContent=s}

function renderJiangHome(){
 byId('reader').innerHTML='';
}
function openJiangMenuOnly(){
 currentView='jiang';
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='jiang'));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 byId('jiangForm')?.classList.add('active');
 renderJiangHome();
}
function setView(view){
 currentView=view;
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 if(view==='home'){renderHome(); closeDrawer();}
 else if(view==='jiang'){openJiangMenuOnly();}
 else if(view==='monster'){renderMonsterPage(); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 else if(view==='item'){openItemMenuOnly();}
 else if(view==='soul'){
  currentView='soul';
  document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='soul'));
  document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
  if(typeof window.renderSoulCalcPage==='function') window.renderSoulCalcPage();
  closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
 }
 else if(view==='reverse'){renderItemPage('reverse'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
}
function setJiang(kind){
 openJiangMenuOnly();
 fillJiangFields(kind);
}

function renderItemPage(tab='item'){
 const activeItem=tab==='item';
 const activeReverse=tab==='reverse';
 if(tab==='compound'){renderEquipmentCompoundPage();return;}
 byId('reader').innerHTML=activeItem?`<section class="card"><h1>道具查詢</h1>
  <div class="kvGrid">
    <div class="kv"><div class="k">道具名稱 / ID / 類型</div><div class="v"><input id="itemQ" placeholder="例如：火神砲、錦囊、277" value="${esc(window.v86ItemQ||'')}"></div></div>
    <div class="kv"><div class="k">類型</div><div class="v"><select id="itemType"></select></div></div>
    <div class="kv"><div class="k">等級起</div><div class="v"><input id="itemMin" type="number" value="${esc(window.v86ItemMin||'')}"></div></div>
    <div class="kv"><div class="k">等級迄</div><div class="v"><input id="itemMax" type="number" value="${esc(window.v86ItemMax||'')}"></div></div>
  </div>
  <div class="results" id="itemResults"></div>
 </section>`:`<section class="card"><h1>掉落反查</h1>
  <div class="kvGrid"><div class="kv"><div class="k">輸入道具名稱</div><div class="v"><input id="reverseQ" placeholder="例如：侯氏兵甲福袋2020" value="${esc(window.v86ReverseQ||'')}"></div></div></div>
  <div class="results" id="reverseResults"></div>
 </section>`;
 const sel=byId('itemType');
 if(sel){sel.innerHTML='<option value="">全部類型</option>'+Object.entries(ITEM_TYPE_MAP).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join(''); sel.value=window.v86ItemType||'';}
 if(activeItem)searchItems(); else if(activeReverse)searchReverseItems();
}
function openItemMenuOnly(){
 currentView='item';
 document.querySelectorAll('.navBtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='item'));
 document.querySelectorAll('.formBox').forEach(f=>f.classList.remove('active'));
 byId('itemForm')?.classList.add('active');
 byId('reader').innerHTML='';
}
function setItemSub(kind){
 openItemMenuOnly();
 if(kind==='item'){renderItemPage('item'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 if(kind==='reverse'){renderItemPage('reverse'); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
 if(kind==='compound'){renderEquipmentCompoundPage(); closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});}
}
function renderHome(){
 byId('reader').innerHTML='';
}
function renderLoad(){
 // v82：正式版正常不顯示讀取狀態，避免像工程頁。
 // 讀取失敗時才會把 loadCard 顯示出來。
 const old=byId('loadCard');
 if(old)old.remove();
}
function loadLine(msg,type='info'){
 // v82：只有錯誤才顯示讀取狀態。
 if(type!=='bad')return;
 let card=byId('loadCard');
 if(!card){
  card=document.createElement('section');
  card.className='card';
  card.id='loadCard';
  card.innerHTML='<h1>資料讀取失敗</h1><div id="loadLines" class="muted"></div>';
  byId('reader').prepend(card);
 }
 const el=byId('loadLines');
 if(!el)return;
 const cls=type==='ok'?'loadOk':type==='bad'?'loadBad':'loadLine';
 el.innerHTML+=`<div class="${cls}">${msg}</div>`;
}
function empty(msg){byId('reader').innerHTML=`<section class="empty">${esc(msg)}</section>`}

function candidateUrls(name){const enc=encodeURIComponent(name).replace(/%2F/g,'/'); return ['./'+enc, RAW_BASE+enc]}
async function fetchTimeout(url,ms=12000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),ms);try{return await fetch(url,{cache:'no-store',signal:ctrl.signal})}finally{clearTimeout(t)}}
async function fetchFirst(names,label){
 const tried=[];
 for(const name of names){
  for(const url of candidateUrls(name)){
   try{
    loadLine(`讀取 ${esc(name)} ...`);
    const res=await fetchTimeout(url);
    tried.push(`${url} HTTP ${res.status}`);
    if(res.ok){
      const buf=await res.arrayBuffer();
      let text='';
      try{text=new TextDecoder('big5').decode(buf)}catch(e){}
      if(!text || text.includes('�')){try{text=new TextDecoder('utf-8').decode(buf)}catch(e){}}
      if(text&&text.trim()){loadLine(`成功：${esc(name)} (${Math.round(buf.byteLength/1024)} KB)`,'ok');return {name,text,tried}}
    }
   }catch(e){tried.push(`${url} ${e.name==='AbortError'?'逾時':(e.message||e)}`)}
  }
 }
 loadLine(`${esc(label)} 讀取失敗`,'bad');
 return {missing:true,tried};
}
function parseIni(text){
 const data=[];let cur=null;function push(){if(cur&&Object.keys(cur).length)data.push(cur);cur=null}
 for(const raw of String(text||'').replace(/^\ufeff/,'').split(/\r?\n/)){
  const line=String(raw||'').trim(); if(!line||line.startsWith('//')||line.startsWith(';'))continue;
  if(line.startsWith('[')&&line.endsWith(']')){push();cur={};continue}
  const p=line.indexOf('='); if(p<0)continue;
  const k=line.slice(0,p).trim(), v=line.slice(p+1).trim();
  if(/^ID$/i.test(k)&&cur&&(cur.ID!==undefined||cur.Id!==undefined||cur.id!==undefined))push();
  if(!cur)cur={}; cur[k]=v;
 }
 push(); return data.filter(x=>x&&(x.ID!==undefined||x.Name!==undefined));
}
function parseCSVLine(line){const out=[];let val='',q=false;for(let i=0;i<line.length;i++){const c=line[i],n=line[i+1];if(q){if(c==='"'&&n==='"'){val+='"';i++}else if(c==='"')q=false;else val+=c}else{if(c==='"')q=true;else if(c===','){out.push(val);val=''}else val+=c}}out.push(val);return out.map(x=>String(x||'').trim())}
function parseLocations(text){const map={};for(const raw of String(text||'').replace(/^\ufeff/,'').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('//'))continue;let p=line.includes(',')?parseCSVLine(line):line.split(/\t+/).map(x=>x.trim());p=p.filter(Boolean);if(p.length<2)continue;const n=p[0],loc=p.slice(1).join('、');if(!n||n==='怪物名稱'||n.toLowerCase()==='name')continue;if(map[n]&&!map[n].includes(loc))map[n]+='、'+loc;else map[n]=loc}return map}
// [V201] parseDrop moved to js/monster.js

function buildDataIndexes(){
 itemIndex={};magicIndex={};statusIndex={};dropReverse={};
 for(const it of items)itemIndex[String(it.ID).trim()]=it;
 for(const m of magics)magicIndex[String(m.ID).trim()]=m;
 for(const s of statuses)statusIndex[String(intOf(s.ID))]=s;
 const seenReverse=new Set();
 for(const m of monsters){
  const mid=String(m.ID||nameOf(m)||'').trim();
  for(const [iid,rate] of parseDrop(m.DropItem)){
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
 const sel=byId('itemType'); if(sel){sel.innerHTML='<option value="">全部類型</option>'+Object.entries(ITEM_TYPE_MAP).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')}
 try{ if(typeof SZO_SYNC_DATA==='function') SZO_SYNC_DATA(); }catch(e){console.warn('reverse sync failed',e)} // V101 reverse sync after buildDataIndexes
}
async function loadAllData(){
 renderLoad();
 setTopStatus('讀取中');
 try{
  const mon=await fetchFirst(FILES.monsters,'怪物 INI');
  const item=await fetchFirst(FILES.items,'道具 INI');
  const magic=await fetchFirst(FILES.magics,'技能 INI');
  const status=await fetchFirst(FILES.statuses,'狀態 INI');
  const loc=await fetchFirst(FILES.locations,'怪物位置 CSV');
  const comp=await fetchFirst(FILES.compounds||[],'配方 INI');
  const compCfg=await fetchFirst(FILES.compoundConfigs||[],'合成網站設定 JSON');
  const cb=await fetchFirst(FILES.changebody||[],'武魂 INI');

  if(mon.missing||item.missing||magic.missing)throw new Error('必要檔案讀取失敗');

  monsters=parseIni(mon.text);
  items=parseIni(item.text);
  magics=parseIni(magic.text);
  statuses=status.missing?[]:parseIni(status.text);
  monsterLocations=loc.missing?{}:parseLocations(loc.text);

  try{
    compoundConfigData=compCfg.missing?null:JSON.parse(compCfg.text);
  }catch(e){
    compoundConfigData=null;
    console.warn('compound_config.json 解析失敗',e);
  }

  compoundIniRecipes=comp.missing?[]:buildCompoundRecipesFromIni(comp.text);
  changeBodyIniSouls=cb.missing?[]:buildSoulDataFromChangeBodyIni(cb.text);

  // v82：排除第一筆/雜訊 UNKNOWN，但保留原始 INI 順序。
  monsters=monsters.filter(x=>{
    const n=nameOf(x).trim().toUpperCase();
    return n && n!=='UNKNOWN' && n!=='NULL';
  });
  items=items.filter(x=>{
    const n=nameOf(x).trim().toUpperCase();
    return n && n!=='UNKNOWN' && n!=='NULL';
  });

  if(!monsters.length||!items.length||!magics.length)throw new Error('解析後資料不足');

  buildDataIndexes();
  setTopStatus('已載入');
  renderHome();
 }catch(e){
  setTopStatus('讀取失敗');
  loadLine(String(e.message||e),'bad');
  byId('manualGroup').style.display='block';
 }
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


function compactWan(n){
 n=Math.max(0,Math.round(Number(n)||0));
 if(n>=10000){let v=n/10000; return (Math.round(v*10)/10).toString().replace(/\.0$/,'')+'萬';}
 return String(n);
}
function breakSuggestText(def){
 const d=Number(def)||0; if(!d)return '';
 const r=64893/87946; // 依玩家參考值：力 87946 / 敏 64893
 const s=d/(2+r/2), x=s*r;
 const ar=38612/60583; // 暗器 / 術者參考：力 38612 / 敏 60583
 const ax=d/(2+ar/2), as=ax*ar;
 return compactWan(s)+'力 / '+compactWan(x)+'敏；暗器約 '+compactWan(as)+'力 / '+compactWan(ax)+'敏';
}
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

 box.innerHTML=arr.map(it=>`<button class="resultItem" data-item="${esc(it.ID)}"><div class="rName">${esc(nameOf(it))}</div><div class="rSub">Lv.${esc(it.Level||'')}｜${esc(itemTypeName(it.Type)||it.Type||'')}｜ID ${esc(it.ID)}</div></button>`).join('')||'<div class="muted">找不到道具</div>';
}
// [V210] showItem moved active to js/item.js



// [V208] searchReverseItems moved active to js/reverse.js

// [V208] showReverse moved active to js/reverse.js



// v88o 修練機制資料：由上傳的 shenzhou_training_data_with_ability(3).json 內嵌，避免額外讀取 JSON 檔
// V212: TRAINING_DATA 已移到 js/data/training-data.js，由 script-manifest.js 在 app-core.js 前載入。


// Jiangshen mobile
const STATS = DATA.stats; const DISPLAY_NAMES = DATA.displayNames; const EXP_ITEMS={'乙太 8000億':8000n*100000000n,'鑽石 3000億':3000n*100000000n,'真元 500億':500n*100000000n};
function canonicalName(n){n=String(n??'').trim();if(!n||n==='空格')return null;if(DATA.aliases[n])return DATA.aliases[n];if(DATA.baseStats[n])return n;return null}
function ability(n,star){const c=canonicalName(n); if(!c)throw new Error('找不到降神：'+n); const base=DATA.baseStats[c], out={}; for(const st of STATS)out[st]=Number(base[st]||0)*Number(DATA.starMultipliers[st][star]||1); return out}
function scaleAbility(src,rate=1){const out={}; for(const st of STATS)out[st]=Number(src[st]||0)*rate; return out}
function activeCombos(names){const set=new Set(names.map(canonicalName).filter(Boolean)), res=[]; for(const [combo,members] of Object.entries(DATA.comboMembers)){const need=members.map(canonicalName).filter(Boolean); if(need.length&&need.every(x=>set.has(x)))res.push(combo)} return res}
function comboBonus(combos){const total=Object.fromEntries(STATS.map(s=>[s,0])); for(const c of combos){const b=DATA.comboBonuses[c]||{}; for(const st of STATS)total[st]+=Number(b[st]||0)} return total}
function comboText(c){const b=DATA.comboBonuses[c]||{}, parts=[]; for(const st of STATS){if(b[st])parts.push(`${st}+${fmt(b[st])}`)} return parts.join('、')||'無'}
function fillJiangFields(kind){
 const opts='<option value="">空白</option>'+DISPLAY_NAMES.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 const stars1=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===1?'selected':''}>${i} 星</option>`).join('');
 const stars20=Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} 星</option>`).join('');

 if(kind==='support'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>副降神模擬</h2>
  <div class="notice">主降神以 100% 能力計算；副降神 1～4 以原本能力的 10% 計算。</div>
  <div class="kvGrid">
    <div class="kv"><div class="k">主降神</div><div class="v"><select id="jsN0" class="jsSupportName" data-index="0">${opts}</select><label>星等</label><select id="jsS0">${stars1}</select></div></div>
    ${Array.from({length:4},(_,i)=>`<div class="kv"><div class="k">副降神 ${i+1}</div><div class="v"><select id="jsN${i+1}" class="jsSupportName" data-index="${i+1}">${opts}</select><label>星等</label><select id="jsS${i+1}">${stars1}</select></div></div>`).join('')}
  </div>
  <div class="quick"><button id="calcSupport">產生閱讀頁<small>主降神 100%，副降神 10%，並計算成立連結</small></button></div></section>`;
  updateSupportOptions();
 }

 if(kind==='compare'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>主降神比較</h2><div class="kvGrid">
  <div class="kv"><div class="k">降神 A</div><div class="v"><select id="jsA">${opts}</select><label>星等</label><select id="jsAS">${stars20}</select></div></div>
  <div class="kv"><div class="k">降神 B</div><div class="v"><select id="jsB">${opts}</select><label>星等</label><select id="jsBS">${stars20}</select></div></div>
  </div><div class="quick"><button id="calcCompare">產生比較頁<small>比較兩位主降神能力差異</small></button></div></section>`;
 }

 if(kind==='stars'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>20星等</h2><div class="muted">選擇降神後，產生 0～20 星完整能力總表。</div><div class="kvGrid">
  <div class="kv"><div class="k">選擇降神</div><div class="v"><select id="jsStarName">${opts}</select></div></div>
  </div><div class="quick"><button id="calcStars">產生 0～20 星能力總表<small>完整顯示各星等能力</small></button></div></section>`;
 }

 if(kind==='starAura'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>星等 / 靈氣</h2>
  <h3>星等：需要的降神數量</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">目前星等</div><div class="v"><select id="needCur">${Array.from({length:21},(_,i)=>`<option value="${i}">${i} 星</option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">目標星等</div><div class="v"><select id="needTar">${Array.from({length:21},(_,i)=>`<option value="${i}" ${i===20?'selected':''}>${i} 星</option>`).join('')}</select></div></div>
    <div class="kv"><div class="k">已有降神魂數量</div><div class="v"><input id="needOwned" type="number" value="0"></div></div>
    <div class="kv"><div class="k">降神倍率</div><div class="v"><input id="needRate" type="number" value="1"></div></div>
  </div>
  <h3>靈氣：所需靈氣</h3>
  <div class="kvGrid">
    <div class="kv"><div class="k">目前等級</div><div class="v"><input id="auraCur" type="number" value="1"></div></div>
    <div class="kv"><div class="k">目標等級</div><div class="v"><input id="auraTar" type="number" value="20"></div></div>
  </div>
  <div class="quick"><button id="calcStarAura">計算<small>計算需要的降神數量與靈氣數</small></button></div></section>`;
 }

 if(kind==='expPill'){
  byId('reader').innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>等級 / 經驗丹</h2>
  <div class="calcTabs">
    <button class="calcTab active" data-exp-tab="need">等級經驗</button>
    <button class="calcTab" data-exp-tab="eat">經驗丹升等</button>
  </div>
  <div id="expTabNeed">
    <h3>等級：需要的經驗值</h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">現在等級</div><div class="v"><input id="expCur" type="number" value="1"></div></div>
      <div class="kv"><div class="k">目標等級</div><div class="v"><input id="expTar" type="number" value="2000"></div></div>
    </div>
    <div class="quick"><button id="calcExpNeed">計算需要經驗<small>換算乙太、聖鑽、真元顆數</small></button></div>
  </div>
  <div id="expTabEat" style="display:none">
    <h3>經驗丹：吃丹可提升到幾等</h3>
    <div class="kvGrid">
      <div class="kv"><div class="k">現在等級</div><div class="v"><input id="eatStartLv" type="number" value="1"></div></div>
      <div class="kv"><div class="k">經驗丹單位（億）</div><div class="v"><input id="eatUnitYi" type="number" value="100"></div></div>
      <div class="kv"><div class="k">經驗丹數量</div><div class="v"><input id="eatCount" type="number" value="1"></div></div>
    </div>
    <div class="quick"><button id="calcEatPill">計算升等<small>例如單位填 100 代表 100 億</small></button></div>
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
  sel.innerHTML='<option value="">空白</option>'+DISPLAY_NAMES.filter(n=>n===current || !chosen.includes(n)).map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('');
 }
}
let eqState={main:'',series:'',tier:'',type:'',q:'',uid:'',recipeCounts:{},simTotals:null,simCount:0,simRecipeCounts:{}};


// V106：CHANGEBODYITEM.INI 武魂資料讀取。
// [V207] parseChangeBodyIniBlocks moved active to external module.

// [V207] soulNum moved active to external module.

// [V207] buildSoulDataFromChangeBodyIni moved active to external module.

// [V207] getSoulListV106 moved active to external module.


// V104：COMPOUND.INI 配方讀取。
// 注意：COMPOUND.INI 欄位不足時，材料會從原內嵌配方備援補上，避免材料頁壞掉。
function parseCompoundIniMulti(text){
 const data=[];let cur=null;
 function push(){if(cur&&Object.keys(cur).length)data.push(cur);cur=null}
 for(const raw of String(text||'').replace(/^\ufeff/,'').split(/\r?\n/)){
  const line=String(raw||'').trim();
  if(!line||line.startsWith('//')||line.startsWith(';'))continue;
  if(line.startsWith('[')&&line.endsWith(']')){push();cur={};continue}
  const p=line.indexOf('='); if(p<0)continue;
  const k=line.slice(0,p).trim(),v=line.slice(p+1).trim();
  if(/^ID$/i.test(k)&&cur&&(cur.ID!==undefined))push();
  if(!cur)cur={};
  if(k==='Type'){
   if(!Array.isArray(cur.Type))cur.Type=cur.Type?[cur.Type]:[];
   cur.Type.push(v);
  }else if(cur[k]!==undefined){
   if(!Array.isArray(cur[k]))cur[k]=[cur[k]];
   cur[k].push(v);
  }else cur[k]=v;
 }
 push();return data.filter(x=>x&&(x.ID!==undefined||x.Name!==undefined||x.Item!==undefined));
}
function compTypeToDisplay(code){return ITEM_TYPE_MAP[String(code||'').trim()]||String(code||'').trim()}
function compGroupFromStable(stable,types){
 const s=Number(stable)||0;
 const isUnder=(types||[]).includes('UNDER_BOOT');
 if(isUnder||s>=70)return 'stable_70';
 if(s>=50)return 'stable_50';
 if(s>=12)return 'stable_12';
 return 'stable_1';
}
function compGroupLabel(g){return g==='stable_70'?'安定值70':g==='stable_50'?'安定值50':g==='stable_12'?'安定值12':'安定值1'}
function compEffectList(r){
 const defs=[
  ['ConMin','ConMax','con','體魄'],['StrMin','StrMax','str','力量'],['IntMin','IntMax','int','智慧'],['DexMin','DexMax','dex','靈敏'],
  ['HPMin','HPMax','hp','生命'],['MPMin','MPMax','mp','精力'],['DamageMin','DamageMax','damage','傷害'],['MagicAttackMin','MagicAttackMax','m_attack','術法攻擊'],
  ['ExtraDefMin','ExtraDefMax','def','物理防禦'],['MagicDefMin','MagicDefMax','m_def','術法防禦'],
  ['FireAttMin','FireAttMax','fire_attack','火傷'],['IceAttMin','IceAttMax','ice_attack','冰傷'],['LightningAttMin','LightningAttMax','lightning_attack','雷傷'],['DarkAttMin','DarkAttMax','dark_attack','冥傷'],
  ['FireProbMin','FireProbMax','fire_prob','火傷機率'],['IceProbMin','IceProbMax','ice_prob','冰傷機率'],['LightningProbMin','LightningProbMax','lightning_prob','雷傷機率'],['DarkProbMin','DarkProbMax','dark_prob','冥傷機率']
 ];
 const out=[];
 for(const [a,b,stat,label] of defs){
  const mn=Number(r[a]),mx=Number(r[b]);
  if(Number.isFinite(mn)||Number.isFinite(mx)){
   const min=Number.isFinite(mn)?mn:(Number.isFinite(mx)?mx:0);
   const max=Number.isFinite(mx)?mx:min;
   if(min!==0||max!==0)out.push({stat,label,min,max,stackable:true,raw_fields:[a,b]});
  }
 }
 return out;
}
function buildCompoundRecipesFromIni(text){
 const rows=parseCompoundIniMulti(text);
 const old=(((compoundConfigData&&compoundConfigData.recipes)||((typeof EQUIP_COMPOUND_DATA!=='undefined')&&EQUIP_COMPOUND_DATA.recipes))||[]);
 const oldByItem={},oldByName={};
 old.forEach(o=>{if(o.item_id)oldByItem[String(o.item_id)]=o;if(o.name)oldByName[o.name]=o});
 return rows.map(r=>{
  const itemId=String(r.Item||'').trim();
  const name=String(r.Name||('配方 '+(r.ID||itemId))).trim();
  const types=Array.isArray(r.Type)?r.Type:(r.Type?[r.Type]:[]);
  const group=compGroupFromStable(r.Stable,types);
  const fallback=oldByItem[itemId]||oldByName[name]||{};
  const effects=compEffectList(r);
  return Object.assign({},fallback,{
   id:Number(r.ID)||fallback.id||name,
   item_id:Number(itemId)||fallback.item_id||null,
   item_name:name,
   name,
   group,
   group_label:compGroupLabel(group),
   stable_value:Number(r.Stable)||fallback.stable_value||0,
   max_ref:Number(r.MaxRef)||fallback.max_ref||0,
   fail_rate:(r.Fail!==undefined&&r.Fail!=='')?Number(r.Fail):fallback.fail_rate,
   value:(r.Value!==undefined&&r.Value!=='')?Number(r.Value):fallback.value,
   type_codes:types.length?types:(fallback.type_codes||[]),
   display_types:types.length?types.map(compTypeToDisplay).filter(Boolean):(fallback.display_types||[]),
   first_raw:r.First!==undefined?Number(r.First):fallback.first_raw,
   effects:effects.length?effects:(fallback.effects||[]),
   materials:fallback.materials||[],
   _recipe_source:'COMPOUND.INI'
  });
 }).filter(r=>r.name);
}

function eqData(){
 const fallback=EQUIP_COMPOUND_DATA||{equipment:[],recipes:[],type_order:[],calc_rules:{}};
 const cfg=compoundConfigData||fallback;
 const base=Object.assign({},fallback,cfg);
 if(compoundIniRecipes&&compoundIniRecipes.length){
  base.recipes=mergeCompoundIniRecipesWithConfig(compoundIniRecipes,(cfg.recipes||fallback.recipes||[]));
 }
 return base;
}
function mergeCompoundIniRecipesWithConfig(iniRecipes,configRecipes){
 const cfgByItem={},cfgByName={};
 (configRecipes||[]).forEach(r=>{
  if(r.item_id!==undefined&&r.item_id!==null)cfgByItem[String(r.item_id)]=r;
  if(r.name)cfgByName[String(r.name)]=r;
 });
 const cfgRecipeNames=new Set((configRecipes||[]).map(x=>String(x.name||'').trim()).filter(Boolean));
 const cfgRecipeItems=new Set((configRecipes||[]).map(x=>String(x.item_id||'').trim()).filter(Boolean));
 return (iniRecipes||[]).map(r=>{
  const cfg=cfgByItem[String(r.item_id)]||cfgByName[String(r.name)]||{};
  // 只有 compound_config.json 白名單內的配方才顯示
  const inWhitelist=
    cfgRecipeNames.has(String(r.name||'').trim()) ||
    cfgRecipeItems.has(String(r.item_id||'').trim());

  const out=Object.assign({},cfg,r);

  // 白名單外直接隱藏
  if(!inWhitelist) out.hidden=true;

  // config 控制網站邏輯
  out.materials=(cfg.materials&&cfg.materials.length)?cfg.materials:(r.materials||[]);
  if(cfg.hidden!==undefined)out.hidden=cfg.hidden;
  if(cfg.display===false)out.hidden=true;

  if(cfg.group_override)out.group=cfg.group_override;
  if(cfg.group_label_override)out.group_label=cfg.group_label_override;
  if(cfg.sort_order!==undefined)out.sort_order=cfg.sort_order;

  out._recipe_source='COMPOUND.INI + compound_config.json';
  return out;
 }).filter(r=>!r.hidden);
}
function eqUnique(arr){return [...new Set(arr.filter(v=>v!==undefined&&v!==null&&String(v).trim()!==''))]}

// V104：合成裝備能力優先讀 ITEM.INI；讀不到才用內嵌備援。
function eqEquipList(){return (eqData().equipment||[]).map(eqMergeItemIniStats)}
function eqMergeItemIniStats(eq){
 if(!eq)return eq;
 const id=String(eq.item_id||eq.Item||'').trim();
 const ini=(typeof itemIndex!=='undefined'&&itemIndex)?itemIndex[id]:null;
 if(!ini)return eq;
 const copy=Object.assign({},eq);
 copy.raw_item=ini;
 copy.base_stats=eqBuildBaseStatsFromItemIni(ini,eq.base_stats||{});
 copy._stats_source='ITEM.INI';
 return copy;
}
function eqNumOrUndef(v){if(v===undefined||v===null||v==='')return undefined;const n=Number(v);return Number.isFinite(n)?n:undefined}
function eqAddStatFromIni(base,key,label,val){const n=eqNumOrUndef(val);if(n!==undefined&&n!==0)base[key]={label,value:n}}
function eqAddRangeFromIni(base,key,label,min,max){
 const a=eqNumOrUndef(min),b=eqNumOrUndef(max);
 if(a!==undefined||b!==undefined){const mn=a!==undefined?a:(b||0),mx=b!==undefined?b:mn;if(mn!==0||mx!==0)base[key]={label,min:mn,max:mx}}
}
function eqBuildBaseStatsFromItemIni(raw,fallback){
 const base={};
 if(raw.Level!==undefined)base.level={label:'等級',value:eqNumOrUndef(raw.Level)||0};
 if(raw.CLevel!==undefined)base.clevel={label:'職等(CL)',value:eqNumOrUndef(raw.CLevel)||0};
 eqAddStatFromIni(base,'con','體魄',raw.Con);
 eqAddStatFromIni(base,'str','力量',raw.Str);
 eqAddStatFromIni(base,'int','智慧',raw.Int);
 eqAddStatFromIni(base,'dex','靈敏',raw.Dex);
 eqAddStatFromIni(base,'hp','生命',raw.HP);
 eqAddStatFromIni(base,'mp','精力',raw.MP);
 eqAddRangeFromIni(base,'damage','傷害',raw.DamageMin,raw.DamageMax);
 eqAddStatFromIni(base,'m_attack','術法攻擊',raw.MagicAttack);
 eqAddStatFromIni(base,'def','物理防禦',raw.ExtraDef);
 eqAddStatFromIni(base,'m_def','術法防禦',raw.MagicDef);
 eqAddStatFromIni(base,'fire_attack','火傷',raw.FireAttack);
 eqAddStatFromIni(base,'ice_attack','冰傷',raw.IceAttack);
 eqAddStatFromIni(base,'lightning_attack','雷傷',raw.LightningAttack);
 eqAddStatFromIni(base,'dark_attack','冥傷',raw.DarkAttack);
 eqAddStatFromIni(base,'fire_prob','火傷機率',raw.FireProb);
 eqAddStatFromIni(base,'ice_prob','冰傷機率',raw.IceProb);
 eqAddStatFromIni(base,'lightning_prob','雷傷機率',raw.LightningProb);
 eqAddStatFromIni(base,'dark_prob','冥傷機率',raw.DarkProb);
 eqAddStatFromIni(base,'ice_def','冰防',raw.IceDef);
 eqAddStatFromIni(base,'fire_def','火防',raw.FireDef);
 eqAddStatFromIni(base,'lightning_def','雷防',raw.LightningDef);
 eqAddStatFromIni(base,'dark_def','冥防',raw.DarkDef);
 eqAddStatFromIni(base,'paralysis_res','抗定身',raw.ParalysisRes);
 eqAddStatFromIni(base,'poison_res','抗毒',raw.PosionRes??raw.PoisonRes);
 eqAddStatFromIni(base,'blind_res','抗盲目',raw.BlindRes);
 eqAddStatFromIni(base,'silent_res','抗禁咒',raw.SilentRes);
 eqAddStatFromIni(base,'durability','耐久',raw.Durabulity??raw.Durability);
 eqAddStatFromIni(base,'weight','重量',raw.Weight);
 for(const k of ['level','clevel'])if(base[k]===undefined&&fallback[k]!==undefined)base[k]=fallback[k];
 return base;
}

function eqRecipesForType(tp){return (eqData().recipes||[]).filter(r=>(r.display_types||[]).includes(tp))}
function eqFmtVal(v){return v===undefined||v===null||v===''?'':fmt(Number(v)||0)}
function eqStatValueText(o){if(!o)return''; if(o.min!==undefined||o.max!==undefined)return `${eqFmtVal(o.min)}～${eqFmtVal(o.max)}`; return eqFmtVal(o.value)}
function eqStatNum(o,side){if(!o)return 0; if(o.value!==undefined)return Number(o.value)||0; if(side==='max')return Number(o.max)||0; return Number(o.min)||0}
function eqFilteredEquipment(){
 const q=(eqState.q||'').trim().toLowerCase();
 return eqEquipList().filter(e=>(!eqState.main||e.main_category===eqState.main)&&(!eqState.series||e.series_group===eqState.series)&&(!eqState.tier||String(e.tier||e.series_grade||'')===String(eqState.tier))&&(!eqState.type||e.display_type===eqState.type)&&(!q||String(e.search_text||e.name||'').toLowerCase().includes(q))).slice(0,160);
}
function eqFillSelect(id,vals,allLabel,cur){const el=byId(id); if(!el)return; el.innerHTML=`<option value="">${esc(allLabel)}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''); el.value=cur||'';}
function eqRefreshFilters(){
 const all=eqEquipList();
 eqFillSelect('eqMain',eqUnique(all.map(e=>e.main_category)),'全部種類',eqState.main);
 const a1=all.filter(e=>!eqState.main||e.main_category===eqState.main);
 eqFillSelect('eqSeries',eqUnique(a1.map(e=>e.series_group)),'全部系列',eqState.series);
 const a2=a1.filter(e=>!eqState.series||e.series_group===eqState.series);
 const tiers=eqUnique(a2.map(e=>e.tier||e.series_grade)).sort((a,b)=>{const na=Number(a),nb=Number(b); if(!isNaN(na)&&!isNaN(nb))return na-nb; return String(a).localeCompare(String(b),'zh-Hant')});
 eqFillSelect('eqTier',tiers,'全部階級 / 等級',eqState.tier);
 const typeOrder=eqData().type_order||[];
 const types=eqUnique(a2.filter(e=>!eqState.tier||String(e.tier||e.series_grade||'')===String(eqState.tier)).map(e=>e.display_type)).sort((a,b)=>{let ia=typeOrder.indexOf(a),ib=typeOrder.indexOf(b); if(ia<0)ia=999;if(ib<0)ib=999; return ia-ib;});
 eqFillSelect('eqType',types,'全部類型 / 部位',eqState.type);
}
function eqRefreshList(){
 const box=byId('eqList'); if(!box)return;
 const arr=eqFilteredEquipment();
 box.innerHTML=arr.map(e=>`<button class="resultItem" data-eq-uid="${esc(e.uid)}"><div class="rName">${esc(e.name)}</div><div class="rSub">${esc(e.main_category||'')}｜${esc(e.series||e.series_group||'')}｜${esc(e.display_type||'')}｜Lv.${esc(e.base_stats?.level||e.raw_item?.Level||'')}｜ID ${esc(e.item_id||'')}</div></button>`).join('') || '<div class="empty">請調整篩選條件，或找不到裝備。</div>';
}
function eqSelected(){return eqEquipList().find(e=>e.uid===eqState.uid)||null}
function eqAllowedRecipes(){
 const eq=eqSelected(); if(!eq)return [];
 const tp=eq.display_type;
 return eqRecipesForType(tp);
}
function eqRecipeById(id){return (eqData().recipes||[]).find(r=>String(r.id)===String(id))||null}
function eqSelectedRecipes(){
 const allowed=new Set(eqAllowedRecipes().map(r=>String(r.id)));
 return eqSortRecipePicks(Object.entries(eqState.recipeCounts||{}).filter(([id,c])=>allowed.has(String(id)) && Number(c)>0).map(([id,c])=>({recipe:eqRecipeById(id),count:Math.max(1,intOf(c,1))})).filter(x=>x.recipe));
}
function eqRecipeDefaultCount(recipe){return Math.max(1,intOf(recipe?.default_use_count,1)||1)}
function eqRecipeGroupRank(recipe){
 const g=recipe?.group||'';
 if(g==='stable_1')return 1;
 if(g==='stable_12')return 2;
 if(g==='stable_50')return 3;
 if(g==='stable_70')return 4;
 return 99;
}
function eqRecipeOrderIndex(recipe){
 const arr=eqData().recipes||[];
 const i=arr.findIndex(r=>String(r.id)===String(recipe?.id));
 return i<0?99999:i;
}
function eqSortRecipeObjects(arr){
 return (arr||[]).slice().sort((a,b)=>eqRecipeGroupRank(a)-eqRecipeGroupRank(b)||eqRecipeOrderIndex(a)-eqRecipeOrderIndex(b)||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'));
}
function eqSortRecipePicks(arr){
 return (arr||[]).slice().sort((a,b)=>eqRecipeGroupRank(a.recipe)-eqRecipeGroupRank(b.recipe)||eqRecipeOrderIndex(a.recipe)-eqRecipeOrderIndex(b.recipe)||String(a.recipe?.name||'').localeCompare(String(b.recipe?.name||''),'zh-Hant'));
}
function eqAddRecipe(id){
 const r=eqRecipeById(id); if(!r)return;
 eqState.recipeCounts=eqState.recipeCounts||{};
 if(!eqState.recipeCounts[String(id)]) eqState.recipeCounts[String(id)]=eqRecipeDefaultCount(r);
 eqResetRandom(false);
 eqRenderPreview(true);
}
function eqSimAddRecipe(id){
 const r=eqRecipeById(id); if(!r)return;
 eqState.simSelectedRecipes=eqState.simSelectedRecipes||{};
 eqState.simSelectedRecipes[String(id)]=true;
 renderEquipmentRandomPage(true);
}

function eqToggleRecipe(id){
 const r=eqRecipeById(id); if(!r)return;
 eqState.recipeCounts=eqState.recipeCounts||{};
 if(eqState.recipeCounts[String(id)]) delete eqState.recipeCounts[String(id)];
 else eqState.recipeCounts[String(id)]=eqRecipeDefaultCount(r);
 eqResetRandom();
 eqRenderPreview();
}
function eqSetRecipeCount(id,val){
 eqState.recipeCounts=eqState.recipeCounts||{};
 if(eqState.recipeCounts[String(id)]!==undefined){eqState.recipeCounts[String(id)]=Math.max(1,intOf(val,1)); eqResetRandom(); eqRenderPreview();}
}
function eqEffectAccumulator(){
 const acc={};
 for(const {recipe,count} of eqSelectedRecipes()){
  for(const e of recipe.effects||[]){
   const k=e.stat; if(!acc[k])acc[k]={stat:k,label:e.label||eqData().stat_labels?.[k]||k,min:0,max:0,value:0,unit:e.unit||'',hasRange:false,hasValue:false,stackable:e.stackable!==false, parts:[]};
   const mult=e.stackable===false?1:count;
   if(e.min!==undefined||e.max!==undefined){acc[k].hasRange=true; acc[k].min+=(Number(e.min)||0)*mult; acc[k].max+=(Number(e.max)||0)*mult; acc[k].parts.push(`${recipe.name} × ${count}：+${fmt((Number(e.min)||0)*mult)}${(Number(e.max)||0)!=(Number(e.min)||0)?'～'+fmt((Number(e.max)||0)*mult):''}`);}
   else {acc[k].hasValue=true; acc[k].value+=(Number(e.value)||0)*mult; acc[k].parts.push(`${recipe.name} × ${count}：${(Number(e.value)||0)>=0?'+':''}${fmt((Number(e.value)||0)*mult)}${e.unit||''}`);}
  }
 }
 return acc;
}
function eqBaseStatsWithRaw(eq){
 const base=Object.assign({},eq?.base_stats||{});
 const raw=eq?.raw_item||{};
 const add=(key,label,value)=>{if(value!==undefined&&value!==null&&value!==''&&base[key]===undefined)base[key]={label,value:Number(value)||0};};
 const addRange=(key,label,min,max)=>{if((min!==undefined||max!==undefined)&&base[key]===undefined)base[key]={label,min:Number(min)||0,max:Number(max??min)||0};};
 add('m_attack','術法攻擊',raw.MagicAttack);
 add('def','物理防禦',raw.ExtraDef);
 add('m_def','術法防禦',raw.MagicDef);
 add('ice_def','冰防',raw.IceDef);
 add('fire_def','火防',raw.FireDef);
 add('lightning_def','雷防',raw.LightningDef);
 add('dark_def','冥防',raw.DarkDef);
 add('paralysis_res','抗定身',raw.ParalysisRes);
 add('poison_res','抗毒',raw.PosionRes ?? raw.PoisonRes);
 add('blind_res','抗盲目',raw.BlindRes);
 add('silent_res','抗禁咒',raw.SilentRes);
 addRange('damage','傷害',raw.DamageMin,raw.DamageMax);
 add('level','等級',raw.Level);
 add('clevel','職等(CL)',raw.CLevel);
 return base;
}
function eqCLevelText(v){
 const n=Number(v);
 const map={0:'無',1:'一轉',2:'二轉',3:'三轉',4:'四轉',5:'五轉'};
 return map[n]||String(v||'');
}
function eqStatLabel(k,o,e){
 if(k==='m_attack')return '術法攻擊';
 if(k==='def')return '物理防禦';
 if(k==='m_def')return '術法防禦';
 if(k==='ice_def')return '冰防';
 if(k==='fire_def')return '火防';
 if(k==='lightning_def')return '雷防';
 if(k==='dark_def')return '冥防';
 if(k==='paralysis_res')return '抗定身';
 if(k==='poison_res')return '抗毒';
 if(k==='blind_res')return '抗盲目';
 if(k==='silent_res')return '抗禁咒';
 if(k==='level')return '等級';
 if(k==='clevel')return '職等(CL)';
 return o?.label||e?.label||eqData().stat_labels?.[k]||k;
}
function eqDisplayStatText(k,o){
 if(k==='clevel' && o)return eqCLevelText(o.value);
 return eqStatValueText(o)||'-';
}
function eqMetaLine(eq){
 const base=eqBaseStatsWithRaw(eq);
 const level=base.level?.value||eq?.raw_item?.Level||'';
 const clevel=base.clevel?.value??eq?.raw_item?.CLevel??'';
 const main=['等級 '+(level||'-'),'職等(CL) '+eqCLevelText(clevel)];
 const rest=['ID '+eq.item_id,eq.main_category,eq.series||eq.series_group,eq.display_type,(eq._stats_source||'內嵌備援')].filter(Boolean);
 return `<div class="eqTopMeta">${main.map(x=>`<span class="pill" style="font-size:14px;border-color:#60a5fa;color:#e0f2fe">${esc(x)}</span>`).join('')}${rest.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`;
}
function eqRenderStats(eq,includeEffects=true){
 const base=eqBaseStatsWithRaw(eq); const effMap=includeEffects?eqEffectAccumulator():{};
 const keys=eqUnique([...Object.keys(base),...Object.keys(effMap)]);
 const order=['level','clevel','con','str','int','dex','hp','mp','damage','m_attack','def','m_def','ice_def','fire_def','lightning_def','dark_def','fire_attack','ice_attack','lightning_attack','dark_attack','fire_prob','ice_prob','lightning_prob','dark_prob','paralysis_res','poison_res','blind_res','silent_res','attack','attack_range','durability','weight'];
 keys.sort((a,b)=>(order.indexOf(a)<0?999:order.indexOf(a))-(order.indexOf(b)<0?999:order.indexOf(b)) || String(a).localeCompare(String(b),'zh-Hant'));
 const left=keys.map(k=>{const o=base[k]; const label=eqStatLabel(k,o,null); return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${esc(eqDisplayStatText(k,o))}</div></div>`}).join('');
 if(!includeEffects){return `<div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">目前裝備能力</h2><div class="eqStatGrid">${left}</div></div>`;}
 const right=keys.map(k=>{
  const o=base[k]; const e=effMap[k]; const label=eqStatLabel(k,o,e);
  let baseText=eqDisplayStatText(k,o); let addText=''; let finalText=baseText;
  if(e){
   if(e.hasRange){const bm=eqStatNum(o,'min'), bx=eqStatNum(o,'max'); const am=e.min, ax=e.max; addText=`<div class="eqYellow">+${fmt(am)}${am!==ax?'～'+fmt(ax):''}${e.unit||''}</div>`; finalText=`${fmt(bm+am)}${(bx+ax)!==(bm+am)?'～'+fmt(bx+ax):''}`;}
   else {const av=e.value; addText=`<div class="eqYellow">${av>=0?'+':''}${fmt(av)}${e.unit||''}</div>`; finalText=e.stackable===false?`${baseText} / ${fmt(av)}${e.unit||''}`:fmt(eqStatNum(o,'min')+av);}
   if(e.parts.length)addText+=`<div class="rSub">${esc(e.parts.join('、'))}</div>`;
  }
  return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${esc(finalText)}${addText}</div></div>`;
 }).join('');
 return `<div class="eqPreviewGrid"><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">裝備能力</h2><div class="eqStatGrid">${left}</div></div><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">合成後能力</h2><div class="eqSmall">白字為原有能力，黃字為所有已勾選配方的累加值。</div><div class="eqStatGrid">${right}</div></div></div>`;
}
function eqToggleRecipe(id){
 const r=eqRecipeById(id); if(!r)return;
 eqState.recipeCounts=eqState.recipeCounts||{};
 if(eqState.recipeCounts[String(id)]) delete eqState.recipeCounts[String(id)];
 else eqState.recipeCounts[String(id)]=eqRecipeDefaultCount(r);
 eqResetRandom(false);
 eqRenderPreview(true);
}
function eqSetRecipeCount(id,val){
 eqState.recipeCounts=eqState.recipeCounts||{};
 if(eqState.recipeCounts[String(id)]!==undefined){
  eqState.recipeCounts[String(id)]=Math.max(1,intOf(val,1));
  eqResetRandom(false);
  eqRenderPreview(true);
 }
}
function eqRenderRecipeArea(){
 const eq=eqSelected(); if(!eq)return '<div class="empty">請先選擇裝備。</div>';
 const recipes=eqSortRecipeObjects(eqAllowedRecipes());
 const groups=[['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_50','安定值 50']];
 const groupRecipes=g=>recipes.filter(r=>g==='stable_50'?(r.group==='stable_50'||r.group==='stable_70'):r.group===g);
 const groupSelected=g=>eqSelectedRecipes().filter(x=>g==='stable_50'?(x.recipe.group==='stable_50'||x.recipe.group==='stable_70'):x.recipe.group===g);
 const renderSelected=g=>{
  const rows=groupSelected(g);
  if(!rows.length)return '<div class="muted" style="margin-top:8px">尚未加入這個安定值的配方。</div>';
  return `<div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>已選配方</th><th>次數</th><th>操作</th></tr></thead><tbody>${rows.map(({recipe,count})=>`<tr><td><b>${esc(recipe.name)}</b><div class="rSub">${esc(recipe.effect_summary||'')}</div></td><td style="width:120px"><input class="eqRecipeCount" data-eq-recipe-count="${esc(recipe.id)}" type="number" min="1" value="${esc(count)}"></td><td style="width:90px"><button class="ghost" data-eq-recipe="${esc(recipe.id)}">移除</button></td></tr>`).join('')}</tbody></table></div>`;
 };
 return `<h3 id="eqRecipeAnchor">選擇配方</h3><div class="notice">配方改為下拉式加入，可跨安定值累加；材料清單會依安定值 1 → 12 → 50 的順序列出。</div>
 ${groups.map(([g,label])=>{const arr=groupRecipes(g);return `<div class="card" style="box-shadow:none"><h3>${esc(label)}</h3><label>加入配方</label><select data-eq-recipe-select="${esc(g)}"><option value="">請選擇要加入的配方</option>${arr.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.effect_summary?'｜'+esc(r.effect_summary):''}</option>`).join('')}</select>${renderSelected(g)}</div>`}).join('')}
 <div class="quick"><button class="primary" id="eqOpenRandom">進入亂數模擬頁<small>進入後再選配方，像骰子一樣累計次數與材料</small></button><button class="primary" id="eqShowMaterials">產出所需材料清單<small>另開材料頁，並可返回</small></button></div>`;
}
function renderEquipmentCompoundPage(){
 window.v86LastView='item';
 byId('reader').innerHTML=`<section class="card"><h1>裝備合成模擬</h1><div class="muted">先篩選裝備，點選裝備後會進入合成模擬頁。</div>
 <div class="eqFilterGrid"><div><label>種類（武器 / 防具 / 仙器）</label><select id="eqMain"></select></div><div><label>系列</label><select id="eqSeries"></select></div><div><label>階級 / 等級</label><select id="eqTier"></select></div><div><label>類型 / 部位</label><select id="eqType"></select></div><div style="grid-column:1/-1"><label>搜尋裝備名稱 / ID</label><input id="eqQ" value="${esc(eqState.q||'')}" placeholder="例如：椒圖、宮殤、劍、300"></div></div>
 <h3>選擇裝備</h3><div class="results" id="eqList"></div></section>`;
 eqRefreshFilters(); eqRefreshList();
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}
function eqRefreshSelect(){}
function openEquipmentSim(uid){eqState.uid=uid||eqState.uid; eqResetRandom(false); eqRenderPreview();}
function eqRenderPreview(keepScroll=false){
 const y=window.scrollY||document.documentElement.scrollTop||0;
 const eq=eqSelected();
 if(!eq){renderEquipmentCompoundPage();return;}
 byId('reader').innerHTML=`<section class="card"><button class="backBtn" id="eqBackToList">← 返回裝備篩選</button><h1>裝備合成模擬</h1><h2>${esc(eq.name)}</h2>${eqMetaLine(eq)}${eqRenderStats(eq,true)}${eqRenderRecipeArea()}</section>`;
 closeDrawer();
 if(keepScroll)setTimeout(()=>window.scrollTo(0,y),0); else window.scrollTo({top:0,behavior:'smooth'});
}
function eqMaterials(recipe,count){const map={}; for(const st of recipe?.steps||[]){for(const m of st.materials||[]){const key=m.item_id||m.name; if(!map[key])map[key]={name:m.name||('ID '+m.item_id),item_id:m.item_id,qty:0}; map[key].qty+=(Number(m.qty)||0)*count;}} return Object.values(map);}
function eqAllMaterials(){const map={}; for(const {recipe,count} of eqSelectedRecipes()){for(const m of eqMaterials(recipe,count)){const key=m.item_id||m.name; if(!map[key])map[key]={name:m.name,item_id:m.item_id,qty:0}; map[key].qty+=m.qty;}} return Object.values(map);}
function showEquipmentMaterials(){
 const eq=eqSelected(), picks=eqSelectedRecipes(); if(!eq||!picks.length){empty('請先選擇裝備與至少一個配方');return}
 const sections=picks.map(({recipe,count})=>{const mats=eqMaterials(recipe,count); return `<h3>${esc(recipe.name)} × ${fmt(count)}</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${mats.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.qty)}</td></tr>`).join('')}</tbody></table></div>`;}).join('');
 byId('reader').innerHTML=`<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>所需材料清單</h1><div class="notice"><b>${esc(eq.name)}</b><br>材料依配方分開顯示，方便核對。</div>${sections}</section>`;
 window.scrollTo({top:0,behavior:'smooth'});
}
function eqResetRandom(clearSelection=true){eqState.simTotals={};eqState.simCount=0;eqState.simRecipeCounts={}; if(clearSelection)eqState.simSelectedRecipes={};}
function eqRollEffectValue(e){
 if(e.min!==undefined||e.max!==undefined){const min=Number(e.min)||0,max=Number(e.max)||min; return min+Math.floor(Math.random()*(max-min+1));}
 return Number(e.value)||0;
}
function eqSimToggleRecipe(id){eqState.simSelectedRecipes=eqState.simSelectedRecipes||{}; if(eqState.simSelectedRecipes[String(id)])delete eqState.simSelectedRecipes[String(id)]; else eqState.simSelectedRecipes[String(id)]=true; renderEquipmentRandomPage(true);}
function eqSimSelectedRecipes(){
 const allowed=new Set(eqAllowedRecipes().map(r=>String(r.id)));
 return Object.keys(eqState.simSelectedRecipes||{}).filter(id=>allowed.has(String(id))).map(id=>eqRecipeById(id)).filter(Boolean);
}
function eqRandomOnce(){
 if(!eqState.simTotals)eqState.simTotals={};
 if(!eqState.simRecipeCounts)eqState.simRecipeCounts={};
 const picks=eqSimSelectedRecipes(); if(!picks.length){alert('請先在亂數模擬頁勾選至少一個配方');return;}
 for(const recipe of picks){
  eqState.simRecipeCounts[String(recipe.id)]=(Number(eqState.simRecipeCounts[String(recipe.id)])||0)+1;
  for(const e of recipe.effects||[]){
   if(e.stackable===false)continue;
   const k=e.stat,label=e.label||eqData().stat_labels?.[k]||k;
   if(!eqState.simTotals[k])eqState.simTotals[k]={label,value:0};
   eqState.simTotals[k].value+=eqRollEffectValue(e);
  }
 }
 eqState.simCount++;
}
function eqRandomMaterialRows(){
 const counts=eqState.simRecipeCounts||{};
 const byRecipe=[];
 for(const [id,c] of Object.entries(counts)){
  const recipe=eqRecipeById(id); const count=Number(c)||0; if(!recipe||count<=0)continue;
  byRecipe.push({recipe,count,mats:eqMaterials(recipe,count)});
 }
 return byRecipe.sort((a,b)=>eqRecipeGroupRank(a.recipe)-eqRecipeGroupRank(b.recipe)||eqRecipeOrderIndex(a.recipe)-eqRecipeOrderIndex(b.recipe));
}
function eqRenderRandomRecipePicker(){
 const recipes=eqSortRecipeObjects(eqAllowedRecipes());
 const groups=[['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_50','安定值 50']];
 const groupRecipes=g=>recipes.filter(r=>g==='stable_50'?(r.group==='stable_50'||r.group==='stable_70'):r.group===g);
 const groupSelected=g=>eqSortRecipeObjects(eqSimSelectedRecipes()).filter(r=>g==='stable_50'?(r.group==='stable_50'||r.group==='stable_70'):r.group===g);
 const renderSelected=g=>{
  const rows=groupSelected(g);
  if(!rows.length)return '<div class="muted" style="margin-top:8px">尚未加入這個安定值的模擬配方。</div>';
  return `<div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>已選配方</th><th>已用次數</th><th>操作</th></tr></thead><tbody>${rows.map(recipe=>{const used=Number((eqState.simRecipeCounts||{})[String(recipe.id)])||0;return `<tr><td><b>${esc(recipe.name)}</b><div class="rSub">${esc(recipe.effect_summary||'')}</div></td><td>${fmt(used)}</td><td><button class="ghost" data-eq-sim-recipe="${esc(recipe.id)}">移除</button></td></tr>`}).join('')}</tbody></table></div>`;
 };
 return `<h3>選擇要模擬的配方</h3><div class="notice">這裡獨立選擇亂數模擬要用的配方，不需要先在上一頁勾好。每按一次「模擬一次」，目前加入的配方各計 1 次材料。</div>${groups.map(([g,label])=>{const arr=groupRecipes(g);return `<div class="card" style="box-shadow:none"><h3>${esc(label)}</h3><label>加入模擬配方</label><select data-eq-sim-recipe-select="${esc(g)}"><option value="">請選擇要加入的配方</option>${arr.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.effect_summary?'｜'+esc(r.effect_summary):''}</option>`).join('')}</select>${renderSelected(g)}</div>`}).join('')}`;
}
function renderEquipmentRandomPage(keepScroll=false){
 const y=window.scrollY||document.documentElement.scrollTop||0;
 const eq=eqSelected(); if(!eq){empty('請先選擇裝備');return;}
 const totals=eqState.simTotals||{};
 const rows=Object.entries(totals).map(([k,o])=>`<tr><td>${esc(o.label)}</td><td>+${fmt(o.value)}</td></tr>`).join('')||'<tr><td colspan="2">尚未模擬，請按「模擬一次」。</td></tr>';
 const usedRecipes=eqAllowedRecipes().filter(r=>Number((eqState.simRecipeCounts||{})[String(r.id)])>0);
 const usedRows=usedRecipes.map(recipe=>{const used=Number((eqState.simRecipeCounts||{})[String(recipe.id)])||0;return `<tr><td>${esc(recipe.name)}</td><td>${fmt(used)}</td></tr>`;}).join('')||'<tr><td colspan="2">尚未使用任何配方。</td></tr>';
 const materialSections=eqRandomMaterialRows().map(({recipe,count,mats})=>`<h3>${esc(recipe.name)} × ${fmt(count)}</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${mats.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.qty)}</td></tr>`).join('')}</tbody></table></div>`).join('')||'<div class="empty">尚未模擬，材料數量為 0。</div>';
 byId('reader').innerHTML=`<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>合成亂數模擬</h1><h2>${esc(eq.name)}</h2>${eqMetaLine(eq)}${eqRenderStats(eq,false)}${eqRenderRandomRecipePicker()}<div class="quick"><button type="button" class="primary" id="eqSimOnce">模擬一次<small>隨機產生本次合成增加值，並依配方累計材料</small></button><button type="button" id="eqSimClear" class="ghost">清空重新計算<small>歸零累計次數、能力與材料，保留目前勾選配方</small></button></div><div class="kvGrid"><div class="kv"><div class="k">累計模擬次數</div><div class="v">${fmt(eqState.simCount||0)}</div></div></div><h3>配方使用次數</h3><div class="tableWrap"><table><thead><tr><th>配方</th><th>已用次數</th></tr></thead><tbody>${usedRows}</tbody></table></div><h3>累計結果</h3><div class="tableWrap"><table><thead><tr><th>能力</th><th>累計增加</th></tr></thead><tbody>${rows}</tbody></table></div><h3>依模擬次數累計材料</h3>${materialSections}</section>`;
 if(keepScroll)setTimeout(()=>window.scrollTo(0,y),0); else window.scrollTo({top:0,behavior:'smooth'});
}


function trainingGroupRank(g){
 const order=(TRAINING_DATA&&TRAINING_DATA.groupOrder)||[];
 const idx=order.indexOf(g||'');
 return idx>=0?idx:999;
}
function trainingElementRank(text){
 const s=String(text||'');
 const order=['玄武','體宇','體魄','白虎','力宇','力量','青龍','智宇','智慧','朱雀','敏宇','靈敏','麒麟','血宇','生命','騰蛇','精宇','精力','梅冠','菱冠','心冠','桃冠','同花'];
 const idx=order.findIndex(k=>s.includes(k));
 return idx>=0?idx:999;
}
function trainingDisplayName(name){
 return String(name||'').replace(/五鑽連貫心元/g,'五鑽連貫心');
}
function trainingFilterGroups(value){
 if(value==='group_diamond')return ['聖鑽','同花大聖鑽','五鑽連貫心'];
 if(value==='group_ether')return ['以太核','六宇聚變核'];
 return value?[value]:[];
}
function trainingGroupLabel(g){
 if(g==='group_diamond')return '聖鑽(聖鑽、同花大聖鑽、五鑽連貫心)';
 if(g==='group_ether')return '以太核(以太核、六宇聚變核)';
 return g||'全部分類';
}
function trainingViewGroupValue(g){
 if(['聖鑽','同花大聖鑽','五鑽連貫心'].includes(g))return 'group_diamond';
 if(['以太核','六宇聚變核'].includes(g))return 'group_ether';
 return g||'';
}
function sortedTrainingData(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 return data.map((x,i)=>({x,i})).sort((a,b)=>{
  const ga=trainingGroupRank(a.x.group), gb=trainingGroupRank(b.x.group);
  if(ga!==gb)return ga-gb;
  const ea=trainingElementRank((a.x.item||'')+trainingDisplayName(a.x.name)+(a.x.stat||''));
  const eb=trainingElementRank((b.x.item||'')+trainingDisplayName(b.x.name)+(b.x.stat||''));
  if(ea!==eb)return ea-eb;
  return trainingDisplayName(a.x.name).localeCompare(trainingDisplayName(b.x.name),'zh-Hant');
 });
}
function materialRank(item){
 const s=String(item||'');
 let group=99;
 if(s.includes('四聖諦'))group=0;
 else if(s.includes('天照'))group=1;
 else if(s.includes('靈丹'))group=2;
 else if(s.includes('賢者之石'))group=3;
 else if(s.includes('真元'))group=4;
 else if(s.includes('聖鑽'))group=5;
 else if(s.includes('以太核'))group=6;
 else if(s.includes('六宇'))group=7;
 return [group,trainingElementRank(s),s];
}
function sortMaterialEntries(entries){
 return entries.sort((a,b)=>{
  const ra=materialRank(a[0]), rb=materialRank(b[0]);
  if(ra[0]!==rb[0])return ra[0]-rb[0];
  if(ra[1]!==rb[1])return ra[1]-rb[1];
  return ra[2].localeCompare(rb[2],'zh-Hant');
 });
}
function appendTrainingNote(x){
 if((x.group||'')==='五鑽連貫心'){
  return '不需要手動選階、請找『王都盧索』安全區「冥司印曷闐」啟用';
 }
 let note=x.note||'';
 note=note.replace(/六宇聚變核原始表第28階[^。]*。?/g,'').trim();
 note=note.replace(/原始表第28階看起來寫成 \+272；此版按前後規律修正為 \+372/g,'').trim();
 return note;
}
function renderTrainingCalc(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 const groupOptions=['四聖諦','天照珠玉','靈丹','聖靈煉金','真元','group_diamond','group_ether'];
 const groupOpts='<option value="">全部分類</option>'+groupOptions.map(g=>`<option value="${esc(g)}">${esc(trainingGroupLabel(g))}</option>`).join('');
 function card(pair){
  const x=pair.x, i=pair.i;
  const displayName=trainingDisplayName(x.name||'');
  const viewGroup=trainingViewGroupValue(x.group||'');
  const max=Number(x.maxLevel||0);
  const cur=Math.min(max,Math.max(0,Number(x.defaultCurrentLevel||0)));
  const tar=Math.min(max,Math.max(cur,Number(x.defaultTargetLevel||max)));
  const sub=x.subGroup?`｜${x.subGroup}`:'';
  const fullNeed=(x.costs||[]).reduce((a,b)=>a+Number(b||0),0);
  const defaultNeed=(x.costs||[]).slice(cur,tar).reduce((a,b)=>a+Number(b||0),0);
  const note=appendTrainingNote(x);
  const derived=x.inputMode==='derived';
  return `<div class="trainCard" data-train-row="${i}" data-group="${esc(viewGroup)}">
    <div class="trainCardHead"><div><div class="trainName">${esc(displayName)}</div><div class="trainSub">${esc((x.group||'')+sub)}｜${esc(trainingDisplayName(x.stat||''))}</div></div><div class="trainBadge">滿階 ${max}</div></div>
    <div class="trainNeedBox"><b>需求數量：</b>${esc(x.item||'')} × <span class="trainNeed" data-i="${i}">${fmt(defaultNeed)}</span><div class="rSub">0 → 滿階：${fmt(fullNeed)}</div></div>
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
  <div class="kv"><div class="k">快速設定</div><div class="v"><div class="quick" style="margin-top:0"><button id="trainAllMax">全部 0 → 滿階<small>把目前階設 0、目標階設最大</small></button><button id="trainClear">目前階 = 目標階<small>只保留目前設定，不計算提升</small></button></div></div></div>
 </div>
 <h3>修練項目</h3>
 <div class="trainingList">${sortedTrainingData().map(card).join('')}</div>
 <div class="quick"><button id="calcTraining">計算修練<small>只統計目前分類篩選內的項目</small></button></div>
 <div id="trainingResultWrap" style="display:none"><div id="trainingResult"></div></div>
 </section>`;
 applyTrainingDerivedLevels();
 updateTrainingNeeds();
 closeDrawer();
 window.scrollTo({top:0,behavior:'smooth'});
}
function filterTrainingRows(){
 const g=byId('trainGroupFilter')?.value||'';
 document.querySelectorAll('[data-train-row]').forEach(el=>{el.style.display=(!g||el.dataset.group===g)?'':'none';});
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='none';
}
function applyTrainingDerivedLevels(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
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
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
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
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  const needEl=document.querySelector(`.trainNeed[data-i="${i}"]`);
  if(!curEl||!tarEl||!needEl)return;
  let cur=Math.max(0,Math.min(max,intOf(curEl.value,0)));
  let tar=Math.max(cur,Math.min(max,intOf(tarEl.value,max)));
  let need=0;
  for(let lv=cur;lv<tar;lv++)need+=Number((x.costs||[])[lv]||0);
  needEl.textContent=fmt(need);
 });
}
function setTrainingAllMax(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const max=Number(x.maxLevel||0);
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(curEl)curEl.value=0;
  if(tarEl)tarEl.value=max;
 });
 updateTrainingNeeds();
}
function clearTrainingTargets(){
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 data.forEach((x,i)=>{
  if(x.inputMode==='derived')return;
  const curEl=document.querySelector(`.trainCur[data-i="${i}"]`);
  const tarEl=document.querySelector(`.trainTar[data-i="${i}"]`);
  if(curEl&&tarEl)tarEl.value=curEl.value;
 });
 updateTrainingNeeds();
}
function calcTraining(){
 window.v86LastView='jiang';
 clampTrainingInputs();
 const selectedGroup=byId('trainGroupFilter')?.value||'';
 const selectedGroups=trainingFilterGroups(selectedGroup);
 const data=(TRAINING_DATA&&TRAINING_DATA.data)||[];
 const effectOrder=(TRAINING_DATA&&TRAINING_DATA.effectStatOrder)||['體魄','力量','智慧','靈敏','生命','精力','自由分配能力值'];
 const costByItem={};
 const gainByStat=Object.fromEntries(effectOrder.map(s=>[s,0]));
 const detail=[];
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
  let cost=0;
  for(let lv=cur;lv<tar;lv++)cost+=Number((x.costs||[])[lv]||0);
  if(cost && !x.excludeFromItemSummary){costByItem[x.item||'未命名材料']=(costByItem[x.item||'未命名材料']||0)+cost;}
  const curEff=(x.effectsByLevel||[])[cur]||{};
  const tarEff=(x.effectsByLevel||[])[tar]||{};
  const gains={};
  const keys=new Set([...Object.keys(curEff),...Object.keys(tarEff),...(x.effectStats||[])]);
  keys.forEach(k=>{
   const v=Number(tarEff[k]||0)-Number(curEff[k]||0);
   if(v){gains[k]=v; gainByStat[k]=(gainByStat[k]||0)+v;}
  });
  detail.push({name:trainingDisplayName(x.name||''), group:x.group||'', subGroup:x.subGroup||'', item:x.item||'', cur, tar, cost, gains, note:appendTrainingNote(x), noCost:!!x.excludeFromItemSummary});
 }
 const costRows=sortMaterialEntries(Object.entries(costByItem)).map(([item,n])=>`<tr><td>${esc(item)}</td><td>${fmt(n)}</td></tr>`).join('');
 const allStats=[...effectOrder,...Object.keys(gainByStat).filter(s=>!effectOrder.includes(s))];
 const gainRows=allStats.filter(s=>gainByStat[s]).map(s=>`<tr><td>${esc(trainingDisplayName(s))}</td><td>+${fmt(gainByStat[s])}</td></tr>`).join('');
 const detailRows=detail.sort((a,b)=>{
  const ga=trainingGroupRank(a.group),gb=trainingGroupRank(b.group); if(ga!==gb)return ga-gb;
  const ea=trainingElementRank(a.item+a.name),eb=trainingElementRank(b.item+b.name); if(ea!==eb)return ea-eb;
  return a.name.localeCompare(b.name,'zh-Hant');
 }).map(d=>{
  const gainText=Object.entries(d.gains).map(([k,v])=>`${trainingDisplayName(k)}+${fmt(v)}`).join('、')||'-';
  const sub=d.subGroup?`｜${d.subGroup}`:'';
  const materialText=d.noCost?'無消耗':`${d.item} × ${fmt(d.cost)}`;
  return `<tr><td><b>${esc(d.name)}</b><div class="rSub">${esc(d.group+sub)}</div>${d.note?`<div class="rSub">${esc(d.note)}</div>`:''}</td><td>${d.cur} → ${d.tar}</td><td>${esc(materialText)}</td><td>${esc(gainText)}</td></tr>`;
 }).join('');
 const title=selectedGroup?`計算結果：${esc(trainingGroupLabel(selectedGroup))}`:'計算結果';
 byId('trainingResult').innerHTML=`<h3>${title}</h3>
 ${detail.length?'': '<div class="empty">目前沒有任何提升項目，請把目標階調高後再計算。</div>'}
 ${costRows?`<h3>材料統計</h3><div class="tableWrap"><table><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${costRows}</tbody></table></div>`:''}
 ${gainRows?`<h3>增加能力</h3><div class="tableWrap"><table><thead><tr><th>能力</th><th>增加值</th></tr></thead><tbody>${gainRows}</tbody></table></div>`:''}
 ${detailRows?`<h3>明細</h3><div class="tableWrap"><table><thead><tr><th>項目</th><th>階數</th><th>材料</th><th>增加能力</th></tr></thead><tbody>${detailRows}</tbody></table></div>`:''}`;
 const wrap=byId('trainingResultWrap'); if(wrap)wrap.style.display='block';
 byId('trainingResult').scrollIntoView({behavior:'smooth',block:'start'});
}


function goBackToPrevious(){
 const v=window.v86LastView||currentView||'home';
 if(v==='item')setView('item');
 else if(v==='reverse')setView('reverse');
 else if(v==='monster')setView('monster');
 else if(v==='jiang')setView('jiang');
 else setView('home');
}
window.addEventListener('popstate',()=>goBackToPrevious());


function backLabelFor(view){
 if(view==='monster')return '返回怪物查詢';
 if(view==='item')return '返回道具查詢';
 if(view==='reverse')return '返回掉落反查';
 if(view==='jiang')return '返回降神、經驗、修練試算';
 return '返回首頁';
}
function backButtonHTML(view){
 return `<button class="backBtn" onclick="goBackToPrevious('${view||''}')">← ${esc(backLabelFor(view||window.v86LastView||currentView))}</button>`;
}

function initEvents(){
 byId('openMenuBtn').onclick=openDrawer;byId('closeMenuBtn').onclick=closeDrawer;byId('backdrop').onclick=closeDrawer;
 document.addEventListener('change',e=>{if(e.target.classList&&e.target.classList.contains('jsSupportName'))updateSupportOptions(); if(e.target.classList&&(e.target.classList.contains('trainCur')||e.target.classList.contains('trainTar'))){clampTrainingInputs(); updateTrainingNeeds();}});
 document.addEventListener('click',e=>{const v=e.target.closest('[data-view]')?.dataset.view;if(v){if(v==='jiang')openJiangMenuOnly();else setView(v);}const o=e.target.closest('[data-open]')?.dataset.open;if(o){setView(o);if(window.innerWidth<980)openDrawer()}const jo=e.target.closest('[data-jiang-open]')?.dataset.jiangOpen;if(jo){setJiang(jo)}const io=e.target.closest('[data-item-open]')?.dataset.itemOpen;if(io){setItemSub(io)}const jk=e.target.closest('[data-jiang]')?.dataset.jiang;if(jk)setJiang(jk);const mid=e.target.closest('[data-monster]')?.dataset.monster;if(mid){e.preventDefault();e.stopPropagation();showMonster(mid);return;}const iid=e.target.closest('[data-item]')?.dataset.item;if(iid)showItem(iid);const rid=e.target.closest('[data-rev]')?.dataset.rev;if(rid)showReverse(rid);const rr=e.target.closest('[data-reverse-item]')?.dataset.reverseItem;if(rr)showReverse(rr);const equid=e.target.closest('[data-eq-uid]')?.dataset.eqUid;if(equid){openEquipmentSim(equid);}const eg=e.target.closest('[data-eq-group]')?.dataset.eqGroup;if(eg){eqRenderPreview();}const er=e.target.closest('[data-eq-recipe]')?.dataset.eqRecipe;if(er){eqToggleRecipe(er);}const esr=e.target.closest('[data-eq-sim-recipe]')?.dataset.eqSimRecipe;if(esr){eqSimToggleRecipe(esr);}if(e.target.classList&&e.target.classList.contains('jsSupportName'))updateSupportOptions();if(e.target.id==='calcSupport')calcSupport();if(e.target.id==='calcCompare')calcCompare();if(e.target.id==='calcStars')calcStars();if(e.target.id==='calcNeeds')calcNeeds();if(e.target.id==='calcStarAura')calcStarAura();if(e.target.id==='calcExpNeed')calcExpNeed();if(e.target.id==='calcEatPill')calcEatPill();if(e.target.id==='calcTraining')calcTraining();if(e.target.id==='eqShowMaterials')showEquipmentMaterials();if(e.target.id==='eqBackToSim')eqRenderPreview();if(e.target.id==='eqBackToList')renderEquipmentCompoundPage();if(e.target.id==='eqOpenRandom')renderEquipmentRandomPage();if(e.target.id==='eqSimOnce'){eqRandomOnce();renderEquipmentRandomPage();}if(e.target.id==='eqSimClear'){const keep=Object.assign({},eqState.simSelectedRecipes||{});eqResetRandom(false);eqState.simSelectedRecipes=keep;renderEquipmentRandomPage(true);}if(e.target.id==='trainAllMax')setTrainingAllMax();if(e.target.id==='trainClear')clearTrainingTargets();const et=e.target.closest('[data-exp-tab]');if(et){document.querySelectorAll('.calcTab').forEach(b=>b.classList.remove('active'));et.classList.add('active');byId('expTabNeed').style.display=et.dataset.expTab==='need'?'block':'none';byId('expTabEat').style.display=et.dataset.expTab==='eat'?'block':'none';}});
 ['monsterQ','monsterMin','monsterMax'].forEach(id=>{const el=byId(id); if(el)el.addEventListener('input',searchMonsters);});
 
 
 document.addEventListener('input',e=>{if(e.target.classList&&(e.target.classList.contains('trainCur')||e.target.classList.contains('trainTar'))){updateTrainingNeeds();} if(e.target.id==='eqQ'){eqState.q=e.target.value;eqRefreshList();} if(e.target.classList&&e.target.classList.contains('eqRecipeCount')){eqSetRecipeCount(e.target.dataset.eqRecipeCount,e.target.value);}
 if(['monsterQMain','monsterMinMain','monsterMaxMain','monsterRaceMain','monsterSubtypeMain'].includes(e.target.id))searchMonstersMain();if(['itemQ','itemMin','itemMax'].includes(e.target.id))searchItems();if(e.target.id==='reverseQ')searchReverseItems();});
 document.addEventListener('change',e=>{if(e.target.id==='itemType')searchItems();if(e.target.id==='trainGroupFilter')filterTrainingRows();if(['eqMain','eqSeries','eqTier','eqType'].includes(e.target.id)){eqState[e.target.id.replace('eq','').toLowerCase()]=e.target.value; if(e.target.id==='eqMain'){eqState.series='';eqState.tier='';eqState.type='';} if(e.target.id==='eqSeries'){eqState.tier='';eqState.type='';} if(e.target.id==='eqTier'){eqState.type='';} eqState.uid='';eqState.recipeId='';renderEquipmentCompoundPage();} if(e.target.id==='eqSelect'){openEquipmentSim(e.target.value);} if(e.target.matches('[data-eq-recipe-select]')&&e.target.value){eqAddRecipe(e.target.value);} if(e.target.matches('[data-eq-sim-recipe-select]')&&e.target.value){eqSimAddRecipe(e.target.value);}});
 document.addEventListener('click',e=>{const tab=e.target.closest('[data-item-tab]')?.dataset.itemTab;if(tab){renderItemPage(tab);}});
 byId('manualFiles').addEventListener('change',async e=>{alert('v86 先以自動讀取為主，手動載入下一版再補。')});
}
function initAuth(){ if(!AUTH_REQUIRED)return true; try{const key=localStorage.getItem('combined_manual_tool_license_key'); if(key&&typeof validateLicenseKey==='function'){validateLicenseKey(key);return true}}catch(e){} byId('mainShell').style.display='none';byId('licenseModal').style.display='flex';return false}
function init(){initEvents();renderHome(); const ok=initAuth(); if(ok)loadAllData();}
// V212: init 交給 js/script-loader.js 在所有模組/patch 載入完成後呼叫，避免 patch 還沒掛上就先初始化。
window.SZOAppInit = init;

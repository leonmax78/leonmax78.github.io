// V202b item.js
// Safe item module copy.
// Important: app-core.js still keeps original item functions in this version.
// This file is a staged module copy for future extraction, so reverse/compound remain stable.

// V101 fix: ITEM_TYPE_MAP is provided by app-core.js; avoid redeclaring global const.
// V101 fix: ITEM_DETAIL_RENAME is provided by app-core.js; avoid redeclaring global const.
// V101 fix: ITEM_DETAIL_ORDER is provided by app-core.js; avoid redeclaring global const.
function itemTypeName(t){return ITEM_TYPE_MAP[String(t||'').trim()]||''}

function itemKind(it){
 const candidates=[it.Kind,it.kind,it.RaceKind,it.Race,it.TargetRace,it.TargetKind].filter(v=>v!==undefined&&String(v).trim()!=='');
 for(const v of candidates){
  const h=normHex(v);
  if(h&&h!=='0x00000000'){
    const n=raceName(h);
    if(n)return n;
  }
 }
 return '';
}

function itemStatus(it){
 const raw=String(it?.ExtraStatus||'').trim();
 if(!raw || raw==='0')return '';
 const parts=raw.split(/[,\s;]+/).filter(Boolean);
 const names=parts
   .map(x=>{
     const n=statusName(x)||magicName(x);
     if(n)return n;
     // 舊版會在無法轉名時顯示 StatusID，但只限數字或 0x 代碼。
     if(/^\d+$/.test(String(x))||/^0x/i.test(String(x)))return `StatusID:${x}`;
     return '';
   })
   .filter(Boolean);
 return [...new Set(names)].join('、');
}

function itemDetailRows(it){
 const rows=[];
 for(const k of ITEM_DETAIL_ORDER){
  if(k==='Damage'){
   if(it.DamageMin||it.DamageMax)rows.push(['傷害',`${it.DamageMin||''}~${it.DamageMax||''}`]);
   continue;
  }
  if(k==='Type'){
   const typeName=itemTypeName(it.Type)||it.Type;
   if(typeName)rows.push(['類型',typeName]);
   continue;
  }
  if(k==='Kind'){
   const kindName=itemKind(it);
   if(kindName)rows.push(['專剋',kindName]);
   continue;
  }
  if(k==='ExtraStatus'){
   const statusName=itemStatus(it);
   if(statusName)rows.push(['特殊能力',statusName]);
   continue;
  }
  if(k in it && String(it[k]??'').trim()!=='')rows.push([ITEM_DETAIL_RENAME[k]||k,it[k]]);
 }
 if(it.Help)rows.push(['說明',it.Help]);
 return rows;
}

function itemAbilityFields(it){
 const abilityKeys=new Set(['CLevel','HP','MP','Con','Str','Int','Dex','ExtraDef','Damage','MagicAttack','MagicDef','IceDef','FireDef','LightningDef','DarkDef','ParalysisRes','PosionRes','BlindRes','SilentRes','Value']);
 return itemDetailRows(it).filter(([label])=>{
   const reverse=Object.entries(ITEM_DETAIL_RENAME).find(([,v])=>v===label)?.[0];
   if(label==='傷害')return true;
   return abilityKeys.has(reverse||label);
 });
}

function itemSearchText(it){return `${nameOf(it)} ${it.ID||''} ${it.Level||''} ${it.Type||''} ${itemTypeName(it.Type)} ${it.Help||''}`.toLowerCase()}

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

function showItem(id){
 window.v86LastView='item';
 history.pushState({app:'detail',view:'item'},'','#item-'+id);
 const it=itemIndex[String(id).trim()]; if(!it)return;
 const allRows=itemDetailRows(it);
 const dataLabels=new Set(['ID','名稱','等級','職等','類型','專剋','特殊能力','說明']);
 const dataRows=allRows.filter(([k])=>dataLabels.has(k));
 const abilityRows=allRows.filter(([k])=>!dataLabels.has(k));
 const showRows=rows=>rows.filter(x=>x[1]!==''&&x[1]!==undefined&&x[1]!==null&&String(x[1]).trim()!=='0');
 const kvHtml=(rows,cls='')=>`<div class="kvGrid ${cls}">${showRows(rows).map(([k,v])=>`<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`;
 const data=showRows(dataRows), abilities=showRows(abilityRows);
 byId('reader').innerHTML=`<section class="card monsterCompact itemCompact"><button class="backBtn" type="button" onclick="goBackToPrevious()">← 返回查詢</button><h1>${esc(nameOf(it))}</h1><div class="monsterGrid"><div class="monsterPanel"><h3>道具資料</h3>${kvHtml(data,'itemDataGrid')}</div>${abilities.length?`<div class="monsterPanel"><h3>道具能力</h3>${kvHtml(abilityRows,'itemAbilityGrid')}</div>`:''}</div><div class="quick"><button type="button" data-reverse-item="${esc(it.ID)}">反查哪些怪物掉落這個道具<small>查看怪物與掉落機率</small></button></div></section>`;
 closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}

// V202b does not override current app behavior.
// It only exposes a namespace for future migration.
window.SZO_ITEM_MODULE = {
  itemTypeName: (typeof itemTypeName==='function'?itemTypeName:null),
  itemKind: (typeof itemKind==='function'?itemKind:null),
  itemStatus: (typeof itemStatus==='function'?itemStatus:null),
  itemDetailRows: (typeof itemDetailRows==='function'?itemDetailRows:null),
  itemAbilityFields: (typeof itemAbilityFields==='function'?itemAbilityFields:null),
  itemSearchText: (typeof itemSearchText==='function'?itemSearchText:null),
  renderItemPage: (typeof renderItemPage==='function'?renderItemPage:null),
  openItemMenuOnly: (typeof openItemMenuOnly==='function'?openItemMenuOnly:null),
  setItemSub: (typeof setItemSub==='function'?setItemSub:null),
  searchItems: (typeof searchItems==='function'?searchItems:null),
  showItem: (typeof showItem==='function'?showItem:null)
};


// V210 active item exports
try{
  if(typeof itemTypeName==='function')window.itemTypeName=itemTypeName;
  if(typeof itemKind==='function')window.itemKind=itemKind;
  if(typeof itemStatus==='function')window.itemStatus=itemStatus;
  if(typeof itemDetailRows==='function')window.itemDetailRows=itemDetailRows;
  if(typeof itemAbilityFields==='function')window.itemAbilityFields=itemAbilityFields;
  if(typeof itemSearchText==='function')window.itemSearchText=itemSearchText;
  if(typeof showItem==='function')window.showItem=showItem;
}catch(e){console.warn('V210 item active export failed',e);}


// V210a itemSearchText fallback
try{
  if(typeof itemSearchText==='function'){
    window.itemSearchText = itemSearchText;
  }else{
    window.itemSearchText = function(it){
      return String(
        (it?.Name||'')+' '+
        (it?.ID||'')+' '+
        (it?.Level||'')+' '+
        (it?.Type||'')
      ).toLowerCase();
    };
  }
}catch(e){console.warn('V210a itemSearchText fallback failed',e);}

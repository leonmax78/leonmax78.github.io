(function(){
 const shapes=['','圓弧','三角','四方','五稜','六緯'];
 const stats={Base_HP:'生命',Base_MP:'法力',Base_Con:'體魄',Base_Str:'力量',Base_Int:'智慧',Base_Dex:'敏捷',Extra_Def:'防禦',Magic_Att:'術攻',Magic_Def:'術防'};
 const key='szo-gem-calculator-v1';
 let state={level:5000,picks:{}},tab='calc';
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&typeof saved.picks==='object'&&saved.picks)state={level:Number(saved.level)||0,picks:saved.picks};}catch(e){}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}};
 const detail=g=>Object.entries(stats).filter(([k])=>Number(g[k])).map(([k,n])=>n+' +'+Number(g[k]).toLocaleString()).join('、');
 window.SZO_GEM_TOTAL=function(level,picks){
  const data=window.SZO_JEWELS,total=Object.fromEntries(Object.keys(stats).map(k=>[k,0]));let equipped=0;
  const slots=data.slots.filter(s=>Number(s.NeedLv)<=level);
  for(const slot of slots){const gem=data.gems[picks[slot.ID]];if(!gem||Number(gem.Grade)>6||String(gem.Shape)!==String(slot.Shape))continue;equipped++;for(const k in stats)total[k]+=Number(gem[k])||0;}
  return {slots:slots.length,equipped,total};
 };
 window.renderGemPage=function(){
  const data=window.SZO_JEWELS,exchange=window.SZO_ABYSS_EXCHANGES;
  const name=id=>exchange.names[id]||id;
  const options=shape=>'<option value="">未鑲嵌</option>'+[1,2,3,4,5,6].map(grade=>`<optgroup label="品級 ${grade}">${Object.values(data.gems).filter(g=>Number(g.Shape)===shape&&Number(g.Grade)===grade).map(g=>`<option value="${g.ID}">${esc(name(g.ID))} · ${esc(detail(g))}</option>`).join('')}</optgroup>`).join('');
  byId('reader').innerHTML=`<section id="gemPage"><style>
  #gemPage .gemTabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}#gemPage .gemTabs button[aria-selected=true]{background:#137b77;color:white}
  #gemPage .gemSlots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}#gemPage .gemSlot{min-width:0;padding:12px;border:1px solid var(--border,#354557);border-radius:8px}#gemPage select,#gemPage input{max-width:100%;width:100%;min-width:0}#gemPage .gemShape{padding:18px 0;border-top:1px solid var(--border,#354557)}#gemPage .gemShape h2{font-size:18px}#gemPage .gemTotals{display:flex;flex-wrap:wrap;gap:12px 24px;padding:16px 0}#gemPage .gemBatch{display:flex;gap:8px;max-width:620px;margin:12px 0}#gemPage .gemBatch button{flex-shrink:0}#gemPage .gemFilters{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin:16px 0}#gemPage .gemRecipe{padding:16px 0;border-bottom:1px solid var(--border,#354557);overflow-wrap:anywhere}#gemPage .gemRecipe h3{font-size:16px}#gemPage .gemSlot small{display:block;margin-top:8px}#gemPage .gemSlot:has(select:disabled){opacity:.55}
  #gemPage button{font:inherit;color:var(--text,#dce7f5);background:#102a36;border:1px solid #357b83;border-radius:6px;padding:9px 12px;cursor:pointer;max-width:100%;white-space:normal;overflow-wrap:anywhere}#gemPage button:hover{background:#194756}#gemPage button:focus-visible{outline:2px solid #53ded3;outline-offset:2px}#gemPage .gemRecipe button{padding:4px 8px}#gemPage h1{font-size:22px}#gemPage .gemRecipe p{line-height:2}
  </style><h1>寶石試算、加工配方</h1><div class="gemTabs" role="tablist"><button role="tab" data-gem-tab="calc" aria-selected="${tab==='calc'}">寶石試算</button><button role="tab" data-gem-tab="recipes" aria-selected="${tab==='recipes'}">加工配方、寶石粉來源</button></div><div id="gemContent"></div></section>`;
  byId('gemPage').querySelectorAll('[data-gem-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.gemTab;renderGemPage();});
  const content=byId('gemContent');
  if(tab==='recipes'){
   const rows=exchange.rows.filter(r=>r.group===220||(r.group>=221&&r.group<=226)||(r.group>=231&&r.group<=233));
   const link=p=>`<button type="button" data-item="${esc(p.id)}">${esc(name(p.id))}</button> × ${p.count.toLocaleString()}`;
   content.innerHTML=`<h2>敖姬加工</h2><p>京城、璇鶯鎮、龍川府</p><h3>寶石粉來源</h3><p>粗糙寶石粉：品級 1、2 寶石磨碎。尋常寶石粉：品級 3、4 寶石磨碎。細緻寶石粉：品級 5、6 寶石磨碎。</p><div class="gemTabs">${['32801','32802','32803'].map(id=>`<button data-powder="${id}">${esc(name(id))}</button>`).join('')}</div><div class="gemFilters"><label>工序<select id="gemProcess"><option value="all">全部工序</option><option value="grind">磨碎</option><option value="recreate">再造</option><option value="refine">精製</option></select></label><label>材料／產物搜尋<input id="gemRecipeSearch" type="search"></label><label>加工次數<input id="gemRecipeCount" type="number" min="1" max="99999" value="1"></label></div><p id="gemRecipeMatch"></p><div id="gemRecipeRows"></div>`;
   const refresh=()=>{
    const q=byId('gemRecipeSearch').value.trim().replace(/普通寶石粉/g,'尋常寶石粉'),process=byId('gemProcess').value,count=Math.max(1,Math.min(99999,Math.floor(Number(byId('gemRecipeCount').value)||1)));
    const selected=rows.filter(r=>(process==='all'||(process==='grind'&&r.group>=221&&r.group<=226)||(process==='recreate'&&r.group===220)||(process==='refine'&&r.group>=231))&&(!q||[r.name,...r.materials.map(p=>name(p.id)),...r.rewards.map(p=>name(p.id))].join(' ').includes(q)));
    byId('gemRecipeMatch').textContent=selected.length+' 種配方';
    byId('gemRecipeRows').innerHTML=selected.map(r=>`<article class="gemRecipe"><h3>${r.group===220?'再造':r.group>=231?'精製':'磨碎'} · ${esc(r.name)}</h3><p>材料：${r.materials.map(p=>link({...p,count:p.count*count})).join('、')}</p><p>產物：${r.rewards.map(p=>link({...p,count:p.count*count})).join('、')}</p></article>`).join('')||'<p>沒有符合的配方。</p>';
   };
   ['gemProcess','gemRecipeSearch','gemRecipeCount'].forEach(id=>byId(id).addEventListener('input',refresh));
   content.querySelectorAll('[data-powder]').forEach(b=>b.onclick=()=>{byId('gemRecipeSearch').value=name(b.dataset.powder);byId('gemProcess').value='grind';refresh();});refresh();return;
  }
  state.level=Math.max(0,Math.min(20000,Math.floor(Number(state.level)||0)));
  content.innerHTML=`<label>降神總等級<input id="gemLevel" type="number" min="0" max="20000" value="${state.level}" style="max-width:240px"></label><p id="gemOpened" aria-live="polite"></p><div id="gemTotal" class="gemTotals" aria-live="polite"></div><button id="gemClear" type="button">清空寶石</button>${[1,2,3,4,5].map(shape=>`<section class="gemShape"><h2>${shapes[shape]}</h2><div class="gemBatch"><select aria-label="${shapes[shape]}批次寶石" id="gemBatch${shape}">${options(shape)}</select><button data-fill-shape="${shape}" type="button">套用已開孔</button></div><div class="gemSlots">${data.slots.filter(s=>Number(s.Shape)===shape).map(s=>`<label class="gemSlot">第 ${s.ID} 格 · ${Number(s.NeedLv).toLocaleString()} 等<select data-gem-slot="${s.ID}" aria-label="第 ${s.ID} 格 ${shapes[shape]}">${options(shape)}</select><small id="gemStat${s.ID}"></small></label>`).join('')}</div></section>`).join('')}`;
  const refresh=()=>{
   const result=SZO_GEM_TOTAL(state.level,state.picks);
   byId('gemOpened').textContent=`已開 ${result.slots} / 30 格 · 已鑲嵌 ${result.equipped} 格`;
   byId('gemTotal').innerHTML=Object.entries(stats).map(([k,n])=>`<strong>${n} +${result.total[k].toLocaleString()}</strong>`).join('');
   content.querySelectorAll('[data-gem-slot]').forEach(select=>{const id=select.dataset.gemSlot,slot=data.slots.find(s=>String(s.ID)===id);select.disabled=Number(slot.NeedLv)>state.level;select.value=state.picks[id]||'';const item=items.find(i=>String(i.ID)===select.value),media=window.SZO_ASSET_MEDIA;byId('gemStat'+id).innerHTML=(item&&media?media.img(media.itemIconSrc(item),name(select.value),'assetThumb itemThumb'):'')+esc(select.disabled?'尚未開啟，不計入能力':data.gems[select.value]?detail(data.gems[select.value]):'未鑲嵌');});save();
  };
  byId('gemLevel').oninput=()=>{state.level=Math.max(0,Math.min(20000,Math.floor(Number(byId('gemLevel').value)||0)));refresh();};
  content.querySelectorAll('[data-gem-slot]').forEach(s=>s.onchange=()=>{state.picks[s.dataset.gemSlot]=s.value;refresh();});
  content.querySelectorAll('[data-fill-shape]').forEach(b=>b.onclick=()=>{const shape=Number(b.dataset.fillShape),id=byId('gemBatch'+shape).value;data.slots.filter(s=>Number(s.Shape)===shape&&Number(s.NeedLv)<=state.level).forEach(s=>state.picks[s.ID]=id);refresh();});
  byId('gemClear').onclick=()=>{state.picks={};refresh();};refresh();
 };
})();

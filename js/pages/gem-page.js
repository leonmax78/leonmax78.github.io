(function(){
 const shapes=['','圓弧','三角','四方','五稜','六緯'];
 const stats={Base_HP:'生命',Base_MP:'法力',Base_Con:'體魄',Base_Str:'力量',Base_Int:'智慧',Base_Dex:'敏捷',Extra_Def:'防禦',Magic_Att:'術攻',Magic_Def:'術防'};
 const key='szo-gem-calculator-v1';
 let state={level:5000,picks:{}},tab='plan';
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&typeof saved.picks==='object'&&saved.picks)state={level:Number(saved.level)||0,picks:saved.picks,rec:saved.rec};}catch(e){}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}};

 const SLOT_KEY='szo-gem-slots-v1',LETTERS=['A','B','C','D','E'],FOUR=['Base_Con','Base_Str','Base_Int','Base_Dex'];
 const readSlots=()=>{try{const a=JSON.parse(localStorage.getItem(SLOT_KEY));if(Array.isArray(a))return LETTERS.map((_,i)=>a[i]&&typeof a[i].picks==='object'?a[i]:null);}catch(e){}return LETTERS.map(()=>null);};
 const writeSlots=a=>{try{localStorage.setItem(SLOT_KEY,JSON.stringify(a));}catch(e){}};
 const slotLabel=s=>s?(s.note?s.note+' · ':'')+`降神 ${Number(s.level).toLocaleString()} 等 · 鑲嵌 ${Object.values(s.picks).filter(Boolean).length} 顆`:'空白';
 const GOALS={Base_Str:'力量',Base_Dex:'敏捷',Base_Int:'智慧',four:'四屬性（體魄＋力量＋智慧＋敏捷）'};
 const fourSum=g=>FOUR.reduce((n,k)=>n+(Number(g[k])||0),0);
 // Best gem per open slot: highest goal value; ties go to the gem with more of the four main stats (e.g. a 多彩晶鑽 matching a single colour).
 window.SZO_GEM_RECOMMEND=function(level,grade,goal){
  const data=window.SZO_JEWELS,names=window.SZO_ABYSS_EXCHANGES.names,picks={};
  const score=g=>goal==='four'?fourSum(g):Number(g[goal])||0;
  for(const slot of data.slots.filter(s=>Number(s.NeedLv)<=level)){
   const pool=Object.values(data.gems).filter(g=>names[g.ID]&&String(g.Shape)===String(slot.Shape)&&Number(g.Grade)===Number(grade));
   pool.sort((a,b)=>score(b)-score(a)||fourSum(b)-fourSum(a)||Number(a.ID)-Number(b.ID));
   if(pool[0])picks[slot.ID]=pool[0].ID;
  }
  return picks;
 };
 const detail=g=>Object.entries(stats).filter(([k])=>Number(g[k])).map(([k,n])=>n+' +'+Number(g[k]).toLocaleString()).join('、');
 function refinePlan(target,rows){
  const steps=[],total=new Map();
  function expand(id,count,group){
   const row=rows.find(r=>r.group===group&&r.rewards.some(p=>p.id===id));
   if(!row)return false;
   const times=Math.ceil(count/row.rewards.find(p=>p.id===id).count);
   for(const m of row.materials){
    const n=m.count*times;
    if(group>231&&rows.some(r=>r.group===group-1&&r.rewards.some(p=>p.id===m.id))){
     expand(m.id,n,group-1);
    }else total.set(m.id,(total.get(m.id)||0)+n);
   }
   steps.push({row,times});return true;
  }
  return expand(target,1,233)&&steps.some(s=>s.row.group===231)&&steps.some(s=>s.row.group===232)?{steps,total}:null;
 }
 window.SZO_GEM_TOTAL=function(level,picks){
  const data=window.SZO_JEWELS,total=Object.fromEntries(Object.keys(stats).map(k=>[k,0]));let equipped=0;
  const slots=data.slots.filter(s=>Number(s.NeedLv)<=level);
  for(const slot of slots){const gem=data.gems[picks[slot.ID]];if(!gem||!window.SZO_ABYSS_EXCHANGES.names[gem.ID]||Number(gem.Grade)>6||String(gem.Shape)!==String(slot.Shape))continue;equipped++;for(const k in stats)total[k]+=Number(gem[k])||0;}
  return {slots:slots.length,equipped,total};
 };
 window.renderGemPage=function(){
  const data=window.SZO_JEWELS,exchange=window.SZO_ABYSS_EXCHANGES;
  const name=id=>exchange.names[id]||id;
  const options=(shape,grade)=>'<option value="">未鑲嵌</option>'+Object.values(data.gems).filter(g=>exchange.names[g.ID]&&Number(g.Shape)===shape&&Number(g.Grade)===Number(grade)).map(g=>`<option value="${g.ID}">${esc(name(g.ID).replace(shapes[shape],'').replace(/(?:寶石|晶鑽).*$/,''))}（${esc(detail(g))}）</option>`).join('');
  const picker=(shape,id,slot)=>{const grade=Number(data.gems[state.picks[slot]]?.Grade)||1;return `<div class="gemPicker"><label>品階<select id="${id}Grade" data-gem-grade="${id}" data-shape="${shape}">${[1,2,3,4,5,6].map(g=>`<option value="${g}"${g===grade?' selected':''}>${g} 階</option>`).join('')}</select></label><label>顏色（能力）<select id="${id}"${slot?` data-gem-slot="${slot}"`:''}>${options(shape,grade)}</select></label></div>`;};
  byId('reader').innerHTML=`<section id="gemPage"><style>
  #gemPage .gemTabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}#gemPage .gemTabs button[aria-selected=true]{background:#137b77;color:white}
  #gemPage .gemSlots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}#gemPage .gemSlot{min-width:0;padding:12px;border:1px solid var(--border,#354557);border-radius:8px}#gemPage select,#gemPage input{max-width:100%;width:100%;min-width:0}#gemPage .gemShape{padding:18px 0;border-top:1px solid var(--border,#354557)}#gemPage .gemShape h2{font-size:18px}#gemPage .gemTotals{display:flex;flex-wrap:wrap;gap:12px 24px;padding:16px 0}#gemPage .gemBatch{display:flex;gap:8px;max-width:620px;margin:12px 0}#gemPage .gemBatch button{flex-shrink:0}#gemPage .gemFilters{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin:16px 0}#gemPage .gemRecipe{padding:16px 0;border-bottom:1px solid var(--border,#354557);overflow-wrap:anywhere}#gemPage .gemRecipe h3{font-size:16px}#gemPage .gemSlot small{display:block;margin-top:8px}#gemPage .gemSlot:has(select:disabled){opacity:.55}
  #gemPage button{font:inherit;color:var(--text,#dce7f5);background:#102a36;border:1px solid #357b83;border-radius:6px;padding:9px 12px;cursor:pointer;max-width:100%;white-space:normal;overflow-wrap:anywhere}#gemPage button:hover{background:#194756}#gemPage button:focus-visible{outline:2px solid #53ded3;outline-offset:2px}#gemPage .gemRecipe button{padding:4px 8px}#gemPage h1{font-size:22px}#gemPage .gemRecipe p{line-height:2}
  #gemPage .gemPicker{display:grid;grid-template-columns:76px minmax(0,1fr);gap:8px;flex:1;min-width:0}#gemPage .gemPicker label{min-width:0;font-size:12px}#gemPage .gemBatch{align-items:end;flex-wrap:wrap}#gemPage .gemBatch .gemPicker{flex-basis:280px}#gemPage .gemPicker select{margin-top:5px}#gemPage .gemSlotTitle{margin-bottom:8px}
  #gemPage .gemRule{border-left:4px solid #dda84d;padding:8px 12px;background:var(--panel);line-height:1.65}
  #gemPage .gemShopping{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,195px),1fr));gap:4px 24px}
  #gemPage .gemShopping li{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border,#354557);padding:6px 0;gap:8px}
  #gemPage .gemShopping button{border:0;background:transparent;text-align:left;padding:4px 0}
  #gemPage .gemShopping strong{white-space:nowrap;font-variant-numeric:tabular-nums}
  #gemPage .gemStep{margin:12px 0;padding:6px 0;border-bottom:1px solid var(--border,#354557)}
  #gemPage .gemStep summary{cursor:pointer;padding:6px 0;font-weight:bold}
  </style><h1>神魂寶石</h1><div class="gemTabs" role="tablist">${[['plan','三星合成材料'],['calc','鑲嵌能力試算'],['recommend','推薦方案'],['compare','存檔比較'],['recipes','加工配方與寶石粉']].map(([id,label])=>`<button role="tab" data-gem-tab="${id}" aria-selected="${tab===id}">${label}</button>`).join('')}</div><div id="gemContent"></div></section>`;
  byId('gemPage').querySelectorAll('[data-gem-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.gemTab;renderGemPage();});
  const content=byId('gemContent');
  if(tab==='plan'){
   const targets=exchange.rows.filter(r=>r.group===233).flatMap(r=>r.rewards).filter(p=>Number(data.gems[p.id]?.Grade)===3);
   content.innerHTML=`<div class="gemFilters"><label>形狀<select id="gemPlanShape">${shapes.slice(1).map((n,i)=>`<option value="${i+1}">${n}</option>`).join('')}</select></label><label>目標三星寶石（能力）<select id="gemPlanTarget"></select></label></div><div id="gemPlanResult" aria-live="polite"></div>`;
   const materials=ps=>ps.map(p=>`<button type="button" data-item="${esc(p.id)}">${esc(name(p.id))}</button> × ${p.count.toLocaleString()}`).join('、');
   const refresh=()=>{
    const id=byId('gemPlanTarget').value,plan=refinePlan(id,exchange.rows);
    byId('gemPlanResult').innerHTML=plan?`<p class="gemRule"><strong>升星不能混搭</strong>：每升一星，需要 3 顆同形狀、同顏色的前一星寶石。一星則由普通材料製作。</p><h2>${esc(name(id))} × 1</h2><h3>備料總清單</h3><ul class="gemShopping">${Array.from(plan.total,([mid,n])=>`<li><button type="button" data-item="${esc(mid)}">${esc(name(mid))}</button><strong>× ${n.toLocaleString()}</strong></li>`).join('')}</ul><h3>精製順序</h3>`+plan.steps.map(({row,times},i)=>`<details class="gemStep"><summary>${esc(name(row.rewards[0].id))} × ${times*row.rewards[0].count}</summary>${i?`<p>每顆需要：${materials(row.materials)}</p>`:''}<p>製作 ${times} 顆共需：${materials(row.materials.map(m=>({...m,count:m.count*times})))}</p></details>`).join(''):'<p>沒有完整的一至三星精製配方。</p>';
   };
   const choose=()=>{byId('gemPlanTarget').innerHTML=targets.filter(p=>String(data.gems[p.id].Shape)===byId('gemPlanShape').value).map(p=>`<option value="${p.id}">${esc(name(p.id))}（${esc(detail(data.gems[p.id]))}）</option>`).join('');refresh();};
   byId('gemPlanShape').onchange=choose;byId('gemPlanTarget').onchange=refresh;choose();return;
  }

  if(tab==='recommend'){
   const rs=state.rec||(state.rec={level:state.level||5000,grade:1,goal:'Base_Str'});
   content.innerHTML=`<p class="gemRule">每一格挑該形狀、該星等裡目標能力最高的寶石；同分時改放四項能力總和較高的（多彩晶鑽）。</p><div class="gemFilters"><label>降神總等級<input id="gemRecLevel" type="number" min="0" max="20000" value="${rs.level}"></label><label>寶石星等<select id="gemRecGrade">${[1,2,3,4,5,6].map(g=>`<option value="${g}"${g===Number(rs.grade)?' selected':''}>${'ⅠⅡⅢⅣⅤⅥ'[g-1]}（${g} 階）</option>`).join('')}</select></label><label>目標<select id="gemRecGoal">${Object.entries(GOALS).map(([k,n])=>`<option value="${k}"${k===rs.goal?' selected':''}>${n}最高</option>`).join('')}</select></label></div><div id="gemRecResult" aria-live="polite"></div>`;
   const refresh=()=>{
    rs.level=Math.max(0,Math.min(20000,Math.floor(Number(byId('gemRecLevel').value)||0)));rs.grade=Number(byId('gemRecGrade').value);rs.goal=byId('gemRecGoal').value;save();
    const picks=SZO_GEM_RECOMMEND(rs.level,rs.grade,rs.goal),res=SZO_GEM_TOTAL(rs.level,picks);
    const open=data.slots.filter(s=>Number(s.NeedLv)<=rs.level);
    const mixed=open.filter(s=>picks[s.ID]&&/多彩/.test(name(picks[s.ID]))).length;
    const goalVal=r=>rs.goal==='four'?FOUR.reduce((n,k)=>n+r.total[k],0):r.total[rs.goal];
    const grid=[1,2,3,4,5,6].map(g=>`<tr><th>${'ⅠⅡⅢⅣⅤⅥ'[g-1]}</th>${Object.keys(GOALS).map(k=>{const r=SZO_GEM_TOTAL(rs.level,SZO_GEM_RECOMMEND(rs.level,g,k));const v=k==='four'?FOUR.reduce((n,x)=>n+r.total[x],0):r.total[k];return `<td>${v.toLocaleString()}</td>`;}).join('')}</tr>`).join('');
    byId('gemRecResult').innerHTML=open.length?`<h2>${GOALS[rs.goal]}最高 · ${'ⅠⅡⅢⅣⅤⅥ'[rs.grade-1]} · 已開 ${open.length} 格</h2><p>目標合計 <strong>+${goalVal(res).toLocaleString()}</strong>${mixed?`，其中 ${mixed} 格放多彩晶鑽`:''}</p><div class="gemTotals">${Object.entries(stats).filter(([k])=>res.total[k]).map(([k,n])=>`<strong>${n} +${res.total[k].toLocaleString()}</strong>`).join('')}</div><div class="gemSlots">${open.map(s=>`<div class="gemSlot"><div class="gemSlotTitle">第 ${s.ID} 格 · ${shapes[s.Shape]} · ${Number(s.NeedLv).toLocaleString()} 等</div><strong>${esc(name(picks[s.ID]))}</strong><small>${esc(detail(data.gems[picks[s.ID]]))}</small></div>`).join('')}</div><div class="gemBatch"><button id="gemRecApply" type="button">套用到鑲嵌能力試算</button><label>存到<select id="gemRecSlot">${LETTERS.map((x,i)=>`<option value="${i}">存檔 ${x}</option>`).join('')}</select></label><button id="gemRecSave" type="button">存檔</button></div><p id="gemRecNote" aria-live="polite"></p><h3>這個等級各星等的最高合計</h3><div class="tableWrap"><table class="compareTable"><thead><tr><th>星等</th>${Object.values(GOALS).map(n=>`<th>${esc(n.replace(/（.*/,''))}</th>`).join('')}</tr></thead><tbody>${grid}</tbody></table></div>`:'<p>這個等級還沒有開孔（100 等開第 1 格）。</p>';
    if(!open.length)return;
    byId('gemRecApply').onclick=()=>{state.level=rs.level;state.picks={...picks};save();tab='calc';renderGemPage();};
    byId('gemRecSave').onclick=()=>{const a=readSlots(),i=Number(byId('gemRecSlot').value);a[i]={level:rs.level,picks:{...picks},note:`推薦：${GOALS[rs.goal].replace(/（.*/,'')} ${'ⅠⅡⅢⅣⅤⅥ'[rs.grade-1]}`};writeSlots(a);byId('gemRecNote').textContent=`已存入存檔 ${LETTERS[i]}：${slotLabel(a[i])}`;};
   };
   ['gemRecLevel','gemRecGrade','gemRecGoal'].forEach(id=>byId(id).addEventListener('input',refresh));refresh();return;
  }
  if(tab==='compare'){
   const slots=readSlots();
   content.innerHTML=`<p class="gemRule">在「鑲嵌能力試算」或「推薦方案」存入 A～E 後，選 2～5 組比較總能力；每列最高值會標色。</p><div class="gemFilters">${[0,1,2,3,4].map(i=>`<label>比較 ${i+1}<select id="gemCmp${i}"><option value="">不使用</option>${LETTERS.map((x,j)=>`<option value="${j}"${slots[j]&&j===i?' selected':''}>存檔 ${x}：${esc(slotLabel(slots[j]))}</option>`).join('')}</select></label>`).join('')}</div><div id="gemCmpResult"></div>`;
   const refresh=()=>{
    const cols=[0,1,2,3,4].map(i=>byId('gemCmp'+i).value).filter(v=>v!==''&&slots[v]).map(v=>({label:'存檔 '+LETTERS[v],slot:slots[v],res:SZO_GEM_TOTAL(Number(slots[v].level)||0,slots[v].picks)}));
    if(!cols.length){byId('gemCmpResult').innerHTML='<p>還沒有存檔。請先到「鑲嵌能力試算」或「推薦方案」存檔。</p>';return;}
    const rows=[...Object.entries(stats),['four','四屬性合計']];
    const val=(c,k)=>k==='four'?FOUR.reduce((n,x)=>n+c.res.total[x],0):c.res.total[k];
    byId('gemCmpResult').innerHTML=`<div class="tableWrap"><table class="compareTable"><thead><tr><th>能力</th>${cols.map(c=>`<th>${c.label}<br><small>${esc(slotLabel(c.slot))}</small></th>`).join('')}</tr></thead><tbody>${rows.map(([k,n])=>{const v=cols.map(c=>val(c,k)),m=Math.max(...v);return `<tr><td>${n}</td>${v.map(x=>`<td class="${m>0&&x===m?'supportBest':''}">${x.toLocaleString()}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>`;
   };
   content.querySelectorAll('select').forEach(s=>s.onchange=refresh);refresh();return;
  }
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
  content.innerHTML=`<label>降神總等級<input id="gemLevel" type="number" min="0" max="20000" value="${state.level}" style="max-width:240px"></label><p id="gemOpened" aria-live="polite"></p><div id="gemTotal" class="gemTotals" aria-live="polite"></div><div class="gemBatch"><button id="gemClear" type="button">清空寶石</button><label>存檔<select id="gemSaveSlot">${LETTERS.map((x,i)=>`<option value="${i}">${x}：${esc(slotLabel(readSlots()[i]))}</option>`).join('')}</select></label><button id="gemSave" type="button">存檔</button><button id="gemLoad" type="button">讀取</button><button id="gemOpenCompare" type="button">存檔比較</button></div><p id="gemSaveNote" aria-live="polite"></p>${[1,2,3,4,5].map(shape=>`<section class="gemShape"><h2>${shapes[shape]}</h2><div class="gemBatch">${picker(shape,'gemBatch'+shape)}<button data-fill-shape="${shape}" type="button">套用已開孔</button></div><div class="gemSlots">${data.slots.filter(s=>Number(s.Shape)===shape).map(s=>`<div class="gemSlot"><div class="gemSlotTitle">第 ${s.ID} 格 · ${Number(s.NeedLv).toLocaleString()} 等</div>${picker(shape,'gemSlot'+s.ID,s.ID)}<small id="gemStat${s.ID}"></small></div>`).join('')}</div></section>`).join('')}`;
  const refresh=()=>{
   const result=SZO_GEM_TOTAL(state.level,state.picks);
   byId('gemOpened').textContent=`已開 ${result.slots} / 30 格 · 已鑲嵌 ${result.equipped} 格`;
   byId('gemTotal').innerHTML=Object.entries(stats).map(([k,n])=>`<strong>${n} +${result.total[k].toLocaleString()}</strong>`).join('');
   data.slots.forEach(s=>{byId('gemSlot'+s.ID+'Grade').disabled=Number(s.NeedLv)>state.level;});
   content.querySelectorAll('[data-gem-slot]').forEach(select=>{const id=select.dataset.gemSlot,slot=data.slots.find(s=>String(s.ID)===id);select.disabled=Number(slot.NeedLv)>state.level;select.value=state.picks[id]||'';const item=items.find(i=>String(i.ID)===select.value),media=window.SZO_ASSET_MEDIA;byId('gemStat'+id).innerHTML=(item&&media?media.img(media.itemIconSrc(item),name(select.value),'assetThumb itemThumb'):'')+esc(select.disabled?'尚未開啟，不計入能力':data.gems[select.value]?detail(data.gems[select.value]):'未鑲嵌');});save();
  };
  byId('gemLevel').oninput=()=>{state.level=Math.max(0,Math.min(20000,Math.floor(Number(byId('gemLevel').value)||0)));refresh();};
  content.querySelectorAll('[data-gem-grade]').forEach(s=>s.onchange=()=>{const select=byId(s.dataset.gemGrade);select.innerHTML=options(Number(s.dataset.shape),s.value);if(select.dataset.gemSlot){state.picks[select.dataset.gemSlot]='';refresh();}});
  content.querySelectorAll('[data-gem-slot]').forEach(s=>s.onchange=()=>{state.picks[s.dataset.gemSlot]=s.value;refresh();});
  content.querySelectorAll('[data-fill-shape]').forEach(b=>b.onclick=()=>{const shape=Number(b.dataset.fillShape),id=byId('gemBatch'+shape).value,grade=byId('gemBatch'+shape+'Grade').value;data.slots.filter(s=>Number(s.Shape)===shape&&Number(s.NeedLv)<=state.level).forEach(s=>{state.picks[s.ID]=id;byId('gemSlot'+s.ID+'Grade').value=grade;byId('gemSlot'+s.ID).innerHTML=options(shape,grade);});refresh();});
  byId('gemClear').onclick=()=>{state.picks={};refresh();};
  const slotSel=byId('gemSaveSlot'),relabel=()=>{const a=readSlots();[...slotSel.options].forEach((o,i)=>o.textContent=`${LETTERS[i]}：${slotLabel(a[i])}`);};
  byId('gemSave').onclick=()=>{const a=readSlots(),i=Number(slotSel.value);a[i]={level:state.level,picks:{...state.picks}};writeSlots(a);relabel();byId('gemSaveNote').textContent=`已存入存檔 ${LETTERS[i]}`;};
  byId('gemLoad').onclick=()=>{const s=readSlots()[Number(slotSel.value)];if(!s){byId('gemSaveNote').textContent=`存檔 ${LETTERS[slotSel.value]} 是空白`;return;}state.level=Number(s.level)||0;state.picks={...s.picks};save();renderGemPage();};
  byId('gemOpenCompare').onclick=()=>{tab='compare';renderGemPage();};
  refresh();
 };
})();

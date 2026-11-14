(function(){
 window.SZO_FLOATING={enhance(el){
  const bar=el.querySelector('.detailPreviewBar');
  const button=document.createElement('button');
  button.type='button';button.textContent='⛶';button.title='放大／還原視窗';button.setAttribute('aria-label',button.title);
  bar.insertBefore(button,bar.lastElementChild);
  button.addEventListener('click',()=>{el.classList.toggle('floatingExpanded');el.style.left='';el.style.top='';el.style.margin='';});
  let drag=null;
  bar.addEventListener('pointerdown',e=>{
   if(e.target.closest('button')||innerWidth<700||el.classList.contains('floatingExpanded'))return;
   const r=el.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};
   bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove',e=>{
   if(!drag)return;
   el.style.margin='0';el.style.left=Math.max(0,Math.min(innerWidth-el.offsetWidth,e.clientX-drag.x))+'px';
   el.style.top=Math.max(0,Math.min(innerHeight-el.offsetHeight,e.clientY-drag.y))+'px';
  });
  bar.addEventListener('pointerup',()=>drag=null);
  bar.addEventListener('lostpointercapture',()=>drag=null);
 }};
 const snapshots=new Map();let sequence=0,dialog,request=0,afterClose=null,trail=[],origin=null,openedAboveMap=false;
 function capture(){
  const reader=document.getElementById('reader');if(!reader)return null;
  const key=history.state?.szoSnapshot||'detail-'+(++sequence);
  snapshots.set(key,{nodes:[...reader.childNodes],scroll:[reader,...reader.querySelectorAll('*')].filter(el=>el.scrollTop||el.scrollLeft).map(el=>[el,el.scrollTop,el.scrollLeft]),x:scrollX,y:scrollY,view:currentView,last:window.v86LastView,focus:document.activeElement});
  history.replaceState({...history.state,szoSnapshot:key},'',location.href);
  if(snapshots.size>16)snapshots.delete(snapshots.keys().next().value);
  return key;
 }
 function restore(key){
  const saved=snapshots.get(key);if(!saved)return false;
  document.getElementById('reader').replaceChildren(...saved.nodes);currentView=saved.view;window.v86LastView=saved.last;
  requestAnimationFrame(()=>{for(const [el,top,left] of saved.scroll){el.scrollTop=top;el.scrollLeft=left;}window.scrollTo({top:saved.y,left:saved.x,behavior:'instant'});saved.focus?.focus({preventScroll:true});});
  return true;
 }
 function dropStalePreview(){if(history.state?.szoPreview){const st={...history.state};delete st.szoPreview;history.replaceState(st,'',location.href);}}
 // A reload keeps history.state; the preview it recorded is no longer open.
 if(history.state?.szoPreview)dropStalePreview();
 function hide(){request++;if(dialog?.open)dialog.close();document.body.classList.remove('detailPreviewOpen');trail=[];origin?.focus({preventScroll:true});}
 function close(callback){afterClose=callback||null;if(history.state?.szoPreview)history.back();else{hide();const next=afterClose;afterClose=null;next?.();}}
 async function navigate(kind,id,skipPush=false){
  if(kind==='monster'){await ensureMonsterPageLoaded();await ensureMonsterDataLoaded();showMonster(id,skipPush);}
  else{await ensureItemPageLoaded();await ensureItemDataLoaded();if(kind==='reverse')await showReverse(id,'reverse',null,skipPush);else showItem(id,skipPush);}
 }
 function full(kind,id){window.SZO_MAP_FLOAT?.close();close(()=>navigate(kind,id).catch(console.error));}
 function shell(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='detailPreview';dialog.className='detailPreview';dialog.setAttribute('aria-label','資料預覽');
  dialog.innerHTML='<header class="detailPreviewBar"><button type="button" data-preview-back aria-label="返回上一個預覽" title="返回上一個預覽">←</button><strong>資料預覽</strong><button type="button" data-preview-close aria-label="關閉預覽" title="關閉預覽">×</button></header><div class="detailPreviewBody"></div><footer class="detailPreviewActions"></footer>';
  document.body.appendChild(dialog);
  window.SZO_FLOATING.enhance(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{
   if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
   if(e.target.closest('[data-preview-close]'))close();
   if(e.target.closest('[data-preview-back]')&&trail.length>1){trail.pop();const prev=trail.pop();open(prev.kind,prev.id,false,prev.highlightItemId);}
   const action=e.target.closest('[data-preview-full]');if(action)full(action.dataset.previewFull,action.dataset.id);
   const sub=e.target.closest('[data-preview-open]');if(sub)open(sub.dataset.previewOpen,sub.dataset.id);
   if(e.target.closest('[data-preview-quest-page]')){const q=dialog.querySelector('.questPreview h1')?.textContent||'';window.SZO_MAP_FLOAT?.close();close(()=>window.openQuestPage?.(q));}
   const npcMap=e.target.closest('[data-preview-npc-map]');if(npcMap)ensureMapPageLoaded().then(()=>window.openNpcMapFromKey(npcMap.dataset.previewNpcMap)).catch(console.error);
   const shopFull=e.target.closest('[data-preview-npcshop-full]');if(shopFull){const [sid,nid]=shopFull.dataset.previewNpcshopFull.split(':');window.SZO_MAP_FLOAT?.close();close(()=>ensureShopPageLoaded().then(()=>window.openShopNpc(sid,nid)).catch(console.error));}
  });
 }
 async function open(kind,id,push=true,highlightItemId=''){
  shell();const ticket=++request;
  if(kind==='monster'&&/^\d+:\d+$/.test(String(id)))kind='npc';
  openedAboveMap=!!window.SZO_MAP_FLOAT?.isOpen();
  if(dialog.open&&window.SZO_MAP_FLOAT?.isOpen()){dialog.close();dialog.showModal();}
  if(!dialog.open){origin=document.activeElement;trail=[];if(push){dropStalePreview();capture();history.pushState({...history.state,szoPreview:{kind,id,highlightItemId}},'',location.href);}dialog.showModal();document.body.classList.add('detailPreviewOpen');}
  trail.push({kind,id,highlightItemId});dialog.querySelector('[data-preview-back]').hidden=trail.length<2;
  const body=dialog.querySelector('.detailPreviewBody'),actions=dialog.querySelector('footer');body.innerHTML='<p role="status">資料載入中…</p>';actions.replaceChildren();body.scrollTop=0;
  try{
   let html,monsterName='';
   if(kind==='item'){
    await ensureItemPageLoaded();if(!await ensureItemDataLoaded())throw Error('道具資料載入失敗');await ensureItemOptionalData('');
    const item=itemIndex[String(id)];if(!item)throw Error('找不到這個道具');html=itemDetailBodyHTML(item);
   }else if(kind==='beast'){
    await ensureMonsterPageLoaded();if(!await ensureMonsterDataLoaded())throw Error('封獸資料載入失敗');await ensureMonsterOptionalData('');
    html=beastDetailHTML(id);
   }else if(kind==='monster-drops'){
    await ensureMonsterPageLoaded();if(!await ensureMonsterDataLoaded())throw Error('怪物資料載入失敗');if(!await ensureItemDataLoaded())throw Error('道具資料載入失敗');
    const m=monsters.find(row=>String(row.ID)===String(id));if(!m)throw Error('找不到這個怪物');
    html=`<div class="itemGroupedDetail"><h1>${esc(nameOf(m))}：掉落資料</h1><div class="detailPreviewDrops">${monsterDropRows(m).map(([itemId,name,rate])=>`<button type="button" data-item="${esc(itemId)}"><span>${esc(name)}</span><small>${esc(rate)}</small></button>`).join('')||'<p>沒有掉落資料</p>'}</div></div>`;
   }else if(kind==='npc'){
    await ensureMapPageLoaded();
    html=await window.renderNpcPreviewHTML(id);
   }else if(kind==='quest'){
    await ensureQuestPageLoaded();
    html=await window.renderQuestPreviewHTML(id);
   }else if(kind==='npcshop'){
    await ensureShopPageLoaded();
    html=await window.renderShopNpcPreviewHTML(id);
   }else if(kind==='shops'){
    await ensureQaPageLoaded();
    html=await window.renderQaShopPreviewHTML(id);
   }else if(kind==='collect'){
    await ensureCollectPageLoaded();
    html=await window.renderCollectDropPreviewHTML(id);
   }else if(kind==='reverse'){
    await ensureItemPageLoaded();
    html=await window.renderReversePreviewHTML(id);
   }else{
    await ensureMonsterPageLoaded();if(!await ensureMonsterDataLoaded())throw Error('怪物資料載入失敗');await ensureMonsterOptionalData('');await ensureItemDataLoaded();
    let m=monsters.find(row=>String(row.ID)===String(id));
    if(!m){await ensureMonsterDataLoaded();if(typeof syncMonsterDataForPage==='function')syncMonsterDataForPage();m=(window.monsters||monsters).find(row=>String(row.ID)===String(id));}
    if(!m)throw Error('找不到這個怪物');
    monsterName=nameOf(m);
    const drops=monsterDropRows(m);
    html=`<div class="itemGroupedDetail"><header class="itemIdentity">${monsterThumbHTML(m)}<h1>${esc(nameOf(m))}</h1></header><h2>怪物資料</h2>${monsterRowsHTML([['等級',m.Level],['生命',m.HP],['精力',m.MP],['種族',raceName(m.Type)],['位置',locOf(nameOf(m))],['經驗',m.DropExp]],'itemSectionGrid')}<h2>能力</h2>${monsterRowsHTML([['體魄',m.Con],['力量',m.Str],['智慧',m.Int],['靈敏',m.Dex],['物理防禦',m.ExtraDef],['術法攻擊',m.MagicAttack],['術法防禦',m.MagicDef]],'itemSectionGrid')}<h2>掉落道具<small class="dropSortNote">機率高到低</small></h2><div class="detailPreviewDrops">${dropRowsSorted(drops).map(([itemId,name,rate])=>`<button type="button" data-item="${esc(itemId)}">${dropIconHTML(itemId,name)}<span class="dropText"><span>${esc(name)}</span><small>${esc(rate)}</small></span></button>`).join('')||'<p>沒有掉落資料</p>'}</div></div>`;
   }
   if(ticket!==request||!dialog.open)return;
   body.innerHTML=html;
   if(kind==='monster'&&highlightItemId)for(const drop of body.querySelectorAll('.detailPreviewDrops [data-item]')){
    if(drop.dataset.item===String(highlightItemId)){drop.classList.add('searchedDrop');drop.title='本次查詢道具';}
   }
   actions.innerHTML=`<button type="button" data-preview-full="${kind}" data-id="${esc(id)}">前往完整${kind==='item'?'道具':kind==='reverse'?'來源':'怪物'}頁</button>${kind==='item'?`<button type="button" data-rev="${esc(id)}">查詢取得來源</button>`:kind==='monster'?`<button type="button" data-preview-map="${esc(id)}" data-map-name="${esc(monsterName)}">查看地圖位置</button>`:''}`;
   if(kind==='npcshop'){const [sid,nid]=String(id).split(':');actions.innerHTML=`<button type="button" data-preview-open="npc" data-id="${esc(id)}">NPC 對話</button><button type="button" data-preview-npcshop-full="${esc(sid)}:${esc(nid)}">前往商店頁</button>`;}
   else if(kind==='npc'){actions.innerHTML=((await window.npcPreviewHasShop(id))?`<button type="button" data-preview-open="npcshop" data-id="${esc(id)}">看商店</button>`:'')+(String(id).startsWith(':')?'':`<button type="button" data-preview-npc-map="${esc(id)}">地圖位置</button>`);}
   else if(kind==='quest')actions.innerHTML='<button type="button" data-preview-quest-page>前往任務查詢頁</button>';
   else if(['collect','shops','beast','monster-drops'].includes(kind))actions.replaceChildren();
  }catch(error){if(ticket===request&&dialog.open)body.textContent=error.message||'資料載入失敗，請關閉後重試。';}
 }
 // V780: drop list with item icons, highest chance first (rates kept exactly as the game data has them)
 function dropRowsSorted(drops){
  const val=r=>{const n=parseFloat(r);return Number.isFinite(n)?n:-1;};
  return drops.slice().sort((a,b)=>val(b[2])-val(a[2]));
 }
 function dropIconHTML(itemId,name){
  try{
   const idx=window.itemIndex||(typeof itemIndex!=='undefined'?itemIndex:null);
   const it=idx&&idx[String(itemId).trim()];
   const media=window.SZO_ASSET_MEDIA;
   if(!it||!media)return '<span class="dropIcon none"></span>';
   return `<span class="dropIcon">${media.img(media.itemIconSrc(it),name,'assetThumb itemThumb')}</span>`;
  }catch(e){return '<span class="dropIcon none"></span>';}
 }
 function pop(event){
  // Closing pops back to the entry under the preview; a preview recorded there is stale (e.g. left over from before a reload).
  if(dialog?.open&&event.state?.szoPreview){dropStalePreview();hide();const next=afterClose;afterClose=null;next?.();return true;}
  // A preview opened above a map owns this history entry, not the map below.
  if(!dialog?.open || !openedAboveMap)window.SZO_MAP_FLOAT?.close();
  if(event.state?.szoPreview){open(event.state.szoPreview.kind,event.state.szoPreview.id,false,event.state.szoPreview.highlightItemId);return true;}
  if(dialog?.open){hide();const next=afterClose;afterClose=null;next?.();return true;}
  if(restore(event.state?.szoSnapshot))return true;
  if(event.state?.szoDetail){navigate(event.state.szoDetail.kind,event.state.szoDetail.id,true).catch(console.error);return true;}
  return false;
 }
 window.SZO_DETAIL_NAV={capture,pop,back(){if(history.state?.szoReturn&&snapshots.has(history.state.szoReturn)){history.back();return true;}return false;}};
 window.SZO_PREVIEW={open,close};
 // Capture before legacy document delegates so one click opens exactly one preview.
 window.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-item],[data-monster],[data-qa-item],[data-qa-monster],[data-qa-reverse],[data-qa-shop-item],[data-shop-item],[data-map-shop-item],[data-rev],[data-reverse-item],[data-preview-map],[data-collect-reverse],[data-collect-nested-reverse]');if(!button||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.dataset.qaShopItem){open('shops',button.dataset.qaShopItem);return;}
  if(button.dataset.collectReverse){open('collect',button.dataset.collectReverse);return;}
  if(button.dataset.collectNestedReverse){open('reverse',button.dataset.collectNestedReverse);return;}
  if(button.dataset.previewMap){ensureMapPageLoaded().then(()=>window.openMonsterMapLocations(button.dataset.previewMap,button.dataset.mapName)).catch(console.error);return;}
  const reverseId=button.dataset.rev||button.dataset.reverseItem||button.dataset.qaReverse;
  if(reverseId){open('reverse',reverseId);return;}
  const itemId=button.dataset.item||button.dataset.qaItem||button.dataset.shopItem||button.dataset.mapShopItem;
  open(itemId?'item':'monster',itemId||button.dataset.monster||button.dataset.qaMonster,true,button.dataset.dropItem||'');
 },true);
})();

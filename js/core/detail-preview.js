(function(){
 const snapshots=new Map();let sequence=0,dialog,request=0,afterClose=null,trail=[],origin=null;
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
 function hide(){request++;if(dialog?.open)dialog.close();document.body.classList.remove('detailPreviewOpen');trail=[];origin?.focus({preventScroll:true});}
 function close(callback){afterClose=callback||null;if(history.state?.szoPreview)history.back();else{hide();const next=afterClose;afterClose=null;next?.();}}
 async function navigate(kind,id,skipPush=false){
  if(kind==='monster'){await ensureMonsterPageLoaded();await ensureMonsterDataLoaded();showMonster(id,skipPush);}
  else{await ensureItemPageLoaded();await ensureItemDataLoaded();if(kind==='reverse')await showReverse(id,'reverse',null,skipPush);else showItem(id,skipPush);}
 }
 function full(kind,id){close(()=>navigate(kind,id).catch(console.error));}
 function shell(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='detailPreview';dialog.className='detailPreview';dialog.setAttribute('aria-label','資料預覽');
  dialog.innerHTML='<header class="detailPreviewBar"><button type="button" data-preview-back aria-label="返回上一個預覽" title="返回上一個預覽">←</button><strong>資料預覽</strong><button type="button" data-preview-close aria-label="關閉預覽" title="關閉預覽">×</button></header><div class="detailPreviewBody"></div><footer class="detailPreviewActions"></footer>';
  document.body.appendChild(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{
   if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
   if(e.target.closest('[data-preview-close]'))close();
   if(e.target.closest('[data-preview-back]')&&trail.length>1){trail.pop();const prev=trail.pop();open(prev.kind,prev.id,false,prev.highlightItemId);}
   const action=e.target.closest('[data-preview-full]');if(action)full(action.dataset.previewFull,action.dataset.id);
  });
 }
 async function open(kind,id,push=true,highlightItemId=''){
  shell();const ticket=++request;
  if(!dialog.open){origin=document.activeElement;trail=[];if(push){capture();history.pushState({...history.state,szoPreview:{kind,id,highlightItemId}},'',location.href);}dialog.showModal();document.body.classList.add('detailPreviewOpen');}
  trail.push({kind,id,highlightItemId});dialog.querySelector('[data-preview-back]').hidden=trail.length<2;
  const body=dialog.querySelector('.detailPreviewBody'),actions=dialog.querySelector('footer');body.innerHTML='<p role="status">資料載入中…</p>';actions.replaceChildren();body.scrollTop=0;
  try{
   let html;
   if(kind==='item'){
    await ensureItemPageLoaded();if(!await ensureItemDataLoaded())throw Error('道具資料載入失敗');await ensureItemOptionalData('');
    const item=itemIndex[String(id)];if(!item)throw Error('找不到這個道具');html=itemDetailBodyHTML(item);
   }else{
    await ensureMonsterPageLoaded();if(!await ensureMonsterDataLoaded())throw Error('怪物資料載入失敗');await ensureMonsterOptionalData('');await ensureItemDataLoaded();
    const m=monsters.find(row=>String(row.ID)===String(id));if(!m)throw Error('找不到這個怪物');
    const drops=monsterDropRows(m);
    html=`<div class="itemGroupedDetail"><header class="itemIdentity">${monsterThumbHTML(m)}<h1>${esc(nameOf(m))}</h1></header><h2>怪物資料</h2>${monsterRowsHTML([['等級',m.Level],['生命',m.HP],['精力',m.MP],['種族',raceName(m.Type)],['位置',locOf(nameOf(m))],['經驗',m.DropExp]],'itemSectionGrid')}<h2>能力</h2>${monsterRowsHTML([['體魄',m.Con],['力量',m.Str],['智慧',m.Int],['靈敏',m.Dex],['物理防禦',m.ExtraDef],['術法攻擊',m.MagicAttack],['術法防禦',m.MagicDef]],'itemSectionGrid')}<h2>掉落道具</h2><div class="detailPreviewDrops">${drops.map(([itemId,name,rate])=>`<button type="button" data-item="${esc(itemId)}"><span>${esc(name)}</span><small>${esc(rate)}</small></button>`).join('')||'<p>沒有掉落資料</p>'}</div></div>`;
   }
   if(ticket!==request||!dialog.open)return;
   body.innerHTML=html;
   if(kind==='monster'&&highlightItemId)for(const drop of body.querySelectorAll('.detailPreviewDrops [data-item]')){
    if(drop.dataset.item===String(highlightItemId)){drop.classList.add('searchedDrop');drop.title='本次查詢道具';}
   }
   actions.innerHTML=`<button type="button" data-preview-full="${kind}" data-id="${esc(id)}">前往完整${kind==='item'?'道具':'怪物'}頁</button>${kind==='item'?`<button type="button" data-preview-full="reverse" data-id="${esc(id)}">查詢取得來源</button>`:''}`;
  }catch(error){if(ticket===request&&dialog.open)body.textContent=error.message||'資料載入失敗，請關閉後重試。';}
 }
 function pop(event){
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
  const button=event.target.closest?.('[data-item],[data-monster],[data-qa-item],[data-qa-monster],[data-shop-item]');if(!button||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();event.stopImmediatePropagation();
  const itemId=button.dataset.item||button.dataset.qaItem||button.dataset.shopItem;
  open(itemId?'item':'monster',itemId||button.dataset.monster||button.dataset.qaMonster,true,button.dataset.dropItem||'');
 },true);
})();

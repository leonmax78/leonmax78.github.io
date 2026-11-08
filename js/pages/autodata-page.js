(function(){
 'use strict';
 const C=AutoDataCore,S=AutoDataServices;
 const model={rows:[],meta:null,handle:null,name:'AutoData_3.data',dirty:false,config:S.defaults(),cat:new Set(),selected:new Set(),anchor:{},page:0,sourceMode:'all',csv:null,busy:false};
 let host,data,backupDirectory=null,backupParent='',fileOperation=null,backupList=[];
 let mapScope=SZO_MAP_CLASS.normalize({});
 const $=id=>host.querySelector('#ae-'+id);
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tr=s=>document.documentElement.lang==='zh-Hans'?SZO_LANGUAGE.toSimple(s):s;
 const ask=s=>confirm(tr(s));
 const clean=rows=>rows.map(r=>({id:r.id||'',name:r.name,state:r.state}));
 function status(s){$('message').textContent=s;if($('save-result'))$('save-result').textContent=s;}
 const actionOptions='<option value="0">保存</option><option value="1">丟棄</option><option value="2">賣出</option>';
 function download(content,name,type='application/octet-stream'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 async function run(fn){
  if(model.busy)return;model.busy=true;host.setAttribute('aria-busy','true');
  const buttons=[...host.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{await fn();}catch(e){const message=e.name==='AbortError'?'操作已取消，未完成儲存':e.name==='NotAllowedError'?'未取得資料夾或檔案權限，請重新選擇備份位置並允許存取':e.message||'操作失敗';status(message);if($('storage-dialog')?.open)$('storage-message').textContent=message;}
  finally{model.busy=false;host.removeAttribute('aria-busy');buttons.filter(b=>b.isConnected).forEach(b=>b.disabled=false);render();}
 }
 async function persist(){await S.saveSettings(model.config);status('已儲存在此瀏覽器；不會寫入角色檔案');}
 function requireFile(){if(!model.meta)throw Error('請先載入角色 _3.data');}
 function requireOffline(){if(!$('offline').checked)throw Error('請先登出至角色選擇頁面，再勾選角色已離線確認');}
 function changed(rows){requireFile();C.serialize(model.meta,rows);model.rows=rows;model.dirty=true;model.selected.clear();model.anchor.rows=null;render();}
 function warn(rows){
  const high=rows.filter(r=>data.byId.get(String(r.id))?.value>500000);
  if(model.config.warn&&high.length)alert(tr(`⚠ ${high.length} 筆道具單價超過 500,000，仍可正常加入。請確認處理方式。`));
 }
 function mergeRows(incoming,replace=false,overwrite=false){requireFile();const result=C.merge(model.rows,incoming,replace,overwrite);warn(incoming);changed(result.rows);status(`已套用 ${model.rows.length} 筆；略過或合併重複 ${result.duplicate} 筆`);}
 async function load(file,handle=null){
  requireOffline();if(model.dirty&&!ask('目前有尚未儲存的變更，確定換檔？'))return;
  if(/_0\.data$/i.test(file.name))throw Error('這是 _0.data，請選擇 _3.data；未載入、未覆寫');
  const bytes=new Uint8Array(await file.arrayBuffer()),meta=C.parse(bytes);
  model.meta=meta;model.handle=handle;model.name=file.name;model.rows=meta.arr.map(r=>({...r,id:data.byName.get(r.name)?.id||''}));model.dirty=false;model.selected.clear();model.cat.clear();
  $('backup-result').textContent='';
  status(`已載入 ${file.name}，${model.rows.length} 筆。存檔只在本機記憶體處理`);
 }
 function selection(kind,key,event,visible){
  const set=kind==='cat'?model.cat:model.selected,idx=visible.indexOf(key),anchor=visible.indexOf(model.anchor[kind]);
  if(event.shiftKey&&anchor>=0){if(!event.ctrlKey&&!event.metaKey)set.clear();for(let i=Math.min(idx,anchor);i<=Math.max(idx,anchor);i++)set.add(visible[i]);}
  else if(event.ctrlKey||event.metaKey||event.target.type==='checkbox'){if(set.has(key))set.delete(key);else set.add(key);}
  else{set.clear();set.add(key);}
  model.anchor[kind]=key;render();
 }
 function catalogRows(){
  const mode=model.sourceMode,map=data.maps.find(m=>m.key===$('map').value),q=$('query').value;
  const common=new Set([...model.config.favorites,...model.config.discard.map(r=>r.id)]);
  return data.items.filter(r=>(mode!=='monster'||data.dropsByMonster.get($('monster').value)?.has(r.id))&&(mode!=='map'||map?.ids.has(r.id))&&(mode!=='common'||common.has(r.id))&&S.matches(r.id+' '+r.name,q,$('fuzzy').checked));
 }
 function monsterChoices(){
  const q=$('monster-query').value;
  $('monster').innerHTML='<option value="">選擇怪物</option>'+[...data.monsterIds].filter(([id,m])=>S.matches(id+' '+m.Name,q,true)).map(([id,m])=>`<option value="${E(id)}">${E(m.Name)}（${E(id)}）</option>`).join('');
 }
 function render(){
  if(!host?.isConnected||!data||!$('catalog'))return;
  const all=catalogRows(),pageCount=Math.max(1,Math.ceil(all.length/100));model.page=Math.min(model.page,pageCount-1);
  const visible=all.slice(model.page*100,model.page*100+100),existing=new Set(model.rows.map(r=>r.name)),fav=new Set([...model.config.favorites,...model.config.discard.map(r=>r.id)]);
  $('catalog').innerHTML=visible.map(r=>`<tr data-id="${r.id}" class="${model.cat.has(r.id)?'chosen':''}"><td><input aria-label="選取 ${E(r.name)}" type="checkbox" ${model.cat.has(r.id)?'checked':''}></td><td><button class="ae-star ${fav.has(r.id)?'on':''}" data-star="${r.id}" title="我的最愛" aria-label="我的最愛 ${E(r.name)}" aria-pressed="${fav.has(r.id)}">${fav.has(r.id)?'★':'☆'}</button></td><td>${E(r.name)}<small>${r.id} · ${E(r.type)}${existing.has(r.name)?' · 已存在':''}</small></td><td>${r.value==null?'未提供':Number.isFinite(r.value)?r.value.toLocaleString():'未提供'}${r.value>500000?' ⚠':''}</td></tr>`).join('');
  $('catalog-count').textContent=`${all.length} 筆 · 第 ${model.page+1}/${pageCount} 頁 · 已選 ${model.cat.size} 筆`;
  $('catalog').querySelectorAll('tr').forEach(row=>row.onclick=e=>{if(e.target.closest('[data-star]'))return;selection('cat',row.dataset.id,e,visible.map(r=>r.id));});
  $('catalog').querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>run(async()=>{const set=new Set(model.config.favorites);if(fav.has(b.dataset.star)){set.delete(b.dataset.star);model.config.discard=model.config.discard.filter(r=>r.id!==b.dataset.star);}else set.add(b.dataset.star);model.config.favorites=[...set];await persist();}));
  const filtered=model.rows.map((r,i)=>({...r,index:i})).filter(r=>S.matches(r.id+' '+r.name,$('row-query').value));
  $('rows').innerHTML=filtered.map(r=>`<tr data-index="${r.index}" class="${model.selected.has(r.index)?'chosen':''}"><td><input type="checkbox" aria-label="選取 ${E(r.name)}" ${model.selected.has(r.index)?'checked':''}></td><td>${E(r.name)}<small>${E(r.id||'未對應網站 ID')}</small></td><td><select aria-label="${E(r.name)} 處理方式" data-action-index="${r.index}">${C.ACTIONS.map((a,i)=>`<option value="${i}" ${i===r.state?'selected':''}>${a}</option>`).join('')}</select></td><td><button data-delete="${r.index}" title="刪除此筆" aria-label="刪除 ${E(r.name)}">×</button></td></tr>`).join('');
  $('rows').querySelectorAll('tr').forEach(row=>row.onclick=e=>{if(e.target.closest('button,select'))return;selection('rows',Number(row.dataset.index),e,filtered.map(r=>r.index));});
  $('rows').querySelectorAll('[data-action-index]').forEach(sel=>sel.onchange=()=>run(()=>changed(model.rows.map((r,i)=>i===Number(sel.dataset.actionIndex)?{...r,state:Number(sel.value)}:r))));
  $('rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>run(()=>changed(model.rows.filter((_,i)=>i!==Number(b.dataset.delete)))));
  $('row-count').textContent=`${model.rows.length} / 251 筆 · 已選 ${model.selected.size} 筆${model.dirty?' · 尚未儲存':''}`;
  const map=data.maps.find(m=>m.key===$('map').value);
  $('map-tools').hidden=model.sourceMode!=='map';
  $('monster-tools').hidden=model.sourceMode!=='monster';
  if(model.sourceMode==='monster'&&!$('monster').options.length)monsterChoices();
  $('monster-info').textContent=$('monster').value&&!data.dropsByMonster.get($('monster').value)?.size?'目前沒有這隻怪物的已知掉落資料。':'';
  $('map-info').textContent=model.sourceMode==='map'?(map?`${map.floor?'終末之塔':map.stageId} ${map.stageName}：${map.ids.size} 種已知掉落道具。${map.unknown||!map.ids.size?'掉落資料尚不完整，不代表沒有掉落物。':''} 怪物：${map.monsterNames.join('、')||'尚無點位資料'}`:'請選擇地圖'):'';
  host.querySelectorAll('[data-source]').forEach(b=>{const active=b.dataset.source===model.sourceMode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  $('catalog-panel').setAttribute('aria-labelledby','ae-tab-'+model.sourceMode);
  host.querySelectorAll('[data-file-required]').forEach(b=>b.disabled=!model.meta||model.busy);
  ['open','file'].forEach(id=>$(id).disabled=!$('offline').checked||model.busy);
  ['overwrite','backup','restore'].forEach(id=>$(id).disabled=!model.meta||!$('offline').checked||model.busy);
  $('csv-apply').disabled=model.busy||!model.csv?.valid.length||model.csv.valid.length>251;
  $('save-mode').textContent=window.showOpenFilePicker&&window.showDirectoryPicker?'':'此瀏覽器僅能下載 DATA，無法直接覆蓋原檔。';
  $('filename').textContent=model.meta?model.name:'尚未選擇檔案';
  if($('storage-dialog').open)renderStorage();
 }
 function mapChoices(){
  const prior=$('map').value,q=$('map-query').value;
  const matches=data.maps.filter(m=>S.matches((m.floor?'終末之塔':m.stageId)+' '+m.stageName,q));
  if(q.trim()&&matches.length&&!matches.some(m=>SZO_MAP_CLASS.same(m.stageId,mapScope)))mapScope=SZO_MAP_CLASS.normalize(SZO_MAP_CLASS.get(matches[0].stageId));
  const maps=matches.filter(m=>SZO_MAP_CLASS.same(m.stageId,mapScope));
  $('map-levels').innerHTML=SZO_MAP_CLASS.controls('ae-map',mapScope);
  $('map').innerHTML='<option value="">選擇地圖／樓層</option>'+maps.map(m=>`<option value="${m.key}">${m.floor?'':m.stageId+' '}${E(m.stageName)}</option>`).join('');
  if(maps.some(m=>m.key===prior))$('map').value=prior;
  else if(maps.length===1)$('map').value=maps[0].key;
  model.page=0;model.cat.clear();render();
 }
 function selectedCatalog(){return [...model.cat].map(id=>data.byId.get(id)).filter(Boolean).map(r=>({id:r.id,name:r.name,state:Number($('add-action').value)}));}
 function plan(){return model.config.plans[Number($('plan').value)];}
 function planUI(){const index=$('plan').value||'0';$('plan').innerHTML=model.config.plans.map((p,i)=>`<option value="${i}">${i+1}. ${E(p.name)} (${p.rows.length})</option>`).join('');$('plan').value=index;}
 function previewCSV(result){
  model.csv={...result,plan:Number($('plan').value)};
  $('csv-summary').textContent=`有效 ${result.valid.length} 筆；略過 ${result.issues.length} 筆。${result.valid.length>251?'超過 251 筆，禁止套用。':''}`;
  $('csv-preview').textContent=result.valid.map(r=>`${r.id} ${r.name}：${C.ACTIONS[r.state]}`).join('\n')+'\n'+result.issues.join('\n');
  $('csv-apply').disabled=result.valid.length>251||!result.valid.length;$('csv-dialog').showModal();
 }
 function renderStorage(){
  $('storage-location').textContent=backupDirectory?backupParent:'尚未選擇備份位置';
  $('storage-choose').textContent=backupDirectory?'更換備份位置':'選擇備份位置';
  $('storage-list').hidden=fileOperation!=='restore';
  $('storage-confirm').disabled=model.busy||!backupDirectory||(fileOperation==='restore'&&($('storage-list').value===''||!backupList[Number($('storage-list').value)]));
 }
 async function refreshBackups(){
  backupList=[];$('storage-list').innerHTML='<option value="">選擇備份時間</option>';
  if(fileOperation==='restore'&&backupDirectory){
   backupList=await S.listBackups(backupDirectory,model.name);
   $('storage-list').innerHTML='<option value="">選擇備份時間</option>'+backupList.map((b,i)=>`<option value="${i}">${E(new Date(b.time).toLocaleString('zh-TW',{hour12:false}))} · ${E(b.name)}</option>`).join('');
   $('storage-message').textContent=backupList.length?'選擇要還原的備份時間，再按確認還原。':'此資料夾尚無這個角色的備份。';
  }
  renderStorage();
 }
 async function beginOperation(kind){
  requireOffline();requireFile();
  if(!model.handle||!window.showDirectoryPicker){
   if(kind==='save')return saveOriginal();
   if(kind==='restore'){$('restore-file').click();return;}
   download(model.meta.source,model.name.replace(/\.data$/i,'')+'_backup_'+Date.now()+'.data');status('DATA 備份已交給瀏覽器下載，請確認下載完成；原檔未變更');return;
  }
  fileOperation=kind;
  $('storage-title').textContent=kind==='restore'?'還原 DATA 資料':kind==='backup'?'備份 DATA 資料':'儲存並覆蓋遊戲 DATA';
  $('storage-confirm').textContent=kind==='restore'?'確認還原':kind==='backup'?'確認備份':'確認覆蓋遊戲 DATA';
  $('storage-message').textContent=kind==='backup'?'將備份目前 DATA，不修改原檔。':'覆蓋前會自動備份目前 DATA。';
  $('storage-dialog').showModal();await refreshBackups();
 }
 async function saveOriginal(restoreBytes=null){
  requireOffline();requireFile();
  $('backup-result').textContent='';
  const out=restoreBytes||C.serialize(model.meta,model.rows);
  if(!model.handle||!window.showDirectoryPicker){
   download(out,model.name.replace(/\.data$/i,'')+(restoreBytes?'_restored.data':'_edited.data'));
   status('DATA 已交給瀏覽器下載，尚未覆蓋遊戲原檔。請確認下載完成後，備份並手動替換原檔。');return;
  }
  if(!backupDirectory)throw Error('請先選擇備份位置，未覆蓋 DATA');
  status('正在備份與儲存 DATA，請先不要開啟角色');
  const backup=await S.backupAndWrite(model.handle,backupDirectory,model.meta.source,out);
  model.meta=C.parse(out);model.rows=model.meta.arr.map(r=>({...r,id:data.byName.get(r.name)?.id||''}));model.dirty=false;
  status(restoreBytes?'已完成 DATA 資料還原，可安心開啟角色。':'已完成物品清單覆蓋，可安心開啟角色。');
  $('backup-result').textContent=`本次備份：${backup}`;
 }
 function bind(){
  const on=(id,fn)=>$(id).onclick=()=>run(fn);
  $('offline').onchange=render;
  $('file').onchange=()=>run(async()=>{const f=$('file').files[0];if(f)await load(f);$('file').value='';});
  on('open',async()=>{requireOffline();if(!window.showOpenFilePicker){$('file').click();return;}const [handle]=await showOpenFilePicker({types:[{description:'角色物品設定',accept:{'application/octet-stream':['.data']}}],multiple:false});await load(await handle.getFile(),handle);});
  on('backup',()=>beginOperation('backup'));
  on('overwrite',()=>beginOperation('save'));
  on('restore',()=>beginOperation('restore'));
  // The picker is invoked directly by this click, before parsing or confirmation dialogs.
  on('storage-choose',async()=>{
   requireOffline();
   const parent=await showDirectoryPicker({mode:'readwrite',id:'szo-autodata-backups'});
   // Selecting the existing backup folder must not create another nested copy.
   const isBackupFolder=parent.name.toLowerCase()==='szo_autodata_backups';
   const directory=isBackupFolder?parent:await parent.getDirectoryHandle('SZO_AutoData_Backups',{create:true});
   backupDirectory=directory;backupParent=isBackupFolder?parent.name:`${parent.name} / SZO_AutoData_Backups`;
   $('storage-message').textContent='備份資料夾已就緒。';await refreshBackups();
  });
  $('storage-list').onchange=()=>{renderStorage();const b=backupList[Number($('storage-list').value)];$('storage-message').textContent=b&&$('storage-list').value!==''?`將還原 ${new Date(b.time).toLocaleString('zh-TW',{hour12:false})} 的備份；還原前會先備份目前 DATA。`:'請選擇備份時間';};
  $('storage-cancel').onclick=()=>$('storage-dialog').close();
  on('storage-confirm',async()=>{
   requireOffline();requireFile();
   // Request source write access while still handling the explicit confirmation click.
   if(fileOperation!=='backup'&&model.handle.requestPermission&&await model.handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('未取得 DATA 寫入權限，未覆蓋原檔');
   if(fileOperation==='backup'){
    const name=await S.createBackup(model.handle,backupDirectory,model.meta.source);
    status('DATA 備份完成，原檔未變更');$('backup-result').textContent=`本次備份：${name}`;
   }else if(fileOperation==='restore'){
    const selected=$('storage-list').value,b=backupList[Number(selected)];if(selected===''||!b)throw Error('請選擇備份時間');
    const bytes=await S.bytes(b.handle);
    if(!S.canRestore(model.meta.source,bytes))throw Error('備份的其他角色設定不同，禁止還原；請確認是否同一角色版本');
    await saveOriginal(bytes);
   }else await saveOriginal();
   $('storage-dialog').close();
  });
  $('restore-file').onchange=()=>run(async()=>{const f=$('restore-file').files[0];if(!f)return;const b=new Uint8Array(await f.arrayBuffer());if(!S.canRestore(model.meta.source,b))throw Error('備份的其他角色設定不同，禁止還原到此檔案；請確認是否同一角色版本');await saveOriginal(b);$('restore-file').value='';});
  ['query','row-query'].forEach(id=>$(id).oninput=()=>{model.page=0;model.cat.clear();render();});
  ['map','monster','fuzzy'].forEach(id=>$(id).onchange=()=>{model.page=0;model.cat.clear();model.anchor.cat=null;render();});
  $('monster-query').oninput=()=>{monsterChoices();$('monster').onchange();};
  host.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{model.sourceMode=b.dataset.source;model.page=0;model.cat.clear();model.anchor.cat=null;render();});
  host.querySelectorAll('[data-source]').forEach((b,i)=>b.onkeydown=e=>{const tabs=[...host.querySelectorAll('[data-source]')];let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();tabs[next].click();tabs[next].focus();});
  $('map-query').oninput=mapChoices;
  $('map-levels').onchange=event=>{
   const kind=event.target.id.match(/^ae-map(Category|Group|Series)Select$/)?.[1];
   if(!kind)return;
   mapScope=SZO_MAP_CLASS.change(mapScope,kind,event.target.value);
   $('map-query').value='';$('map').value='';mapChoices();
  };
  on('prev',()=>{model.page=Math.max(0,model.page-1);model.anchor.cat=null;});on('next',()=>{model.page++;model.anchor.cat=null;});
  on('select-catalog',()=>{catalogRows().slice(model.page*100,model.page*100+100).forEach(r=>model.cat.add(r.id));});
  on('unselect-catalog',()=>model.cat.clear());on('add',()=>{const r=selectedCatalog();if(!r.length)throw Error('請先選取道具');mergeRows(r);});
  on('replace-row',()=>{const r=selectedCatalog();if(r.length!==1||model.selected.size!==1)throw Error('請各選取一筆資料庫道具及角色清單項目');const index=[...model.selected][0];if(model.rows.some((x,i)=>i!==index&&x.name===r[0].name))throw Error('已有相同道具');warn(r);changed(model.rows.map((x,i)=>i===index?{...r[0],state:x.state}:x));});
  on('favorite-add',async()=>{model.config.favorites=[...new Set([...model.config.favorites,...model.cat])];await persist();});
  on('favorite-remove',async()=>{model.config.favorites=model.config.favorites.filter(id=>!model.cat.has(id));model.config.discard=model.config.discard.filter(r=>!model.cat.has(r.id));await persist();});
  on('select-rows',()=>model.rows.forEach((r,i)=>{if(S.matches(r.name+' '+r.id,$('row-query').value))model.selected.add(i);}));on('unselect-rows',()=>model.selected.clear());
  on('batch-action',()=>changed(model.rows.map((r,i)=>model.selected.has(i)?{...r,state:Number($('row-action').value)}:r)));
  on('delete',()=>{requireFile();if(model.selected.size&&ask(`刪除選取的 ${model.selected.size} 筆？`))changed(model.rows.filter((_,i)=>!model.selected.has(i)));});
  on('clear',()=>{requireFile();if(ask('確定清空角色的全部物品處理清單？')&&ask('再次確認：全部道具設定將移除，儲存前仍不影響原檔。'))changed([]);});
  $('plan').onchange=planUI;
  on('plan-rename',async()=>{const input=prompt(tr('自訂方案名稱（最多 40 字）'),plan().name);if(input===null)return;const name=input.trim();if(!name||name.length>40)throw Error('方案名稱需為 1～40 字');plan().name=name;await persist();planUI();});
  on('plan-save',async()=>{requireFile();if(plan().rows.length&&!ask('覆蓋這個方案？'))return;plan().rows=clean(model.rows);await persist();planUI();});
  on('plan-load',()=>{if(!ask('以選取的自訂方案取代目前清單？尚不會覆蓋 DATA。'))return;mergeRows(plan().rows,true);});
  $('warning').onchange=()=>run(async()=>{model.config.warn=$('warning').checked;await persist();});
  on('csv-export',()=>download(C.csv(plan().rows),plan().name.replace(/[\\/:*?"<>|]/g,'_')+'.csv','text/csv;charset=utf-8'));
  on('csv-import',()=>$('csv-file').click());
  $('csv-file').onchange=()=>run(async()=>{const f=$('csv-file').files[0];if(f)previewCSV(C.importCSV(await f.text(),data.byId));$('csv-file').value='';});
  $('csv-cancel').onclick=()=>$('csv-dialog').close();
  $('csv-apply').onclick=()=>run(async()=>{
   const p=model.csv;if(!p||p.valid.length>251||!p.valid.length)throw Error('沒有可安全套用的 CSV 清單');
   if(!ask(`以 CSV 取代「${model.config.plans[p.plan].name}」自訂方案？`))return;
   model.config.plans[p.plan].rows=C.merge([],p.valid,true).rows;
   await persist();planUI();status('已讀取自訂方案，按「套用方案」可放入目前清單');
   $('csv-dialog').close();
  });
 }
 window.renderAutoDataPage=async function(){
  if(!document.getElementById('autodata-style')){const link=document.createElement('link');link.id='autodata-style';link.rel='stylesheet';link.href='css/autodata.css?v='+encodeURIComponent(document.body.dataset.version);document.head.append(link);}
  host=document.createElement('section');host.className='ae-page';host.setAttribute('aria-label','離線內掛物品編輯');
  document.getElementById('reader').replaceChildren(host);
  // Mobile visitors do not load the database or receive save-file controls.
  if(window.matchMedia('(max-width: 767px)').matches||/Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)){
   host.innerHTML='<h1>離線內掛物品編輯</h1><p class="ae-notice">請使用電腦端操作</p>';
   return;
  }
  host.innerHTML=`<h1>離線內掛物品編輯</h1>
   <p class="ae-notice">請先登出至角色選擇頁面再使用。角色不可在線上，才能讀取與覆蓋 SAVE。存檔只在本機處理，不會上傳。</p>
   <label><input id="ae-offline" type="checkbox">我已登出至角色選擇頁面，角色不在線上</label>
   <div class="ae-toolbar"><button id="ae-open" disabled>上傳檔案</button><input id="ae-file" type="file" accept=".data" hidden disabled><span id="ae-filename">尚未選擇檔案</span></div>
   <p>請上傳ID_角色名稱_3.data檔案（不是 _0.data）</p>
   <div class="ae-toolbar"><button id="ae-backup" data-file-required>備份 DATA 資料</button><button id="ae-restore" data-file-required>還原 DATA 資料</button><input id="ae-restore-file" type="file" accept=".data" hidden></div>
   <p id="ae-save-mode"></p><p id="ae-message" role="status" aria-live="polite">正在載入道具資料…</p><p id="ae-backup-result" class="ae-muted"></p>
   <div class="ae-columns"><section><h2>道具資料庫</h2>
    <div class="ae-tabs" role="tablist" aria-label="道具篩選"><button id="ae-tab-all" role="tab" data-source="all" aria-selected="true" aria-controls="ae-catalog-panel">全部道具</button><button id="ae-tab-monster" role="tab" data-source="monster" aria-selected="false" aria-controls="ae-catalog-panel">怪物篩選</button><button id="ae-tab-map" role="tab" data-source="map" aria-selected="false" aria-controls="ae-catalog-panel">地圖篩選</button><button id="ae-tab-common" role="tab" data-source="common" aria-selected="false" aria-controls="ae-catalog-panel">常用清單篩選</button></div>
    <div id="ae-catalog-panel" role="tabpanel" aria-labelledby="ae-tab-all">
    <div id="ae-monster-tools" hidden><input id="ae-monster-query" aria-label="搜尋怪物名稱或 ID" placeholder="搜尋怪物名稱或 ID"><select id="ae-monster" aria-label="選擇怪物"></select><span id="ae-monster-info"></span></div>
    <div id="ae-map-tools" hidden><div id="ae-map-levels" class="ae-map-levels"></div><input id="ae-map-query" aria-label="地圖編號或名稱" placeholder="地圖編號、名稱或樓層"><select id="ae-map" aria-label="地圖"></select></div><p id="ae-map-info"></p>
    <div class="ae-toolbar"><input id="ae-query" aria-label="道具 ID 或名稱" placeholder="道具 ID 或名稱"></div><div class="ae-toolbar ae-search-options"><label><input id="ae-fuzzy" type="checkbox" checked>模糊搜尋</label><label><input id="ae-warning" type="checkbox">加入高價道具時提醒（超過 50 萬）</label></div><div class="ae-toolbar"><button id="ae-select-catalog">選取本頁</button><button id="ae-unselect-catalog">取消選取</button><button id="ae-favorite-add">★ 加入常用</button><button id="ae-favorite-remove">☆ 移除常用</button></div>
    <div class="ae-scroll"><table><thead><tr><th>選取</th><th>最愛</th><th>道具</th><th>單價</th></tr></thead><tbody id="ae-catalog"></tbody></table></div>
    <div class="ae-toolbar"><button id="ae-prev" title="上一頁" aria-label="上一頁">←</button><span id="ae-catalog-count"></span><button id="ae-next" title="下一頁" aria-label="下一頁">→</button></div>
    <div class="ae-toolbar"><select id="ae-add-action" aria-label="新增處理方式">${actionOptions}</select><button id="ae-add" data-file-required>加入選取道具</button><button id="ae-replace-row" data-file-required>替換選取的單筆道具</button></div>
    </div>
   </section><section><h2>角色物品處理清單</h2><p id="ae-row-count"></p><input id="ae-row-query" aria-label="搜尋角色清單" placeholder="搜尋角色清單">
    <div class="ae-toolbar"><button id="ae-select-rows">全選</button><button id="ae-unselect-rows">取消選取</button><button id="ae-delete" data-file-required>刪除選取</button><button id="ae-clear" data-file-required>清空全部</button></div>
    <div class="ae-scroll"><table><thead><tr><th>選取</th><th>道具</th><th>處理方式</th><th>刪除</th></tr></thead><tbody id="ae-rows"></tbody></table></div>
    <div class="ae-toolbar"><select id="ae-row-action" aria-label="批次處理方式">${actionOptions}</select><button id="ae-batch-action" data-file-required>批次設定</button></div>
    <div class="ae-save"><button id="ae-overwrite" data-file-required>儲存並覆蓋遊戲 DATA</button><p id="ae-save-result"></p></div>
   </section></div>
   <section class="ae-band"><h2>自訂方案 <small>最多五組</small></h2><div class="ae-toolbar"><select id="ae-plan" aria-label="自訂方案"></select><button id="ae-plan-rename">重新命名</button><button id="ae-plan-save" data-file-required>儲存目前清單</button><button id="ae-plan-load" data-file-required>套用方案</button><button id="ae-csv-export">下載自訂方案（CSV）</button><button id="ae-csv-import">讀取自訂方案（CSV）</button><input id="ae-csv-file" type="file" accept=".csv" hidden></div></section>
   <dialog id="ae-storage-dialog"><h2 id="ae-storage-title"></h2><p id="ae-storage-location"></p><button id="ae-storage-choose">選擇備份位置</button><p id="ae-storage-message" role="status"></p><select id="ae-storage-list" aria-label="備份時間" hidden></select><div class="ae-toolbar"><button id="ae-storage-confirm" disabled>確認儲存</button><button id="ae-storage-cancel">取消</button></div></dialog>
   <dialog id="ae-csv-dialog"><h2>讀取自訂方案</h2><p id="ae-csv-summary"></p><div id="ae-csv-preview" class="ae-preview"></div><button id="ae-csv-apply">讀取至選取方案</button><button id="ae-csv-cancel">取消</button></dialog>`;
  try{data=await S.loadData();try{model.config=await S.readSettings();status('道具資料已載入，請選擇角色 _3.data');}catch(e){status(e.message+'；仍可編輯與下載，方案請使用 CSV 備份');}
   $('warning').checked=model.config.warn;planUI();mapChoices();bind();render();
  }catch(e){status(e.message);host.querySelectorAll('button').forEach(b=>b.disabled=true);}
 };
 window.addEventListener('beforeunload',e=>{if(model.dirty){e.preventDefault();e.returnValue='';}});
})();

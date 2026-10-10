(function(){
 const key='sihai-equipment-compare-v1',slots=['A','B','C'];
 let dialog,onlyDifferences=false,memory;
 const eligible=it=>{const r=window.SZO_EQUIPMENT_TAXONOMY?.byId[it?.ID];return r&&r.category!=='其他道具';};
 function read(){
  if(memory)return memory;
  try{const value=JSON.parse(localStorage.getItem(key)||'{}');return Object.fromEntries(slots.map(s=>[s,typeof value?.[s]==='string'?value[s]:'']));}catch{return {};}
 }
 function persist(data){try{localStorage.setItem(key,JSON.stringify(data));memory=null;return true;}catch{memory=data;return false;}}
 function toolbar(it){
  if(!eligible(it))return '';
  return `<section class="equipmentCompareTools" aria-label="裝備比較存檔"><strong>裝備比較</strong><div>${slots.map(s=>`<button type="button" data-equipment-save="${s}" data-equipment-id="${esc(it.ID)}">存入 ${s}</button>`).join('')}<button type="button" data-equipment-compare>開啟比較</button></div><span class="equipmentSaveFeedback" role="status"></span></section>`;
 }
 function item(id){return (window.items||[]).find(it=>String(it.ID)===id);}
 function render(){
  const saved=read(),entries=slots.map(s=>item(saved[s])),maps=entries.map(it=>new Map(it?itemDetailRows(it).filter(([label,value])=>label!==SZO_DISPLAY.label('Name')&&String(value??'').trim()!==''&&String(value)!=='0'):[]));
  const labels=[...new Set(maps.flatMap(m=>[...m.keys()]))];
  const body=labels.map(label=>{
   const values=maps.map(m=>m.get(label)??'-'),present=entries.map((it,i)=>it?values[i]:null).filter(v=>v!==null),different=new Set(present).size>1;
   if(onlyDifferences&&!different)return '';
   return `<tr${different?' class="equipmentDifference"':''}><th scope="row">${esc(label)}</th>${values.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`;
  }).join('');
  const notes=entries.map(it=>it?itemApprovedStatusHTML(it):'');
  const notesDiffer=new Set(notes.filter((n,i)=>entries[i])).size>1;
  const descriptions=notes.some(Boolean)&&(!onlyDifferences||notesDiffer)?`<tr><th scope="row">特殊能力說明</th>${notes.map(n=>`<td>${n||'-'}</td>`).join('')}</tr>`:'';
  dialog.innerHTML=`<header><h2>裝備比較</h2><button type="button" data-equipment-close aria-label="關閉裝備比較" title="關閉">×</button></header><label class="equipmentDifferenceToggle"><input type="checkbox" data-equipment-differences ${onlyDifferences?'checked':''}>只看差異</label><div class="equipmentCompareScroll"><table><thead><tr><th scope="col">欄位</th>${slots.map((s,i)=>`<th scope="col"><div class="equipmentSlotTitle">${s}<button type="button" data-equipment-clear="${s}" aria-label="清除 ${s}" title="清除 ${s}" ${saved[s]?'':'disabled'}>×</button></div>${entries[i]?`${itemThumbHTML(entries[i])}<div>${esc(nameOf(entries[i]))}</div>`:`<div>${saved[s]?'道具已不存在':'尚未存檔'}</div>`}</th>`).join('')}</tr></thead><tbody>${body}${descriptions}${!body&&!descriptions?'<tr><td colspan="4">'+(entries.some(Boolean)?'沒有差異':'尚未存入裝備')+'</td></tr>':''}</tbody></table></div>`;
 }
 async function open(){
  window.SZO_ITEM_FILTER_SEARCH?.close();
  if(typeof ensureItemDataLoaded==='function')await ensureItemDataLoaded();
  if(typeof ensureItemOptionalData==='function')await ensureItemOptionalData('');
  if(!dialog){dialog=document.createElement('dialog');dialog.className='equipmentCompareDialog';dialog.setAttribute('aria-label','裝備比較');document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
  render();if(!dialog.open)dialog.showModal();
 }
 document.addEventListener('click',e=>{
  const save=e.target.closest('[data-equipment-save]');
  if(save){const slot=save.dataset.equipmentSave,it=item(save.dataset.equipmentId);if(!slots.includes(slot)||!eligible(it))return;const saved=read();saved[slot]=String(it.ID);const stored=persist(saved);save.closest('.equipmentCompareTools').querySelector('.equipmentSaveFeedback').textContent=`已存入 ${slot}：${nameOf(it)}${stored?'':'（瀏覽器無法儲存，僅本次有效）'}`;return;}
  if(e.target.closest('[data-equipment-compare]')){open().catch(()=>alert('裝備資料載入失敗，請稍後再試。'));return;}
  if(e.target.closest('[data-equipment-close]')){dialog?.close();return;}
  const clear=e.target.closest('[data-equipment-clear]');if(clear&&slots.includes(clear.dataset.equipmentClear)){const saved=read();delete saved[clear.dataset.equipmentClear];persist(saved);render();}
 });
 document.addEventListener('change',e=>{if(e.target.matches('[data-equipment-differences]')){onlyDifferences=e.target.checked;render();dialog.querySelector('[data-equipment-differences]').focus();}});
 window.addEventListener('storage',e=>{if(e.key===key){memory=null;if(dialog?.open)render();}});
 window.SZO_EQUIPMENT_COMPARE={toolbar,open};
})();

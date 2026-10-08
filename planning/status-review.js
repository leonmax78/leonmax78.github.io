(function(){
 'use strict';
 const $=id=>document.getElementById(id),KEY='sihai-status-review-v1',SIZE=12;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let entries=[],draft={},page=0;
 if(new URLSearchParams(location.search).has('embedded')){document.querySelector('header').hidden=true;$('export').hidden=true;}
 const current=e=>draft[e.id]||{description:e.description,approved:false};
 function save(){try{localStorage.setItem(KEY,JSON.stringify(draft));$('save').textContent='草稿已儲存在此瀏覽器';}catch(e){$('save').textContent='無法儲存，請匯出備份';}}
 function counts(){ $('count').textContent=`${entries.length} 個狀態 · 已確認 ${entries.filter(e=>current(e).approved).length}`; }
 function render(){
  const q=$('search').value.trim().toLowerCase(),filter=$('filter').value;
  const list=entries.filter(e=>`${e.id} ${e.name} ${current(e).description} ${e.items.map(i=>i.id+' '+i.name).join(' ')}`.toLowerCase().includes(q)).filter(e=>filter==='all'||filter==='pending'&&!current(e).approved||filter==='approved'&&current(e).approved||filter==='uncertain'&&current(e).description.includes('待確認'));
  const pages=Math.max(1,Math.ceil(list.length/SIZE));page=Math.min(page,pages-1);
  $('entries').innerHTML=list.slice(page*SIZE,(page+1)*SIZE).map(e=>{
   const d=current(e);return `<section class="statusEntry ${d.approved?'approved':''}" data-entry="${e.id}"><div><h2>${esc(e.name)} <small>STATUS ${e.id}</small></h2><code>Group: ${esc(e.raw.Group??'未填')} / Order: ${esc(e.raw.Order??'未填')}<br>Param1: ${esc(e.raw.Param1??'未填')} / Param2: ${esc(e.raw.Param2??'未填')}</code><p class="note">${e.basis==='pending'?'參數意義尚待核實':'依參數／道具原文整理，待人工確認'}</p></div><div><label><input type="checkbox" data-approve="${e.id}" ${d.approved?'checked':''}>確認採用此說明</label><textarea data-description="${e.id}" maxlength="10000" aria-label="${esc(e.name)} ${e.id} 說明">${esc(d.description)}</textarea></div><details><summary>相關道具與原始說明（${e.items.length} 筆）</summary><ul>${e.items.map(i=>`<li><strong>${esc(i.id)} ${esc(i.name)}</strong><small>${esc(i.mode)}${i.mode.includes('EFFECT_REMOVE')?' · 此道具為解除狀態，不是賦予效果':''}${i.probability?' · StatusProb='+esc(i.probability):''}</small><p>${esc(i.help||'未提供道具說明')}</p></li>`).join('')}</ul></details></section>`;
  }).join('')||'<p>沒有符合的狀態</p>';
  $('pageCount').textContent=`${page+1} / ${pages} 頁 · ${list.length} 筆`;$('prev').disabled=!page;$('next').disabled=page>=pages-1;counts();
 }
 function validate(rows){
  if(!Array.isArray(rows))throw Error('缺少狀態清單');
  const result={},known=new Set(entries.map(e=>e.id));
  for(const r of rows){if(!r||!known.has(String(r.id))||typeof r.description!=='string'||r.description.length>10000||typeof r.approved!=='boolean'||Object.hasOwn(result,String(r.id)))throw Error('狀態 ID 或說明格式不正確');if(r.approved&&!r.description.trim())throw Error('已確認的說明不能留空');result[String(r.id)]={description:r.description,approved:r.approved};}return result;
 }
 document.addEventListener('input',e=>{const id=e.target.dataset.description;if(!id)return;draft[id]={description:e.target.value,approved:false};const box=$('entries').querySelector(`[data-approve="${id}"]`);box.checked=false;save();counts();});
 document.addEventListener('change',e=>{const id=e.target.dataset.approve;if(!id)return;const value=current(entries.find(x=>x.id===id));if(e.target.checked&&!value.description.trim()){e.target.checked=false;$('error').textContent='說明不能留空';return;}draft[id]={...value,approved:e.target.checked};save();counts();});
 $('search').oninput=()=>{page=0;render();};$('filter').onchange=()=>{page=0;render();};$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
 $('export').onclick=()=>{const result={schemaVersion:1,kind:'sihai-status-review',baseVersion:'V577',status:'draft-not-applied',createdAt:new Date().toISOString(),entries:entries.map(e=>({id:e.id,name:e.name,source:e.raw,...current(e)}))};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='四海同舟-特殊能力說明確認.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('import').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;const data=JSON.parse(await file.text());if(!['sihai-status-review','sihai-display-review'].includes(data.kind)||data.schemaVersion!==1)throw Error('不是特殊能力說明確認檔');const next=validate(data.kind==='sihai-display-review'?data.statusReviews:data.entries);if(Object.keys(draft).length&&!confirm('匯入將覆蓋相同狀態的本機草稿，是否繼續？'))return;draft={...draft,...next};save();render();$('error').textContent='';}catch(e){$('error').textContent='匯入失敗：'+e.message;}finally{$('file').value='';}};
 (async()=>{try{const response=await fetch('status-review.json');if(!response.ok)throw Error('清單載入失敗');entries=(await response.json()).entries;try{const stored=JSON.parse(localStorage.getItem(KEY)||'{}');draft=validate(Object.entries(stored).map(([id,d])=>({id,...d})));}catch(e){$('error').textContent='本機草稿格式異常，未覆蓋原草稿。';}render();}catch(e){$('error').textContent=e.message;}})();
})();

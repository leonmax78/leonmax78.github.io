(function(){
  'use strict';
  const $=id=>document.getElementById(id), D=window.SZO_DISPLAY;
  const KEY='sihai-item-field-draft-v1', PAGE_SIZE=30;
  let fields=[],draft={fields:{},values:{}},active=null,rawData=null,page=0,shared=false,request=0;
  const cache=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fieldDraft=k=>draft.fields[k]||{};
  const fieldLabel=k=>fieldDraft(k).label??D.label(k);
  const isVisible=f=>fieldDraft(f.key).visible??f.visible;
  const isChanged=f=>fieldLabel(f.key)!==D.label(f.key)||isVisible(f)!==f.visible||Object.keys(draft.values[f.key]||{}).length>0;
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(draft));$('save').textContent='草稿已儲存在此瀏覽器';}
    catch(e){$('save').textContent='無法儲存本機草稿，請匯出保留';}
  }
  function validateStored(raw){
    if(!raw||typeof raw!=='object')return;
    for(const [key,value] of Object.entries(raw.fields||{})){
      if(!Object.hasOwn(D.fields,key)||!value||typeof value!=='object')continue;
      draft.fields[key]={};
      if(typeof value.visible==='boolean')draft.fields[key].visible=value.visible;
      if(typeof value.label==='string')draft.fields[key].label=value.label.slice(0,120);
    }
    for(const [key,values] of Object.entries(raw.values||{})){
      if(!Object.hasOwn(D.fields,key)||!values||typeof values!=='object')continue;
      draft.values[key]={};
      for(const [value,text] of Object.entries(values))if(typeof text==='string')draft.values[key][value]=text.slice(0,1000);
    }
  }
  function stats(){
    $('count').textContent=`${fields.length} 個 ITEM 欄位 · 勾選顯示 ${fields.filter(isVisible).length} · 已修改 ${fields.filter(isChanged).length}`;
  }
  function render(){
    const q=$('search').value.trim().toLowerCase(),filter=$('filter').value;
    const list=fields.filter(f=>(f.key+' '+fieldLabel(f.key)).toLowerCase().includes(q)).filter(f=>filter==='all'||filter==='on'&&isVisible(f)||filter==='off'&&!isVisible(f)||filter==='changed'&&isChanged(f));
    $('rows').innerHTML=list.map(f=>`<tr class="${isChanged(f)?'changed':''}"><td><input type="checkbox" data-visible="${f.key}" aria-label="顯示${esc(fieldLabel(f.key))}" ${isVisible(f)?'checked':''}></td><td><code>${f.key}</code><small>目前${f.visible?'顯示':'隱藏'}${f.key==='Icon'?'（圖片）':''}</small></td><td><input type="text" maxlength="120" data-label="${f.key}" aria-label="${f.key}中文名稱" value="${esc(fieldLabel(f.key))}"></td><td>${f.present.toLocaleString()}</td><td><button type="button" data-values="${f.key}">值對照（${f.distinct.toLocaleString()}）</button>${f.tokens?`<small>${f.tokens} 個拆分代碼</small>`:''}</td></tr>`).join('')||'<tr><td colspan="5">沒有符合的欄位</td></tr>';
    $('sharedRows').innerHTML=Object.keys(D.fields).filter(k=>(k+' '+fieldLabel(k)+' '+Object.keys(D.aliases).filter(a=>D.aliases[a]===k).join(' ')).toLowerCase().includes(q)).map(k=>`<tr><td><code>${k}</code></td><td><input type="text" maxlength="120" data-label="${k}" aria-label="${k}中文名稱" value="${esc(fieldLabel(k))}"></td><td>${esc(Object.keys(D.aliases).filter(a=>D.aliases[a]===k).join('、')||'—')}</td></tr>`).join('');
    stats();
  }
  function currentValue(key,raw){
    if(key==='Type')return ITEM_TYPE_MAP[raw]||'';
    if(key==='Kind')return RACE_MAP[raw.toLowerCase()]||'';
    if(key==='ExtraStatus')return rawData?.currentMappings?.[raw]||'';
    return D.values[key]?.[raw]||'';
  }
  function meaning(raw){return draft.values[active]?.[raw]??currentValue(active,raw);}
  function renderValues(){
    if(!rawData)return;
    const q=$('valueSearch').value.toLowerCase().trim(),mode=$('valueMode').value;
    const all=(rawData[mode]||[]).filter(v=>(v.raw+' '+meaning(v.raw)+' '+(v.examples||[]).map(e=>e.id+' '+e.name).join(' ')).toLowerCase().includes(q));
    const pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));page=Math.min(page,pages-1);
    $('valueRows').innerHTML=all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map((v,i)=>`<tr><td><div class="rawValue">${esc(v.raw||'（空字串）')}</div><small>${v.count.toLocaleString()} 筆</small></td><td>${esc(currentValue(active,v.raw)||'未建立值對照')}</td><td><input type="text" maxlength="1000" data-value-index="${i}" aria-label="原值${esc(v.raw.slice(0,40))}的中文對照" placeholder="待確認／保留原值" value="${esc(meaning(v.raw))}"></td><td>${(v.examples||[]).map(e=>`<small>${esc(e.id)} ${esc(e.name)}</small>`).join('')||'拆分代碼'}</td></tr>`).join('')||'<tr><td colspan="4">沒有符合的原值</td></tr>';
    $('valueRows')._values=all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
    $('pageCount').textContent=`${page+1} / ${pages} 頁 · ${all.length.toLocaleString()} 個值`;
    $('prev').disabled=page===0;$('next').disabled=page>=pages-1;
  }
  async function openValues(key){
    const token=++request;active=key;rawData=null;page=0;
    $('valuesTitle').textContent=key+' · '+fieldLabel(key);
    $('valuesNote').textContent='完整原值保留原始內容；旗標可切換成拆分代碼。未建立對照不代表數值無效。';
    $('valueSearch').value='';$('valueMode').value='values';$('valueRows').innerHTML='<tr><td colspan="4">載入中</td></tr>';
    $('prev').disabled=true;$('next').disabled=true;$('valuesDialog').showModal();
    try{
      if(!cache.has(key)){
        const res=await fetch(fields.find(f=>f.key===key).data);if(!res.ok)throw Error('HTTP '+res.status);
        cache.set(key,await res.json());
      }
      if(token!==request)return;
      rawData=cache.get(key);$('valueMode').options[1].disabled=!rawData.tokens.length;renderValues();
    }catch(e){if(token===request)$('valueRows').innerHTML='<tr><td colspan="4">原值載入失敗，請關閉後重試。</td></tr>';}
  }
  document.addEventListener('input',e=>{
    const k=e.target.dataset.label;
    if(k){draft.fields[k]={...fieldDraft(k),label:e.target.value};save();stats();}
    const index=e.target.dataset.valueIndex;
    if(index!==undefined&&active){
      const raw=$('valueRows')._values[Number(index)].raw;
      draft.values[active]??={};
      if(e.target.value===currentValue(active,raw))delete draft.values[active][raw];
      else draft.values[active][raw]=e.target.value;
      save();stats();
    }
  });
  document.addEventListener('change',e=>{const k=e.target.dataset.visible;if(k){draft.fields[k]={...fieldDraft(k),visible:e.target.checked};save();render();}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-values]');if(b)openValues(b.dataset.values);});
  $('search').addEventListener('input',render);$('filter').addEventListener('change',render);
  $('valueSearch').addEventListener('input',()=>{page=0;renderValues();});$('valueMode').addEventListener('change',()=>{page=0;renderValues();});
  $('prev').onclick=()=>{page--;renderValues();};$('next').onclick=()=>{page++;renderValues();};
  $('closeValues').onclick=()=>$('valuesDialog').close();$('valuesDialog').addEventListener('close',()=>{request++;render();});
  function switchTab(value){shared=value;$('items').hidden=shared;$('shared').hidden=!shared;$('itemTab').setAttribute('aria-pressed',String(!shared));$('sharedTab').setAttribute('aria-pressed',String(shared));$('filter').disabled=shared;render();}
  $('itemTab').onclick=()=>switchTab(false);$('sharedTab').onclick=()=>switchTab(true);
  $('reset').onclick=()=>{if(confirm('還原目前網站設定，並清除本次草稿？')){draft={fields:{},values:{}};save();render();}};
  $('export').onclick=()=>{
    if(Object.keys(D.fields).some(k=>!fieldLabel(k).trim())){alert('中文名稱不能留空，請補上名稱後再匯出。');return;}
    const result={schemaVersion:1,kind:'sihai-display-review',baseVersion:'V568',createdAt:new Date().toISOString(),status:'draft-not-applied',
      fields:fields.map(f=>({key:f.key,label:fieldLabel(f.key),visible:isVisible(f)})),
      sharedLabels:Object.fromEntries(Object.keys(D.fields).map(k=>[k,fieldLabel(k)])),
      confirmedValueChanges:draft.values,existingValueMappings:{...D.values,Type:ITEM_TYPE_MAP}};
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='四海同舟-欄位與中文對照確認.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('save').textContent='已匯出草稿；尚未套用正式站';
  };
  $('copy').onclick=async()=>{
    const lines=['四海同舟欄位／翻譯修改草稿'];
    fields.filter(isChanged).forEach(f=>lines.push(`${isVisible(f)?'顯示':'隱藏'} ${f.key} → ${fieldLabel(f.key)}`));
    Object.entries(draft.fields).filter(([k])=>!fields.some(f=>f.key===k)).forEach(([k])=>lines.push(`${k} → ${fieldLabel(k)}`));
    Object.entries(draft.values).forEach(([k,values])=>Object.entries(values).forEach(([v,t])=>lines.push(`${k}：${v} → ${t||'保留原值'}`)));
    try{await navigator.clipboard.writeText(lines.join('\n'));$('save').textContent='變更摘要已複製';}catch(e){$('save').textContent='無法使用剪貼簿，請改用匯出確認清單';}
  };
  (async()=>{
    try{
      const res=await fetch('item-fields.json');if(!res.ok)throw Error('HTTP '+res.status);fields=(await res.json()).fields;
      try{validateStored(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(e){}
      render();
    }catch(e){$('error').textContent='清單載入失敗，請重新整理。';$('count').textContent='載入失敗';}
  })();
})();

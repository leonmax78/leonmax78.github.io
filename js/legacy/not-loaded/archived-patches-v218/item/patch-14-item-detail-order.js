/* v88as 道具完整能力 + 攻速翻譯 + 道具/合成隱藏攻擊距離 + 保留 ITEM 原始排序 */
(function(){
  function _esc(x){ return (typeof esc==='function') ? esc(x) : String(x??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
  function _fmt(x){ return (typeof fmt==='function') ? fmt(x) : String(x??''); }
  function hasVal(v){ return v!==undefined && v!==null && String(v).trim()!=='' && String(v).trim()!=='0'; }
  function getVal(o,keys){ for(const k of keys){ if(o && hasVal(o[k])) return o[k]; } return ''; }
  function cLevelText(v){ const n=Number(v); if(!Number.isFinite(n)||n<=0)return ''; return ({1:'一轉',2:'二轉',3:'三轉',4:'四轉',5:'五轉'})[n]||String(v); }
  function attackSpeedText(v){ const n=Number(v); return ({5:'最快',4:'次快',3:'普通',2:'次慢',1:'最慢'})[n]||String(v??''); }
  function damageText(it){ const mn=getVal(it,['DamageMin','damage_min']); const mx=getVal(it,['DamageMax','damage_max']); return (mn||mx)?`${mn||''}${mn&&mx?'～':''}${mx||''}`:''; }
  function itemTypeText(it){ const t=it?.Type||''; return (typeof itemTypeName==='function'?itemTypeName(t):'')||t; }
  function itemKindText(it){ return (typeof itemKind==='function'?itemKind(it):'')||''; }
  function itemStatusText(it){ return (typeof itemStatus==='function'?itemStatus(it):'')||''; }
  const ITEM_DATA_KEYS=[['名稱',['Name']],['類型',['Type'],itemTypeText],['等級',['Level']],['職等',['CLevel'],it=>cLevelText(it.CLevel)],['專剋',['Kind'],itemKindText],['特殊能力',['ExtraStatus'],itemStatusText],['說明',['Help']]];
  const ITEM_ABILITY_KEYS=[['血量',['HP']],['精力',['MP']],['體魄',['Con']],['力量',['Str']],['智慧',['Int']],['靈敏',['Dex']],['傷害',['Damage'],damageText],['術法攻擊',['MagicAttack']],['物理防禦',['ExtraDef','Extra_Def']],['術法防禦',['MagicDef','Magic_Def']],['冰傷',['IceAttack']],['火傷',['FireAttack']],['雷傷',['LightningAttack']],['冥傷',['DarkAttack']],['冰傷機率',['IceProb']],['火傷機率',['FireProb']],['雷傷機率',['LightningProb']],['冥傷機率',['DarkProb']],['冰防',['IceDef']],['火防',['FireDef']],['雷防',['LightningDef']],['冥防',['DarkDef']],['抗定身',['ParalysisRes']],['抗毒',['PosionRes']],['抗盲目',['BlindRes']],['抗禁咒',['SilentRes']],['攻速',['Attack'],it=>attackSpeedText(it.Attack)],['耐久',['Durabulity','Durability']],['重量',['Weight']],['價值',['Value']]];
  function rowsFromSpec(it,spec){ const out=[]; for(const [label,keys,fn] of spec){ const v=fn?fn(it):getVal(it,keys); if(hasVal(v))out.push([label,v]); } return out; }
  window.itemDetailRows=function(it){ return [...rowsFromSpec(it,ITEM_DATA_KEYS),...rowsFromSpec(it,ITEM_ABILITY_KEYS)]; };
  window.itemAbilityFields=function(it){ return rowsFromSpec(it,ITEM_ABILITY_KEYS); };
  window.showItem=function(id){
    window.v86LastView='item'; try{history.pushState({app:'detail',view:'item'},'','#item-'+id)}catch(e){}
    const it=itemIndex[String(id).trim()]; if(!it)return;
    const dataRows=rowsFromSpec(it,ITEM_DATA_KEYS), abilityRows=rowsFromSpec(it,ITEM_ABILITY_KEYS);
    const kvHtml=(rows,cls='')=>`<div class="kvGrid ${cls}">${rows.map(([k,v])=>`<div class="kv"><div class="k">${_esc(k)}</div><div class="v">${_esc(v)}</div></div>`).join('')}</div>`;
    byId('reader').innerHTML=`<section class="card monsterCompact itemCompact"><button class="backBtn" type="button" onclick="goBackToPrevious()">← 返回查詢</button><h1>${_esc(nameOf(it))}</h1><div class="monsterGrid"><div class="monsterPanel"><h3>道具資料</h3>${kvHtml(dataRows,'itemDataGrid')}</div>${abilityRows.length?`<div class="monsterPanel"><h3>道具能力</h3>${kvHtml(abilityRows,'itemAbilityGrid')}</div>`:''}</div><div class="quick"><button type="button" data-reverse-item="${_esc(it.ID)}">反查哪些怪物掉落這個道具<small>查看怪物與掉落機率</small></button></div></section>`;
    closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
  };
  function eqLabel(k,o,e){ if(k==='level')return '等級'; if(k==='mp')return '精力'; if(k==='attack')return '攻速'; if(k==='dark_attack')return '冥傷'; if(k==='dark_def')return '冥防'; if(k==='dark_prob')return '冥傷機率'; if(k==='lightning_def')return '雷防'; if(k==='m_attack')return '術法攻擊'; if(k==='def')return '物理防禦'; if(k==='m_def')return '術法防禦'; return (typeof eqStatLabel==='function')?eqStatLabel(k,o,e):(o?.label||e?.label||k); }
  function eqText(k,o){ if(k==='attack')return attackSpeedText(o&&(o.value??o.min??'')); if(k==='clevel')return cLevelText(o&&(o.value??o.min??'')); return (typeof eqDisplayStatText==='function')?eqDisplayStatText(k,o):String(o?.value??''); }
  window.eqRenderStats=function(eq,includeEffects=true){
    const base=eqBaseStatsWithRaw(eq), effMap=includeEffects?eqEffectAccumulator():{};
    const keys=eqUnique([...Object.keys(base),...Object.keys(effMap)]).filter(k=>k!=='attack_range');
    const order=['level','clevel','con','str','int','dex','hp','mp','damage','m_attack','def','m_def','ice_def','fire_def','lightning_def','dark_def','fire_attack','ice_attack','lightning_attack','dark_attack','fire_prob','ice_prob','lightning_prob','dark_prob','paralysis_res','poison_res','blind_res','silent_res','attack','durability','weight'];
    keys.sort((a,b)=>(order.indexOf(a)<0?999:order.indexOf(a))-(order.indexOf(b)<0?999:order.indexOf(b))||String(a).localeCompare(String(b),'zh-Hant'));
    const left=keys.map(k=>{const o=base[k];return `<div class="kv"><div class="k">${_esc(eqLabel(k,o,null))}</div><div class="v">${_esc(eqText(k,o))}</div></div>`}).join('');
    if(!includeEffects)return `<div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">目前裝備能力</h2><div class="eqStatGrid">${left}</div></div>`;
    const right=keys.map(k=>{ const o=base[k], e=effMap[k]; let addText=''; if(e){ if(e.hasRange){const am=e.min,ax=e.max; addText=`<span class="eqYellow">（+${_fmt(am)}${am!==ax?'～'+_fmt(ax):''}${e.unit||''}）</span>`;}else{const av=e.value; addText=`<span class="eqYellow">（${av>=0?'+':''}${_fmt(av)}${e.unit||''}）</span>`;} if(e.parts&&e.parts.length)addText+=`<div class="rSub">${_esc(e.parts.join('、'))}</div>`;} return `<div class="kv"><div class="k">${_esc(eqLabel(k,o,e))}</div><div class="v">${_esc(eqText(k,o))}${addText}</div></div>`; }).join('');
    return `<div class="eqPreviewGrid"><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">裝備能力</h2><div class="eqStatGrid">${left}</div></div><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">合成後能力</h2><div class="eqSmall">白字為原有能力，黃字括號為合成增加值。</div><div class="eqStatGrid">${right}</div></div></div>`;
  };
  window.searchItems=function(){
    const itemQ=byId('itemQ'); if(!itemQ)return;
    window.v86ItemQ=itemQ.value; window.v86ItemType=byId('itemType')?.value||''; window.v86ItemMin=byId('itemMin')?.value||''; window.v86ItemMax=byId('itemMax')?.value||'';
    const q=itemQ.value.trim().toLowerCase(), type=window.v86ItemType, min=window.v86ItemMin?intOf(window.v86ItemMin):null, max=window.v86ItemMax?intOf(window.v86ItemMax):null;
    const box=byId('itemResults'); if(!box)return; if(!(q||type||window.v86ItemMin||window.v86ItemMax)){box.innerHTML='';return;}
    const arr=items.filter(it=>(!q||itemSearchText(it).includes(q))&&(!type||it.Type===type)&&(min===null||intOf(it.Level)>=min)&&(max===null||intOf(it.Level)<=max)).slice(0,150);
    box.innerHTML=arr.map(it=>`<button class="resultItem" data-item="${_esc(it.ID)}"><div class="rName">${_esc(nameOf(it))}</div><div class="rSub">Lv.${_esc(it.Level||'')}｜${_esc(itemTypeName(it.Type)||it.Type||'')}</div></button>`).join('')||'<div class="muted">找不到道具</div>';
  };
})();

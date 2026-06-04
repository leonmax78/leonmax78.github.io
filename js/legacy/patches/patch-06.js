/* v88ad 合成能力顯示與模擬頁簡化修正 */
(function(){
  window.eqRenderStats=function(eq,includeEffects=true){
    const base=eqBaseStatsWithRaw(eq);
    const effMap=includeEffects?eqEffectAccumulator():{};
    const keys=eqUnique([...Object.keys(base),...Object.keys(effMap)]);
    const order=['level','clevel','con','str','int','dex','hp','mp','damage','m_attack','def','m_def','ice_def','fire_def','lightning_def','dark_def','fire_attack','ice_attack','lightning_attack','dark_attack','fire_prob','ice_prob','lightning_prob','dark_prob','paralysis_res','poison_res','blind_res','silent_res','attack','attack_range','durability','weight'];
    keys.sort((a,b)=>(order.indexOf(a)<0?999:order.indexOf(a))-(order.indexOf(b)<0?999:order.indexOf(b)) || String(a).localeCompare(String(b),'zh-Hant'));
    const left=keys.map(k=>{const o=base[k]; const label=eqStatLabel(k,o,null); return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${esc(eqDisplayStatText(k,o))}</div></div>`}).join('');
    if(!includeEffects){return `<div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">目前裝備能力</h2><div class="eqStatGrid">${left}</div></div>`;}
    const right=keys.map(k=>{
      const o=base[k]; const e=effMap[k]; const label=eqStatLabel(k,o,e);
      const baseText=eqDisplayStatText(k,o);
      let addText='';
      if(e){
        if(e.hasRange){
          const am=e.min, ax=e.max;
          addText=`<span class="eqYellow">（+${fmt(am)}${am!==ax?'～'+fmt(ax):''}${e.unit||''}）</span>`;
        }else{
          const av=e.value;
          addText=`<span class="eqYellow">（${av>=0?'+':''}${fmt(av)}${e.unit||''}）</span>`;
        }
        if(e.parts&&e.parts.length)addText+=`<div class="rSub">${esc(e.parts.join('、'))}</div>`;
      }
      return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${esc(baseText)}${addText}</div></div>`;
    }).join('');
    return `<div class="eqPreviewGrid"><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">裝備能力</h2><div class="eqStatGrid">${left}</div></div><div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">合成後能力</h2><div class="eqSmall">白字為原有能力，黃字括號為合成增加值。</div><div class="eqStatGrid">${right}</div></div></div>`;
  };

  window.renderEquipmentRandomPage=function(keepScroll=false){
    const y=window.scrollY||document.documentElement.scrollTop||0;
    const eq=eqSelected(); if(!eq){empty('請先選擇裝備');return;}
    const history=(eqState.simHistory||[]).slice().reverse();
    const histRows=history.map(h=>`<tr><td>${fmt(h.no)}</td><td>${esc(h.recipeName)}</td><td>${(h.rolls||[]).map(r=>`${esc(r.label)} +${fmt(r.value)}${esc(r.unit||'')}`).join('、')||'-'}</td></tr>`).join('')||'<tr><td colspan="3">尚未有模擬紀錄。</td></tr>';
    const materialSections=eqRandomMaterialRows().map(({recipe,count,mats})=>`<h3>${esc(recipe.name)} × ${fmt(count)}</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${mats.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.qty)}</td></tr>`).join('')}</tbody></table></div>`).join('')||'<div class="empty">尚未模擬，材料數量為 0。</div>';
    byId('reader').innerHTML=`<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>合成亂數模擬</h1><h2>${esc(eq.name)}</h2>${eqMetaLine(eq)}${eqRenderStats(eq,false)}${eqRenderRandomRecipePicker()}<div class="quick"><button type="button" class="primary" id="eqSimOnce">模擬一次<small>隨機產生本次合成增加值，並依配方累計材料</small></button><button type="button" id="eqSimClear" class="ghost">清空重新計算<small>歸零累計次數與材料，保留目前選擇的配方</small></button></div><div class="kvGrid"><div class="kv"><div class="k">累計模擬次數</div><div class="v">${fmt(eqState.simCount||0)}</div></div></div><h3>模擬紀錄</h3><div class="tableWrap"><table><thead><tr><th>次數</th><th>配方</th><th>本次結果</th></tr></thead><tbody>${histRows}</tbody></table></div><h3>總計材料數</h3>${materialSections}</section>`;
    if(keepScroll)setTimeout(()=>window.scrollTo(0,y),0); else window.scrollTo({top:0,behavior:'smooth'});
  };

  document.addEventListener('click',function(e){
    if(e.target && e.target.id==='eqSimOnce'){
      e.preventDefault(); e.stopImmediatePropagation();
      eqRandomOnce();
      renderEquipmentRandomPage(true);
    }
    if(e.target && e.target.id==='eqSimClear'){
      e.preventDefault(); e.stopImmediatePropagation();
      const keep=eqState.simActiveRecipeId||'';
      eqResetRandom(false);
      eqState.simActiveRecipeId=keep;
      renderEquipmentRandomPage(true);
    }
  },true);
})();

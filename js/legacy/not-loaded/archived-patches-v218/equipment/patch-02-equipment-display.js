/* v88y 裝備等級/職等顯示修正 + 亂數模擬直覺化 */
(function(){
  function eqPrimitiveLabel(k){
    if(k==='m_attack')return '術法攻擊';
    if(k==='def')return '物理防禦';
    if(k==='m_def')return '術法防禦';
    if(k==='level')return '等級';
    if(k==='clevel')return '職等(CL)';
    const labels=(typeof eqData==='function' && eqData().stat_labels)||{};
    return labels[k]||k;
  }
  window.eqBaseStatsWithRaw=function(eq){
    const base=Object.assign({},eq?.base_stats||{});
    Object.keys(base).forEach(k=>{
      const v=base[k];
      if(v!==null && typeof v!=='object'){
        base[k]={label:eqPrimitiveLabel(k),value:Number(v)||0};
      }else if(v && typeof v==='object' && v.value===undefined && v.min===undefined && v.max===undefined && v.label!==undefined){
        // 保留未知格式，避免被顯示成空白
        base[k]={label:v.label||eqPrimitiveLabel(k),value:Number(v.value||0)||0};
      }
    });
    const raw=eq?.raw_item||{};
    const add=(key,label,value)=>{if(value!==undefined&&value!==null&&value!==''&&base[key]===undefined)base[key]={label,value:Number(value)||0};};
    const addRange=(key,label,min,max)=>{if((min!==undefined||max!==undefined)&&base[key]===undefined)base[key]={label,min:Number(min)||0,max:Number(max??min)||0};};
    add('m_attack','術法攻擊',raw.MagicAttack);
    add('def','物理防禦',raw.ExtraDef);
    add('m_def','術法防禦',raw.MagicDef);
    add('ice_def','冰防',raw.IceDef);
    add('fire_def','火防',raw.FireDef);
    add('lightning_def','雷防',raw.LightningDef);
    add('dark_def','冥防',raw.DarkDef);
    add('paralysis_res','抗定身',raw.ParalysisRes);
    add('poison_res','抗毒',raw.PosionRes ?? raw.PoisonRes);
    add('blind_res','抗盲目',raw.BlindRes);
    add('silent_res','抗禁咒',raw.SilentRes);
    addRange('damage','傷害',raw.DamageMin,raw.DamageMax);
    add('level','LEVEL',raw.Level ?? eq?.base_stats?.level);
    add('clevel','職等(CL)',raw.CLevel ?? eq?.base_stats?.clevel);
    return base;
  };

  window.eqMetaLine=function(eq){
    const base=eqBaseStatsWithRaw(eq);
    const level=base.level?.value||eq?.raw_item?.Level||'';
    const clevel=base.clevel?.value??eq?.raw_item?.CLevel??'';
    const main=['等級 '+(level||'-'),'職等(CL) '+eqCLevelText(clevel)];
    const rest=['ID '+eq.item_id,eq.main_category,eq.series||eq.series_group,eq.display_type].filter(Boolean);
    return `<div class="eqTopMeta">${main.map(x=>`<span class="pill" style="font-size:14px;border-color:#60a5fa;color:#e0f2fe">${esc(x)}</span>`).join('')}${rest.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`;
  };

  window.eqSimAddRecipe=function(id){
    const r=eqRecipeById(id); if(!r)return;
    eqState.simActiveRecipeId=String(id);
    eqState.simSelectedRecipes=eqState.simSelectedRecipes||{};
    eqState.simSelectedRecipes[String(id)]=true;
    renderEquipmentRandomPage(true);
  };

  window.eqSimToggleRecipe=function(id){
    const sid=String(id||'');
    if(eqState.simActiveRecipeId===sid)eqState.simActiveRecipeId='';
    if(eqState.simSelectedRecipes)delete eqState.simSelectedRecipes[sid];
    renderEquipmentRandomPage(true);
  };

  window.eqResetRandom=function(clearSelection=true){
    eqState.simTotals={};
    eqState.simCount=0;
    eqState.simRecipeCounts={};
    eqState.simHistory=[];
    if(clearSelection){
      eqState.simSelectedRecipes={};
      eqState.simActiveRecipeId='';
    }
  };

  function eqGroupedRecipeOptions(recipes, activeId){
    const groups=[['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_50','安定值 50']];
    return groups.map(([g,label])=>{
      const arr=recipes.filter(r=>g==='stable_50'?(r.group==='stable_50'||r.group==='stable_70'):r.group===g);
      if(!arr.length)return '';
      return `<optgroup label="${esc(label)}">${arr.map(r=>`<option value="${esc(r.id)}" ${String(activeId||'')===String(r.id)?'selected':''}>${esc(r.name)}${r.effect_summary?'｜'+esc(r.effect_summary):''}</option>`).join('')}</optgroup>`;
    }).join('');
  }

  window.eqRandomOnce=function(){
    if(!eqState.simTotals)eqState.simTotals={};
    if(!eqState.simRecipeCounts)eqState.simRecipeCounts={};
    if(!eqState.simHistory)eqState.simHistory=[];
    const recipe=eqRecipeById(eqState.simActiveRecipeId);
    if(!recipe){alert('請先選擇要模擬的配方');return;}
    const rid=String(recipe.id);
    eqState.simSelectedRecipes=eqState.simSelectedRecipes||{};
    eqState.simSelectedRecipes[rid]=true;
    eqState.simRecipeCounts[rid]=(Number(eqState.simRecipeCounts[rid])||0)+1;
    eqState.simCount=(Number(eqState.simCount)||0)+1;
    const rolls=[];
    for(const e of recipe.effects||[]){
      if(e.stackable===false)continue;
      const k=e.stat, label=e.label||eqData().stat_labels?.[k]||k;
      const val=eqRollEffectValue(e);
      if(!eqState.simTotals[k])eqState.simTotals[k]={label,value:0};
      eqState.simTotals[k].value+=val;
      rolls.push({label,value:val,unit:e.unit||''});
    }
    eqState.simHistory.push({no:eqState.simCount,recipeId:rid,recipeName:recipe.name,rolls});
  };

  window.eqRenderRandomRecipePicker=function(){
    const recipes=eqSortRecipeObjects(eqAllowedRecipes());
    const active=eqState.simActiveRecipeId||'';
    const activeRecipe=eqRecipeById(active);
    const used=activeRecipe ? Number((eqState.simRecipeCounts||{})[String(activeRecipe.id)])||0 : 0;
    return `<h3>選擇要模擬的配方</h3>
    <div class="notice">選一個配方後按「模擬一次」，每按一次就像骰子一樣產生本次增加值，並自動累計使用次數與材料。</div>
    <div class="card" style="box-shadow:none">
      <label>模擬配方</label>
      <select data-eq-sim-recipe-select="single"><option value="">請選擇要模擬的配方</option>${eqGroupedRecipeOptions(recipes, active)}</select>
      ${activeRecipe?`<div class="notice" style="margin-top:10px"><b>${esc(activeRecipe.name)}</b><br>${esc(activeRecipe.effect_summary||'')}${activeRecipe.desc?`<br>${esc(activeRecipe.desc)}`:''}<br>目前已模擬使用：${fmt(used)} 次</div>`:''}
    </div>`;
  };

  window.renderEquipmentRandomPage=function(keepScroll=false){
    const y=window.scrollY||document.documentElement.scrollTop||0;
    const eq=eqSelected(); if(!eq){empty('請先選擇裝備');return;}
    const totals=eqState.simTotals||{};
    const totalRows=Object.entries(totals).map(([k,o])=>`<tr><td>${esc(o.label)}</td><td>+${fmt(o.value)}</td></tr>`).join('')||'<tr><td colspan="2">尚未模擬，請先選配方再按「模擬一次」。</td></tr>';
    const history=(eqState.simHistory||[]).slice().reverse();
    const histRows=history.map(h=>`<tr><td>${fmt(h.no)}</td><td>${esc(h.recipeName)}</td><td>${h.rolls.map(r=>`${esc(r.label)} +${fmt(r.value)}${esc(r.unit||'')}`).join('、')||'-'}</td></tr>`).join('')||'<tr><td colspan="3">尚未有模擬紀錄。</td></tr>';
    const materialSections=eqRandomMaterialRows().map(({recipe,count,mats})=>`<h3>${esc(recipe.name)} × ${fmt(count)}</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>${mats.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.qty)}</td></tr>`).join('')}</tbody></table></div>`).join('')||'<div class="empty">尚未模擬，材料數量為 0。</div>';
    byId('reader').innerHTML=`<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>合成亂數模擬</h1><h2>${esc(eq.name)}</h2>${eqMetaLine(eq)}${eqRenderStats(eq,false)}${eqRenderRandomRecipePicker()}<div class="quick"><button type="button" class="primary" id="eqSimOnce">模擬一次<small>隨機產生本次合成增加值，並依配方累計材料</small></button><button type="button" id="eqSimClear" class="ghost">清空重新計算<small>歸零累計次數、能力與材料，保留目前選擇的配方</small></button></div><div class="kvGrid"><div class="kv"><div class="k">累計模擬次數</div><div class="v">${fmt(eqState.simCount||0)}</div></div></div><h3>本次模擬紀錄</h3><div class="tableWrap"><table><thead><tr><th>次數</th><th>配方</th><th>本次增加</th></tr></thead><tbody>${histRows}</tbody></table></div><h3>累計結果</h3><div class="tableWrap"><table><thead><tr><th>能力</th><th>累計增加</th></tr></thead><tbody>${totalRows}</tbody></table></div><h3>依模擬次數累計材料</h3>${materialSections}</section>`;
    if(keepScroll)setTimeout(()=>window.scrollTo(0,y),0); else window.scrollTo({top:0,behavior:'smooth'});
  };
})();

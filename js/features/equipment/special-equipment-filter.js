// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88z 特仕分類修正 + 亂數模擬僅保留安定值1 */
(function(){
  function eqSpecialTierOf(e){
    if(!e || e.series_group!=='特仕裝') return '';
    const txt=[e.job,e.name,e.base_name,e.search_text].filter(Boolean).join(' ');
    if(txt.includes('騰陽')) return '騰陽';
    if(txt.includes('狂陽')) return '騰陽';
    if(txt.includes('靜月')) return '靜月';
    if(txt.includes('宿星')) return '宿星';
    return e.job || '';
  }
  function eqTierValueForFilter(e){
    if(e && e.series_group==='特仕裝') return eqSpecialTierOf(e);
    return e?.tier ?? e?.series_grade ?? '';
  }
  function eqMatchTierForFilter(e,tier){
    if(!tier) return true;
    return String(eqTierValueForFilter(e))===String(tier);
  }
  function eqOptionSort(vals){
    const special=['騰陽','靜月','宿星'];
    return (vals||[]).slice().sort((a,b)=>{
      const ia=special.indexOf(a), ib=special.indexOf(b);
      if(ia>=0 || ib>=0) return (ia<0?999:ia)-(ib<0?999:ib);
      const na=Number(a), nb=Number(b);
      if(!isNaN(na)&&!isNaN(nb))return na-nb;
      return String(a).localeCompare(String(b),'zh-Hant');
    });
  }
  window.eqFilteredEquipment=function(){
    const q=(eqState.q||'').trim().toLowerCase();
    return eqEquipList().filter(e=>(!eqState.main||e.main_category===eqState.main)
      &&(!eqState.series||e.series_group===eqState.series)
      &&eqMatchTierForFilter(e,eqState.tier)
      &&(!eqState.type||e.display_type===eqState.type)
      &&(!q||String(e.search_text||e.name||'').toLowerCase().includes(q))
    ).slice(0,160);
  };
  window.eqRefreshFilters=function(){
    const all=eqEquipList();
    eqFillSelect('eqMain',eqUnique(all.map(e=>e.main_category)),'全部種類',eqState.main);
    const a1=all.filter(e=>!eqState.main||e.main_category===eqState.main);
    eqFillSelect('eqSeries',eqUnique(a1.map(e=>e.series_group)),'全部系列',eqState.series);
    const a2=a1.filter(e=>!eqState.series||e.series_group===eqState.series);
    const tiers=eqOptionSort(eqUnique(a2.map(e=>eqTierValueForFilter(e))));
    eqFillSelect('eqTier',tiers,'全部階級 / 等級 / 種類',eqState.tier);
    const typeOrder=eqData().type_order||[];
    const types=eqUnique(a2.filter(e=>eqMatchTierForFilter(e,eqState.tier)).map(e=>e.display_type)).sort((a,b)=>{let ia=typeOrder.indexOf(a),ib=typeOrder.indexOf(b); if(ia<0)ia=999;if(ib<0)ib=999; return ia-ib;});
    eqFillSelect('eqType',types,'全部類型 / 部位',eqState.type);
  };
  window.eqRefreshList=function(){
    const box=byId('eqList'); if(!box)return;
    const arr=eqFilteredEquipment();
    box.innerHTML=arr.map(e=>{
      const tier=e.series_group==='特仕裝'?eqSpecialTierOf(e):(e.tier||e.series_grade||'');
      const series=e.series_group==='特仕裝'?`特仕裝(${tier||''})`:(e.series||e.series_group||'');
      return `<button class="resultItem" data-eq-uid="${esc(e.uid)}"><div class="rName">${esc(e.name)}</div><div class="rSub">${esc(e.main_category||'')}｜${esc(series)}｜${esc(e.display_type||'')}｜Lv.${esc(e.base_stats?.level||e.raw_item?.Level||'')}｜ID ${esc(e.item_id||'')}</div></button>`;
    }).join('') || '<div class="empty">請調整篩選條件，或找不到裝備。</div>';
  };
  function stable1Recipes(){
    return eqSortRecipeObjects(eqAllowedRecipes().filter(r=>r.group==='stable_1'));
  }
  function stable1Options(recipes, activeId){
    return recipes.map(r=>`<option value="${esc(r.id)}" ${String(activeId||'')===String(r.id)?'selected':''}>${esc(r.name)}${r.effect_summary?'｜'+esc(r.effect_summary):''}</option>`).join('');
  }
  window.eqRenderRandomRecipePicker=function(){
    const recipes=stable1Recipes();
    const active=eqState.simActiveRecipeId||'';
    const activeRecipe=eqRecipeById(active);
    const used=activeRecipe ? Number((eqState.simRecipeCounts||{})[String(activeRecipe.id)])||0 : 0;
    return `<h3>選擇要模擬的配方</h3>
    <div class="notice">亂數模擬只保留安定值 1 配方。選一個配方後按「模擬一次」，每按一次就像骰子一樣產生本次增加值，並自動累計使用次數與材料。</div>
    <div class="card" style="box-shadow:none">
      <label>模擬配方（安定值 1）</label>
      <select data-eq-sim-recipe-select="single"><option value="">請選擇要模擬的安定值 1 配方</option>${stable1Options(recipes, active)}</select>
      ${activeRecipe?`<div class="notice" style="margin-top:10px"><b>${esc(activeRecipe.name)}</b><br>${esc(activeRecipe.effect_summary||'')}${activeRecipe.desc?`<br>${esc(activeRecipe.desc)}`:''}<br>目前已模擬使用：${fmt(used)} 次</div>`:''}
    </div>`;
  };
  window.eqSimAddRecipe=function(id){
    const r=eqRecipeById(id); if(!r)return;
    if(r.group!=='stable_1'){alert('亂數模擬只支援安定值 1 配方');return;}
    eqState.simActiveRecipeId=String(id);
    eqState.simSelectedRecipes={};
    eqState.simSelectedRecipes[String(id)]=true;
    renderEquipmentRandomPage(true);
  };
  window.eqRandomOnce=function(){
    if(!eqState.simTotals)eqState.simTotals={};
    if(!eqState.simRecipeCounts)eqState.simRecipeCounts={};
    if(!eqState.simHistory)eqState.simHistory=[];
    const recipe=eqRecipeById(eqState.simActiveRecipeId);
    if(!recipe){alert('請先選擇要模擬的安定值 1 配方');return;}
    if(recipe.group!=='stable_1'){alert('亂數模擬只支援安定值 1 配方');return;}
    const rid=String(recipe.id);
    eqState.simSelectedRecipes={};
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
})();

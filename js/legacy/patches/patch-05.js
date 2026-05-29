/* v88ab 修正：仙器只使用安定值70；一般裝備維持 1 / 12 / 50，亂數模擬一般只安定值1、仙器只安定值70 */
(function(){
  function isEqUnderBoot88ab(eq){
    if(!eq) return false;
    const txt=[eq.main_category,eq.display_type,eq.item_type_raw,(eq.type_codes||[]).join(','),eq.search_text].filter(Boolean).join(' ');
    return txt.includes('仙器') || txt.includes('UNDER_BOOT');
  }
  function recipeGroupAllowed88ab(recipe, eq){
    const g=recipe && recipe.group;
    if(isEqUnderBoot88ab(eq)) return g==='stable_70';
    return g==='stable_1' || g==='stable_12' || g==='stable_50';
  }
  function recipeGroupLabel88ab(group){
    if(group==='stable_1') return '安定值 1';
    if(group==='stable_12') return '安定值 12';
    if(group==='stable_50') return '安定值 50';
    if(group==='stable_70') return '安定值 70';
    return group || '';
  }
  const prevAllowed88ab=window.eqAllowedRecipes;
  window.eqAllowedRecipes=function(){
    const eq=(typeof eqSelected==='function') ? eqSelected() : null;
    const base=(typeof prevAllowed88ab==='function') ? prevAllowed88ab() : [];
    return base.filter(r=>recipeGroupAllowed88ab(r,eq));
  };
  window.eqRecipeGroupRank=function(recipe){
    const g=recipe?.group||'';
    if(g==='stable_1')return 1;
    if(g==='stable_12')return 2;
    if(g==='stable_50')return 3;
    if(g==='stable_70')return 4;
    return 99;
  };
  window.eqRenderRecipeArea=function(){
    const eq=(typeof eqSelected==='function') ? eqSelected() : null;
    if(!eq)return '<div class="empty">請先選擇裝備。</div>';
    const recipes=eqSortRecipeObjects(eqAllowedRecipes());
    const isUnder=isEqUnderBoot88ab(eq);
    const groups=isUnder ? [['stable_70','安定值 70']] : [['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_50','安定值 50']];
    const groupRecipes=g=>recipes.filter(r=>r.group===g);
    const groupSelected=g=>eqSelectedRecipes().filter(x=>x.recipe.group===g);
    const renderSelected=g=>{
      const rows=groupSelected(g);
      if(!rows.length)return '<div class="muted" style="margin-top:8px">尚未加入這個安定值的配方。</div>';
      return '<div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>已選配方</th><th>次數</th><th>操作</th></tr></thead><tbody>'+
        rows.map(({recipe,count})=>'<tr><td><b>'+esc(recipe.name)+'</b><div class="rSub">'+esc(recipe.effect_summary||'')+'</div></td><td style="width:120px"><input class="eqRecipeCount" data-eq-recipe-count="'+esc(recipe.id)+'" type="number" min="1" value="'+esc(count)+'"></td><td style="width:90px"><button class="ghost" data-eq-recipe="'+esc(recipe.id)+'">移除</button></td></tr>').join('')+
        '</tbody></table></div>';
    };
    const notice=isUnder
      ? '仙器只使用安定值 70 配方；不顯示安定值 1、安定值 12。'
      : '配方改為下拉式加入，可跨安定值累加；材料清單會依安定值 1 → 12 → 50 的順序列出。';
    return '<h3 id="eqRecipeAnchor">選擇配方</h3><div class="notice">'+notice+'</div>'+groups.map(([g,label])=>{
      const arr=groupRecipes(g);
      return '<div class="card" style="box-shadow:none"><h3>'+esc(label)+'</h3><label>加入配方</label><select data-eq-recipe-select="'+esc(g)+'"><option value="">請選擇要加入的配方</option>'+arr.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+(r.effect_summary?'｜'+esc(r.effect_summary):'')+'</option>').join('')+'</select>'+renderSelected(g)+'</div>';
    }).join('')+'<div class="quick"><button class="primary" id="eqOpenRandom">進入亂數模擬頁<small>進入後再選配方，像骰子一樣累計次數與材料</small></button><button class="primary" id="eqShowMaterials">產出所需材料清單<small>另開材料頁，並可返回</small></button></div>';
  };
  window.showEquipmentMaterials=function(){
    const eq=(typeof eqSelected==='function') ? eqSelected() : null;
    let picks=(typeof eqSelectedRecipes==='function') ? eqSelectedRecipes() : [];
    if(!eq||!picks||!picks.length){empty('請先選擇裝備與至少一個配方');return;}
    picks=picks.filter(x=>recipeGroupAllowed88ab(x.recipe,eq)).sort((a,b)=>eqRecipeGroupRank(a.recipe)-eqRecipeGroupRank(b.recipe));
    const sections=picks.map(({recipe,count})=>{
      const mats=eqMaterials(recipe,count);
      return '<h3>'+esc(recipeGroupLabel88ab(recipe.group))+'｜'+esc(recipe.name)+' × '+fmt(count)+'</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>'+mats.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+fmt(m.qty)+'</td></tr>').join('')+'</tbody></table></div>';
    }).join('');
    byId('reader').innerHTML='<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>所需材料清單</h1><div class="notice"><b>'+esc(eq.name)+'</b><br>材料依配方分開顯示，並依安定值順序排列。</div>'+sections+'</section>';
    window.scrollTo({top:0,behavior:'smooth'});
  };
  function simGroup88ab(){
    const eq=(typeof eqSelected==='function') ? eqSelected() : null;
    return isEqUnderBoot88ab(eq) ? 'stable_70' : 'stable_1';
  }
  function simRecipes88ab(){
    const g=simGroup88ab();
    return eqSortRecipeObjects(eqAllowedRecipes().filter(r=>r.group===g));
  }
  window.eqRenderRandomRecipePicker=function(){
    const eq=(typeof eqSelected==='function') ? eqSelected() : null;
    const g=simGroup88ab();
    const label=recipeGroupLabel88ab(g);
    const recipes=simRecipes88ab();
    const active=eqState.simActiveRecipeId||'';
    const activeRecipe=eqRecipeById(active);
    const used=activeRecipe ? Number((eqState.simRecipeCounts||{})[String(activeRecipe.id)])||0 : 0;
    const note=isEqUnderBoot88ab(eq)
      ? '仙器亂數模擬只保留安定值 70 配方。選一個配方後按「模擬一次」，會自動累計使用次數與材料。'
      : '亂數模擬只保留安定值 1 配方。選一個配方後按「模擬一次」，每按一次就像骰子一樣產生本次增加值，並自動累計使用次數與材料。';
    return '<h3>選擇要模擬的配方</h3><div class="notice">'+note+'</div><div class="card" style="box-shadow:none"><label>模擬配方（'+esc(label)+'）</label><select data-eq-sim-recipe-select="single"><option value="">請選擇要模擬的'+esc(label)+'配方</option>'+recipes.map(r=>'<option value="'+esc(r.id)+'" '+(String(active)===String(r.id)?'selected':'')+'>'+esc(r.name)+(r.effect_summary?'｜'+esc(r.effect_summary):'')+'</option>').join('')+'</select>'+(activeRecipe?'<div class="notice" style="margin-top:10px"><b>'+esc(activeRecipe.name)+'</b><br>'+esc(activeRecipe.effect_summary||'')+(activeRecipe.desc?'<br>'+esc(activeRecipe.desc):'')+'<br>目前已模擬使用：'+fmt(used)+' 次</div>':'')+'</div>';
  };
  window.eqSimAddRecipe=function(id){
    const r=eqRecipeById(id); if(!r)return;
    const g=simGroup88ab();
    if(r.group!==g){alert('目前裝備的亂數模擬只支援 '+recipeGroupLabel88ab(g)+' 配方');return;}
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
    const g=simGroup88ab();
    if(!recipe){alert('請先選擇要模擬的 '+recipeGroupLabel88ab(g)+' 配方');return;}
    if(recipe.group!==g){alert('目前裝備的亂數模擬只支援 '+recipeGroupLabel88ab(g)+' 配方');return;}
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

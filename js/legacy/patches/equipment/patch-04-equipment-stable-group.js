/* v88ab 修正：主腳本重複 function 導致卡住；安定值 50/仙器70 分流 */
(function(){
  function isEqUnderBoot(eq){
    if(!eq) return false;
    const txt=[eq.main_category,eq.display_type,eq.item_type_raw,(eq.type_codes||[]).join(','),eq.search_text].filter(Boolean).join(' ');
    return txt.includes('仙器') || txt.includes('UNDER_BOOT');
  }
  function recipeGroupAllowedForEq(recipe, eq){
    const g=recipe && recipe.group;
    if(g==='stable_1' || g==='stable_12') return true;
    if(isEqUnderBoot(eq)) return g==='stable_70';
    return g==='stable_50';
  }
  function recipeGroupLabelForEq(group, eq){
    if(group==='stable_1') return '安定值 1';
    if(group==='stable_12') return '安定值 12';
    if(group==='stable_70') return '安定值 70';
    if(group==='stable_50') return '安定值 50';
    return group || '';
  }
  const oldAllowed = window.eqAllowedRecipes;
  window.eqAllowedRecipes=function(){
    const eq=eqSelected && eqSelected();
    const base = (typeof oldAllowed==='function') ? oldAllowed() : [];
    return base.filter(r=>recipeGroupAllowedForEq(r, eq));
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
    const eq=eqSelected && eqSelected();
    if(!eq)return '<div class="empty">請先選擇裝備。</div>';
    const recipes=eqSortRecipeObjects(eqAllowedRecipes());
    const groups=isEqUnderBoot(eq)
      ? [['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_70','安定值 70']]
      : [['stable_1','安定值 1'],['stable_12','安定值 12'],['stable_50','安定值 50']];
    const groupRecipes=g=>recipes.filter(r=>r.group===g);
    const groupSelected=g=>eqSelectedRecipes().filter(x=>x.recipe.group===g);
    const renderSelected=g=>{
      const rows=groupSelected(g);
      if(!rows.length)return '<div class="muted" style="margin-top:8px">尚未加入這個安定值的配方。</div>';
      return '<div class="tableWrap" style="margin-top:10px"><table><thead><tr><th>已選配方</th><th>次數</th><th>操作</th></tr></thead><tbody>'+
        rows.map(({recipe,count})=>'<tr><td><b>'+esc(recipe.name)+'</b><div class="rSub">'+esc(recipe.effect_summary||'')+'</div></td><td style="width:120px"><input class="eqRecipeCount" data-eq-recipe-count="'+esc(recipe.id)+'" type="number" min="1" value="'+esc(count)+'"></td><td style="width:90px"><button class="ghost" data-eq-recipe="'+esc(recipe.id)+'">移除</button></td></tr>').join('')+
        '</tbody></table></div>';
    };
    const notice=isEqUnderBoot(eq)
      ? '仙器會使用獨立的安定值 70 配方；配方以安定值 1 → 12 → 70 的順序列出。'
      : '配方改為下拉式加入，可跨安定值累加；材料清單會依安定值 1 → 12 → 50 的順序列出。';
    return '<h3 id="eqRecipeAnchor">選擇配方</h3><div class="notice">'+notice+'</div>'+groups.map(([g,label])=>{
      const arr=groupRecipes(g);
      return '<div class="card" style="box-shadow:none"><h3>'+esc(label)+'</h3><label>加入配方</label><select data-eq-recipe-select="'+esc(g)+'"><option value="">請選擇要加入的配方</option>'+arr.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+(r.effect_summary?'｜'+esc(r.effect_summary):'')+'</option>').join('')+'</select>'+renderSelected(g)+'</div>';
    }).join('')+'<div class="quick"><button class="primary" id="eqOpenRandom">進入亂數模擬頁<small>進入後再選配方，像骰子一樣累計次數與材料</small></button><button class="primary" id="eqShowMaterials">產出所需材料清單<small>另開材料頁，並可返回</small></button></div>';
  };
  window.showEquipmentMaterials=function(){
    const eq=eqSelected && eqSelected(), picks=eqSelectedRecipes && eqSelectedRecipes();
    if(!eq||!picks||!picks.length){empty('請先選擇裝備與至少一個配方');return}
    const sections=picks.map(({recipe,count})=>{
      const mats=eqMaterials(recipe,count);
      return '<h3>'+esc(recipeGroupLabelForEq(recipe.group, eq))+'｜'+esc(recipe.name)+' × '+fmt(count)+'</h3><div class="tableWrap"><table class="eqMatTable"><thead><tr><th>材料</th><th>數量</th></tr></thead><tbody>'+mats.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+fmt(m.qty)+'</td></tr>').join('')+'</tbody></table></div>';
    }).join('');
    byId('reader').innerHTML='<section class="card"><button class="backBtn" id="eqBackToSim">← 返回裝備合成模擬</button><h1>所需材料清單</h1><div class="notice"><b>'+esc(eq.name)+'</b><br>材料依配方分開顯示，並依安定值順序排列。</div>'+sections+'</section>';
    window.scrollTo({top:0,behavior:'smooth'});
  };
})();

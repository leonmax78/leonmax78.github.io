// Owner-confirmed limited promotion. Keep raw data and old recipe values intact.
(function(){
  const ids=new Set([571,572,573,574,580,581,582,583,584,585,586,587,588,589,590,591]);
  const policy=window.SZO_REFINING={
    enabled:true,
    notice:'新配方安定值限時提升至 99；至 2027 年 7 月中旬資料片更新時恢復。已煉製能力不回溯。',
    value(recipe){
      const original=recipe.original_stable_value??recipe.stable_value??recipe.stable;
      return policy.enabled&&ids.has(Number(recipe.id))&&[50,70].includes(Number(original))?99:original;
    },
    apply(recipe){return {...recipe,original_stable_value:recipe.original_stable_value??recipe.stable_value,stable_value:policy.value(recipe)};},
    group(recipe){return policy.value(recipe)===99?'stable_99':recipe.group;}
  };
})();

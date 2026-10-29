// Owner-confirmed limited promotion. Keep raw data and old recipe values intact.
(function(){
  const ids=new Set([571,572,573,574,580,581,582,583,584,585,586,587,588,589,590,591]);
  const policy=window.SZO_REFINING={
    enabled:true,
    original(recipe){const value=recipe.original_stable_value??recipe.stable_value??recipe.stable;return ids.has(Number(recipe.id))&&Number(value)===99?([571,572,573,574].includes(Number(recipe.id))?70:50):value;},
    notice:'新配方安定值於 2026/10/29 維護後至 2027/07/15 維護前限時提升至 99；之後恢復原安定值，已煉製能力不回溯。',
    value(recipe){
      const original=policy.original(recipe);
      return policy.enabled&&ids.has(Number(recipe.id))&&[50,70].includes(Number(original))?99:original;
    },
    apply(recipe){const original=policy.original(recipe);return {...recipe,group:ids.has(Number(recipe.id))?'stable_'+original:recipe.group,original_stable_value:original,stable_value:policy.value(recipe)};},
    group(recipe){return policy.value(recipe)===99?'stable_99':recipe.group;}
  };
})();

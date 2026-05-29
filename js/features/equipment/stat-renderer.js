// V242: render equipment base stats with selected recipe bonuses in one panel.
(function(){
  function effectAddText(effect){
    if(!effect) return '';
    let text = '';
    if(effect.hasRange){
      const min = Number(effect.min) || 0;
      const max = Number(effect.max) || min;
      text = `（+${fmt(min)}${min !== max ? '～' + fmt(max) : ''}${esc(effect.unit || '')}）`;
    }else{
      const value = Number(effect.value) || 0;
      text = `（${value >= 0 ? '+' : ''}${fmt(value)}${esc(effect.unit || '')}）`;
    }
    const parts = Array.isArray(effect.parts) && effect.parts.length
      ? `<div class="rSub">${esc(effect.parts.join('、'))}</div>`
      : '';
    return `<span class="eqYellow">${text}</span>${parts}`;
  }

  window.eqRenderStats = function(eq, includeEffects = true){
    const base = eqBaseStatsWithRaw(eq);
    const effMap = includeEffects ? eqEffectAccumulator() : {};
    const keys = eqUnique([...Object.keys(base), ...Object.keys(effMap)]).filter(k => k !== 'attack_range');
    const order = [
      'level', 'clevel', 'con', 'str', 'int', 'dex', 'hp', 'mp',
      'damage', 'm_attack', 'def', 'm_def',
      'ice_def', 'fire_def', 'lightning_def', 'dark_def',
      'fire_attack', 'ice_attack', 'lightning_attack', 'dark_attack',
      'fire_prob', 'ice_prob', 'lightning_prob', 'dark_prob',
      'paralysis_res', 'poison_res', 'blind_res', 'silent_res',
      'attack', 'durability', 'weight'
    ];
    keys.sort((a, b) => {
      const ai = order.indexOf(a) < 0 ? 999 : order.indexOf(a);
      const bi = order.indexOf(b) < 0 ? 999 : order.indexOf(b);
      return ai - bi || String(a).localeCompare(String(b), 'zh-Hant');
    });

    const rows = keys.map(k => {
      const baseStat = base[k];
      const effect = effMap[k];
      const label = eqStatLabel(k, baseStat, effect);
      const baseText = eqDisplayStatText(k, baseStat);
      return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${esc(baseText)}${effectAddText(effect)}</div></div>`;
    }).join('');

    const note = includeEffects && Object.keys(effMap).length
      ? '<div class="eqSmall">黃字為已選配方的累加值。</div>'
      : '';
    const title = includeEffects ? '裝備能力' : '目前裝備能力';
    return `<div class="card" style="box-shadow:none"><h2 class="eqCompactTitle">${title}</h2>${note}<div class="eqStatGrid">${rows}</div></div>`;
  };
})();

// V222: focused equipment type ordering fix only.
// The old mega compatibility patch also rendered old Jiangshen pages, so it was archived.
(function(){
  const $ = id => document.getElementById(id);
  const oldEqRefreshFilters = window.eqRefreshFilters;
  window.eqRefreshFilters = function(){
    if(typeof oldEqRefreshFilters === 'function') oldEqRefreshFilters();
    const sel = $('eqType');
    if(!sel || !sel.options || sel.options.length <= 1) return;
    const orderAll = ['劍','刀','拂塵','禪杖','暗器','槍','棍','斧頭','錘','盾','頭盔','鎧甲','護腕','鞋子','靴','飾品','仙器'];
    const orderArmor = ['頭盔','鎧甲','護腕','鞋子','靴'];
    const order = ((window.eqState && window.eqState.main) || '') === '防具' ? orderArmor : orderAll;
    const first = sel.options[0] ? sel.options[0].outerHTML : '<option value="">全部</option>';
    const opts = [...sel.options].slice(1).sort((a,b)=>{
      const ta = (a.textContent || '').trim();
      const tb = (b.textContent || '').trim();
      let ia = order.indexOf(ta), ib = order.indexOf(tb);
      if(ia < 0) ia = 999;
      if(ib < 0) ib = 999;
      return ia - ib || ta.localeCompare(tb, 'zh-Hant');
    });
    const cur = sel.value;
    sel.innerHTML = first + opts.map(o=>o.outerHTML).join('');
    sel.value = cur;
  };
})();

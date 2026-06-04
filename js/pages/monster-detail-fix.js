// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88aw: 修正怪物搜尋結果點擊後 showMonster 因 hasVal 未定義而中斷 */
(function(){
  window.hasVal = window.hasVal || function(v){
    return v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '0';
  };
  function bindMonsterClicks(){
    document.addEventListener('click', function(e){
      var el = e.target && e.target.closest ? e.target.closest('[data-monster]') : null;
      if(!el) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      var id = el.getAttribute('data-monster');
      if(typeof window.showMonster === 'function') window.showMonster(id);
    }, true);
  }
  if(!window.__v88awMonsterClickFix){
    window.__v88awMonsterClickFix = true;
    bindMonsterClicks();
  }
})();

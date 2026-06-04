// V221: final Jiangshen navigation guard.
// Always route Jiangshen submenu clicks through the latest window.setJiang().
// This prevents older app-core / compatibility handlers from rendering an old support page first.
(function(){
  if(window.__SZO_JIANG_NAV_FINAL_GUARD__) return;
  window.__SZO_JIANG_NAV_FINAL_GUARD__ = true;
  function closeMenu(){ try{ if(typeof window.closeDrawer==='function') window.closeDrawer(); }catch(e){} }
  function scrollTop(){ try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); } }
  window.addEventListener('click', function(ev){
    const btn = ev.target && ev.target.closest && ev.target.closest('[data-jiang]');
    if(!btn) return;
    const kind = btn.dataset.jiang;
    if(!kind) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if(kind === 'support' && typeof window.renderSupportSlotsPage === 'function'){
      window.renderSupportSlotsPage();
      closeMenu();
      scrollTop();
      return;
    }
    if(typeof window.setJiang === 'function'){
      window.setJiang(kind);
      closeMenu();
      scrollTop();
    }
  }, true);
})();

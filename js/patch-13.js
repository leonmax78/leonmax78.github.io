(function(){
  function normalizeButtons(root){(root||document).querySelectorAll('button').forEach(function(b){try{b.setAttribute('type','button');}catch(e){}});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){normalizeButtons(document);}); else normalizeButtons(document);
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('button'):null;
    if(b){try{b.setAttribute('type','button');}catch(err){}}
    var a=e.target&&e.target.closest?e.target.closest('a'):null;
    if(a){var h=(a.getAttribute('href')||'').trim(); if(!h||h==='#'||h.toLowerCase().indexOf('javascript:void')===0)e.preventDefault();}
  },true);
})();

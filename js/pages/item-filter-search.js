(function(){
 let active=null;
 const close=()=>{if(!active)return;const a=active;active=null;a.list.remove();a.input.setAttribute('aria-expanded','false');a.sync();};
 document.addEventListener('pointerdown',e=>{if(active&&!active.wrap.contains(e.target)&&!active.list.contains(e.target))close();},true);
 document.addEventListener('scroll',e=>{if(active&&!active.list.contains(e.target))close();},true);
 window.addEventListener('resize',()=>active?.position());
 window.visualViewport?.addEventListener('resize',()=>active?.position());
 document.addEventListener('focusin',e=>{if(active&&!active.wrap.contains(e.target)&&!active.list.contains(e.target))close();});
 window.addEventListener('popstate',close);
 function enhance(){
  document.querySelectorAll('.itemAdvancedSearchPage .kvGrid select, .compoundTaxonomyPage .kvGrid select').forEach(select=>{
   if(select.dataset.searchReady)return;
   select.dataset.searchReady='1';
   const wrap=document.createElement('div');wrap.className='itemFilterCombo';
   const input=document.createElement('input');input.type='text';input.id=select.id+'Search';input.autocomplete='off';
   input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
   const label=select.closest('.kv').querySelector('.k');
   input.setAttribute('aria-label',label.textContent);
   const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▾';toggle.title='展開選項';toggle.setAttribute('aria-label','展開'+label.textContent);
   const sync=()=>{input.value=select.selectedOptions[0]?.textContent||'';input.disabled=select.disabled;input.setAttribute('aria-label',label.textContent);};
   const show=(query='')=>{
    if(active?.wrap!==wrap)close();
    else active.list.remove();
    const list=document.createElement('div');list.className='itemFilterChoices';list.id=select.id+'Choices';list.setAttribute('role','listbox');list.setAttribute('aria-label',label.textContent);
    input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','true');
    const choices=new WeakMap();
    const choose=(option,keyboard)=>{
     select.value=option.value;close();select.dispatchEvent(new Event('change',{bubbles:true}));sync();
     if(keyboard)input.focus();else input.blur();
    };
    const options=Array.from(select.options).filter(o=>!o.disabled&&o.textContent.toLowerCase().includes(query.trim().toLowerCase()));
    for(const option of options){
     const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.value===select.value));
     choices.set(button,()=>choose(option,false));
     button.addEventListener('click',e=>{e.stopPropagation();choose(option,e.detail===0);});list.append(button);
    }
    if(!options.length){const empty=document.createElement('div');empty.className='itemFilterEmpty';empty.textContent='沒有符合的選項';list.append(empty);}
    // Keep focus until a tap is committed; cancel iOS compatibility clicks after selection.
    let touchPick=null;
    list.addEventListener('pointerdown',e=>{const button=e.target.closest('button');if(!button)return;e.preventDefault();touchPick=e.pointerType==='touch'?{button,x:e.clientX,y:e.clientY,scroll:list.scrollTop}:null;});
    list.addEventListener('touchend',e=>{const pick=touchPick;touchPick=null;const touch=e.changedTouches[0];if(!pick||!touch||Math.hypot(touch.clientX-pick.x,touch.clientY-pick.y)>10||list.scrollTop!==pick.scroll)return;e.preventDefault();e.stopPropagation();choices.get(pick.button)?.();},{passive:false});
    list.addEventListener('pointercancel',()=>touchPick=null);list.addEventListener('touchcancel',()=>touchPick=null);
    list.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();input.focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();(e.key==='ArrowDown'?e.target.nextElementSibling:e.target.previousElementSibling)?.focus();}});
    const position=()=>{
    const rect=wrap.getBoundingClientRect(),viewport=window.visualViewport;
    const bottom=(viewport?.offsetTop||0)+(viewport?.height||innerHeight),space=bottom-rect.bottom-8;
    const height=Math.min(280,Math.max(80,space>=120?space:rect.top-(viewport?.offsetTop||0)-8));
    list.style.cssText=`left:${Math.max(8,Math.min(rect.left,innerWidth-rect.width-8))}px;width:${Math.min(rect.width,innerWidth-16)}px;max-height:${height}px;${space>=120?'top:'+rect.bottom+'px':'bottom:'+(innerHeight-rect.top)+'px'}`;
    };
    active={wrap,input,list,sync,position};document.body.append(list);position();
   };
   input.addEventListener('click',()=>{show();input.select();});input.addEventListener('input',()=>show(input.value));
   input.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='ArrowDown'){e.preventDefault();if(active?.wrap!==wrap)show();active.list.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();if(active?.wrap===wrap)active.list.querySelector('button')?.click();}});
   toggle.addEventListener('click',()=>active?.wrap===wrap?close():show());
   const blur=e=>{if(active?.wrap===wrap&&!wrap.contains(e.relatedTarget)&&!active.list.contains(e.relatedTarget))close();};
   wrap.addEventListener('focusout',blur);
   select.before(wrap);wrap.append(input,toggle,select);
   select.classList.add('itemFilterNative');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
   select.addEventListener('change',sync);
   new MutationObserver(()=>{if(active?.wrap===wrap)close();sync();}).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
   sync();
  });
 }
 window.SZO_ITEM_FILTER_SEARCH={enhance,close};
 const reader=document.getElementById('reader');if(reader)new MutationObserver(()=>{if(active&&!active.wrap.isConnected)close();}).observe(reader,{childList:true,subtree:true});
})();

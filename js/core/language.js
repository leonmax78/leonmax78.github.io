(function(){
  // V767: the OpenCC dictionary (~1.2MB) is fetched only when 簡 is in use, or quietly after the
  // page has settled so search can still match simplified input.
  let toSimple=null,toTraditional=null,loading=null;
  function loadConverter(){
    if(toSimple)return Promise.resolve();
    if(!loading)loading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='js/vendor/opencc/opencc-1.4.2.js';s.async=true;
      s.onload=()=>{
        toSimple=OpenCC.Converter({from:'tw',to:'cn'});
        toTraditional=OpenCC.Converter({from:'cn',to:'tw'});
        window.SZO_LANGUAGE={toTraditional,toSimple};
        resolve();
      };
      s.onerror=()=>{loading=null;reject(new Error('opencc'));};
      document.head.appendChild(s);
    });
    return loading;
  }
  const saved=new WeakMap();
  const skip='script,style,textarea,code,pre,svg,[contenteditable], [translate="no"],.notranslate';
  let mode='tw';
  try{if(localStorage.getItem('szo.language')==='cn')mode='cn';}catch(_error){}
  const control=document.querySelector('.languageControl');
  control.querySelectorAll('button').forEach(button=>{button.disabled=false;});
  function convert(node,key,current,write){
    let record=saved.get(node);
    if(!record){record={};saved.set(node,record);}
    let entry=record[key];
    if(!entry||current!==entry.output)entry=record[key]={original:current,output:current};
    const output=mode==='cn'&&toSimple?toSimple(entry.original):entry.original;
    if(output!==current)write(output);
    entry.output=output;
  }
  function visit(node){
    if(node.nodeType===3){
      if(node.parentElement&&!node.parentElement.closest(skip)){
        convert(node,'text',node.nodeValue,value=>{node.nodeValue=value;});
      }
      return;
    }
    if(node.nodeType!==1||node.matches(skip))return;
    if(node.tagName==='OPTION'&&!node.hasAttribute('value'))node.setAttribute('value',node.value);
    for(const attr of ['placeholder','title','aria-label','alt']){
      if(node.hasAttribute(attr))convert(node,attr,node.getAttribute(attr),value=>node.setAttribute(attr,value));
    }
    for(const child of node.childNodes)visit(child);
  }
  const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']};
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const record of records){
      if(record.type==='childList')for(const node of record.addedNodes)visit(node);
      else visit(record.target);
    }
    observer.observe(document.body,options);
  });
  function render(){
    control.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===mode)));
    if(mode==='cn'&&!toSimple){loadConverter().then(render,()=>{});return;}
    observer.disconnect();
    visit(document.body);
    document.documentElement.lang=mode==='cn'?'zh-Hans':'zh-Hant';
    control.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===mode)));
    observer.observe(document.body,options);
  }
  control.addEventListener('click',event=>{
    const button=event.target.closest('[data-language]');
    if(!button)return;
    mode=button.dataset.language;
    try{localStorage.setItem('szo.language',mode);}catch(_error){}
    render();
  });
  render();
  if(mode!=='cn'){
    const later=()=>loadConverter().catch(()=>{});
    const idle=()=>setTimeout(()=>('requestIdleCallback' in window)?requestIdleCallback(later,{timeout:8000}):later(),4000);
    if(document.readyState==='complete')idle();else window.addEventListener('load',idle);
  }
})();

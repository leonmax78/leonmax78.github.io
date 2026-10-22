(function(){
  const toSimple=OpenCC.Converter({from:'tw',to:'cn'});
  const toTraditional=OpenCC.Converter({from:'cn',to:'tw'});
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
    const output=mode==='cn'?toSimple(entry.original):entry.original;
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
  window.SZO_LANGUAGE={toTraditional,toSimple};
  render();
})();

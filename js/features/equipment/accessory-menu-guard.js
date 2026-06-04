// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88ah 安全修正：主選單卡住保護 + 飾品職業細分 + 授權倒計時 */
(function(){
  const JOB_ACC_TIER = [
    {tier:'術攻', keys:['獨眼慧珠']},
    {tier:'物防', keys:['諾亞航令']},
    {tier:'術防', keys:['誅仙御鐸']},
    {tier:'血精', keys:['龍之印信']}
  ];
  function norm(v){return String(v||'').replace(/\s+/g,'').trim();}
  function jobAccTier(name){
    const s=norm(name);
    for(const r of JOB_ACC_TIER){
      if(r.keys.some(k=>s.includes(norm(k)))) return r.tier;
    }
    return '';
  }
  function enhanceAccessoryList(){
    if(typeof window.eqEquipList!=='function' || window.__v88ahEqListPatched) return;
    const old=window.eqEquipList;
    window.eqEquipList=function(){
      const arr=old.apply(this,arguments)||[];
      for(const e of arr){
        if((e.main_category==='飾品'||e.display_type==='飾品') && e.series_group==='職業'){
          const t=jobAccTier(e.name||e.base_name||e.search_text);
          if(t){
            e.accessory_tier=t;
            e.series_grade=t;
            e.tier=t;
            e.series='職業('+t+')';
            if(e.search_text && !String(e.search_text).includes(t)) e.search_text += ' '+t;
          }
        }
      }
      return arr;
    };
    window.__v88ahEqListPatched=true;
  }
  function base64DecodeAny(s){
    try{
      s=String(s||'').trim();
      if(!s)return '';
      s=s.replace(/-/g,'+').replace(/_/g,'/');
      while(s.length%4)s+='=';
      return decodeURIComponent(escape(atob(s)));
    }catch(e){try{return atob(s)}catch(_){return ''}}
  }
  function expiryFromLicense(key){
    const parts=String(key||'').split('.');
    const tries=[];
    if(parts.length>=2)tries.push(parts[1]);
    tries.push(key);
    for(const p of tries){
      const txt=base64DecodeAny(p);
      if(!txt)continue;
      try{
        const obj=JSON.parse(txt);
        let v=obj.exp||obj.expires||obj.expiry||obj.expiresAt||obj.expireAt||obj.validUntil||obj.until;
        if(typeof v==='number')return v<20000000000?v*1000:v;
        if(typeof v==='string'){
          const n=Number(v); if(!isNaN(n))return n<20000000000?n*1000:n;
          const d=Date.parse(v); if(!isNaN(d))return d;
        }
      }catch(e){}
    }
    return 0;
  }
  function updateLicenseCountdown(){
    if(typeof AUTH_REQUIRED==='undefined' || !AUTH_REQUIRED)return;
    const el=document.getElementById('topStatus'); if(!el)return;
    el.style.display='block';
    const key=localStorage.getItem('combined_manual_tool_license_key')||localStorage.getItem('license_key')||'';
    const exp=expiryFromLicense(key);
    if(!exp){el.textContent='授權已啟用';return;}
    const diff=exp-Date.now();
    if(diff<=0){el.textContent='授權已到期';return;}
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    el.textContent='授權剩餘：'+d+'天 '+h+'小時 '+m+'分';
  }
  function safeCall(name,arg){try{if(typeof window[name]==='function')window[name](arg);}catch(e){console.error('[v88ah]',name,e)}}
  function installMenuRescue(){
    if(window.__v88ahMenuRescue)return; window.__v88ahMenuRescue=true;
    document.addEventListener('click',function(e){
      const view=e.target.closest&&e.target.closest('[data-view]')?.dataset.view;
      if(view){
        if(view==='jiang')safeCall('openJiangMenuOnly');
        else safeCall('setView',view);
      }
      const jiang=e.target.closest&&e.target.closest('[data-jiang]')?.dataset.jiang;
      if(jiang)safeCall('setJiang',jiang);
      const item=e.target.closest&&e.target.closest('[data-item-open]')?.dataset.itemOpen;
      if(item)safeCall('setItemSub',item);
    },false);
  }
  function boot(){
    enhanceAccessoryList();
    installMenuRescue();
    updateLicenseCountdown();
    setTimeout(()=>{enhanceAccessoryList(); updateLicenseCountdown(); if(typeof window.eqRefreshFilters==='function')try{window.eqRefreshFilters();}catch(e){}},600);
  }
  document.addEventListener('DOMContentLoaded',boot);
  if(document.readyState!=='loading')boot();
  setInterval(updateLicenseCountdown,60000);
})();

// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
(function(){
  function by(id){return document.getElementById(id)}
  function decodeMaybe(s){try{s=String(s||'').trim().replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return decodeURIComponent(escape(atob(s)))}catch(e){try{return atob(s)}catch(_){return ''}}}
  function parseExpFromKey(key){
    key=String(key||'').trim(); if(!key)return 0;
    const rawCandidates=[key];
    const parts=key.split('.'); if(parts.length>=2)rawCandidates.push(parts[1]);
    for(const c of rawCandidates){
      const texts=[c, decodeMaybe(c)].filter(Boolean);
      for(const txt of texts){
        try{const o=JSON.parse(txt); const v=o.exp||o.expires||o.expiry||o.expiresAt||o.expireAt||o.validUntil||o.until||o.end||o.deadline; if(v){const n=Number(v); if(Number.isFinite(n))return n<20000000000?n*1000:n; const d=Date.parse(v); if(Number.isFinite(d))return d;}}catch(e){}
        const m=String(txt).match(/(20\d{2})[-\/]?(0[1-9]|1[0-2])[-\/]?([0-2]\d|3[01])(?:[ T]([0-2]\d):?([0-5]\d)?)?/);
        if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]||23),Number(m[5]||59),59).getTime(); if(Number.isFinite(d))return d;}
      }
    }
    return 0;
  }
  function fallbackExp(key){
    if(!key)return 0;
    let exp=Number(localStorage.getItem('combined_manual_tool_license_fallback_exp')||0);
    if(exp>Date.now())return exp;
    exp=Date.now()+180*86400000;
    localStorage.setItem('combined_manual_tool_license_fallback_exp',String(exp));
    return exp;
  }
  function update(){
    if(typeof AUTH_REQUIRED==='undefined'||!AUTH_REQUIRED)return;
    const el=by('topStatus'); if(!el)return;
    el.style.setProperty('display','block','important');
    const key=localStorage.getItem('combined_manual_tool_license_key')||localStorage.getItem('license_key')||'';
    if(!key){el.textContent='未授權';return;}
    let exp=parseExpFromKey(key)||fallbackExp(key);
    const diff=exp-Date.now();
    if(diff<=0){el.textContent='授權已到期';return;}
    const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000);
    el.textContent='授權剩餘：'+d+'天 '+h+'小時 '+m+'分';
  }
  window.v88auUpdateLicenseCountdown=update;
  document.addEventListener('DOMContentLoaded',update);
  if(document.readyState!=='loading')setTimeout(update,50);
  setInterval(update,60000);
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='licenseSubmit')setTimeout(update,200)},true);
})();

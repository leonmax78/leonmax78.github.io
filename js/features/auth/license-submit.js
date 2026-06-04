// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88ar 授權驗證按鈕修正：可點、可儲存、通過後載入資料 */
(function(){
  function by(id){return document.getElementById(id)}
  function decodeB64Url(s){
    try{
      s=String(s||'').trim().replace(/-/g,'+').replace(/_/g,'/');
      while(s.length%4)s+='=';
      return decodeURIComponent(escape(atob(s)));
    }catch(e){try{return atob(s)}catch(_){return ''}}
  }
  function licenseExpiry(key){
    const k=String(key||'').trim();
    const parts=k.split('.');
    const candidates=[];
    if(parts.length>=2)candidates.push(parts[1]);
    candidates.push(k);
    for(const c of candidates){
      const txt=decodeB64Url(c);
      if(!txt)continue;
      try{
        const obj=JSON.parse(txt);
        let v=obj.exp||obj.expires||obj.expiry||obj.expiresAt||obj.expireAt||obj.validUntil||obj.until;
        if(typeof v==='number')return v<20000000000?v*1000:v;
        if(typeof v==='string'){
          const n=Number(v); if(!Number.isNaN(n))return n<20000000000?n*1000:n;
          const d=Date.parse(v); if(!Number.isNaN(d))return d;
        }
      }catch(e){}
    }
    return 0;
  }
  if(typeof window.validateLicenseKey!=='function'){
    window.validateLicenseKey=function(key){
      key=String(key||'').trim();
      if(key.length<8)throw new Error('授權鑰匙太短');
      const exp=licenseExpiry(key);
      if(exp && exp<Date.now())throw new Error('授權已到期');
      return true;
    };
  }
  function updateCountdownNow(){
    try{
      const el=by('topStatus');
      if(!el)return;
      const key=localStorage.getItem('combined_manual_tool_license_key')||localStorage.getItem('license_key')||'';
      const exp=licenseExpiry(key);
      el.style.display='block';
      if(!key){el.textContent='未授權';return;}
      if(!exp){el.textContent='授權已啟用';return;}
      const diff=exp-Date.now();
      if(diff<=0){el.textContent='授權已到期';return;}
      const d=Math.floor(diff/86400000);
      const h=Math.floor((diff%86400000)/3600000);
      const m=Math.floor((diff%3600000)/60000);
      el.textContent='授權剩餘：'+d+'天 '+h+'小時 '+m+'分';
    }catch(e){}
  }
  function unlockWithKey(key){
    key=String(key||'').trim();
    window.validateLicenseKey(key);
    localStorage.setItem('combined_manual_tool_license_key',key);
    localStorage.setItem('license_key',key);
    const modal=by('licenseModal');
    const shell=by('mainShell');
    if(modal)modal.style.display='none';
    if(shell)shell.style.display='block';
    updateCountdownNow();
    if(!window.__v88arLoadedAfterAuth && typeof window.loadAllData==='function'){
      window.__v88arLoadedAfterAuth=true;
      try{window.loadAllData()}catch(e){console.error(e)}
    }
  }
  function bindAuthButton(){
    const btn=by('licenseSubmit');
    if(!btn || btn.__v88arBound)return;
    btn.__v88arBound=true;
    btn.setAttribute('type','button');
    btn.addEventListener('click',function(e){
      e.preventDefault(); e.stopPropagation();
      const err=by('licenseError');
      if(err)err.textContent='';
      try{
        const key=(by('licenseInput')&&by('licenseInput').value)||'';
        unlockWithKey(key);
      }catch(ex){
        if(err)err.textContent=ex&&ex.message?ex.message:'授權驗證失敗，請確認鑰匙。';
      }
    },true);
  }
  document.addEventListener('DOMContentLoaded',function(){bindAuthButton();updateCountdownNow();});
  if(document.readyState!=='loading'){bindAuthButton();updateCountdownNow();}
})();

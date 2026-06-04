// V105：讀取 data/config.json，讓標題、署名、授權設定不用再寫死在 index.html
window.SZO_SITE_CONFIG = window.SZO_SITE_CONFIG || {};
async function loadSiteConfigV105(){
  try{
    const res = await fetch('data/config.json?ts=' + Date.now(), {cache:'no-store'});
    if(!res.ok) return;
    const cfg = await res.json();
    window.SZO_SITE_CONFIG = cfg || {};

    if(cfg.title){
      const el = document.getElementById('siteTitle') || document.querySelector('.brandTitle');
      if(el) el.textContent = cfg.title;
      document.title = cfg.title + (cfg.version ? '｜' + cfg.version : '');
    }
    { const mk = document.getElementById('siteMaker') || document.querySelector('.maker'); if(mk) mk.textContent = ''; }

    if(typeof cfg.authRequired === 'boolean'){
      window.AUTH_REQUIRED_FROM_CONFIG = cfg.authRequired;
    }

    if(cfg.licenseExpireText){
      const st = document.getElementById('topStatus');
      if(st && cfg.authRequired){
        st.style.display = 'block';
        st.textContent = cfg.licenseExpireText;
      }
    }
  }catch(err){
    console.warn('config.json 讀取失敗，改用 index 內建設定', err);
  }
}
loadSiteConfigV105();

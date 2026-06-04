// Loads the small site config after the shell is ready.
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
      document.title = cfg.title;
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
    console.warn('config.json load failed; using shell defaults.', err);
  }
}

loadSiteConfigV105();

// V281: appearance panel keeps only player-facing color controls.
(function(){
  const KEY = 'szo_ui_settings_v2';
  const DEFAULTS = {
    theme: 'jade',
    layout: 'normal',
    density: 'comfortable',
    cardStyle: 'soft',
    motion: 'normal',
    accent: '#2dd4bf',
    background: '#07111f'
  };
  const THEMES = {
    jade: { accent: '#2dd4bf', accent2: '#60a5fa', bg1: '#07111f', bg2: '#101827', panel: '#101a2d', panel2: '#0b1527', line: '#263a58' },
    azure: { accent: '#38bdf8', accent2: '#818cf8', bg1: '#071321', bg2: '#111827', panel: '#0d1b30', panel2: '#08172b', line: '#28415f' },
    violet: { accent: '#a78bfa', accent2: '#22d3ee', bg1: '#0c1020', bg2: '#171326', panel: '#15162b', panel2: '#101328', line: '#3e315f' },
    ember: { accent: '#f59e0b', accent2: '#38bdf8', bg1: '#111827', bg2: '#1b1720', panel: '#181827', panel2: '#141421', line: '#514026' },
    custom: null
  };

  function safeParse(raw){
    try{return raw ? JSON.parse(raw) : null;}catch(e){return null;}
  }

  function loadSettings(){
    const saved = safeParse(localStorage.getItem(KEY)) || safeParse(localStorage.getItem('szo_ui_settings_v1')) || {};
    return Object.assign({}, DEFAULTS, saved);
  }

  function saveSettings(next){
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function setVar(name, value){
    document.documentElement.style.setProperty(name, value);
  }

  function colorMixHex(a, b, ratio){
    const parse = c => {
      const h = String(c||'').replace('#','');
      return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0);
    };
    const x=parse(a), y=parse(b), r=Math.max(0,Math.min(1,ratio));
    const out=x.map((v,i)=>Math.round(v*r+y[i]*(1-r)).toString(16).padStart(2,'0'));
    return '#'+out.join('');
  }

  function readablePanelColor(bg, strength){
    const h=String(bg||'').replace('#','');
    const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0);
    const luminance=(0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2])/255;
    return luminance>0.42 ? colorMixHex(bg,'#07111f',strength) : colorMixHex(bg,'#ffffff',0.88);
  }

  function applySettings(settings){
    const theme = THEMES[settings.theme] || THEMES.jade;
    const accent = settings.theme === 'custom' ? (settings.accent || DEFAULTS.accent) : theme.accent;
    const accent2 = settings.theme === 'custom' ? '#60a5fa' : theme.accent2;
    const bg1 = settings.theme === 'custom' ? (settings.background || DEFAULTS.background) : theme.bg1;
    const bg2 = settings.theme === 'custom' ? colorMixHex(bg1, '#101827', 0.72) : theme.bg2;
    const panel = settings.theme === 'custom' ? readablePanelColor(bg1, 0.34) : theme.panel;
    const panel2 = settings.theme === 'custom' ? readablePanelColor(bg1, 0.22) : theme.panel2;
    const line = settings.theme === 'custom' ? colorMixHex(panel, accent2, 0.72) : theme.line;
    document.body.dataset.theme = settings.theme || DEFAULTS.theme;
    document.body.dataset.layout = DEFAULTS.layout;
    document.body.dataset.density = DEFAULTS.density;
    document.body.dataset.cardStyle = DEFAULTS.cardStyle;
    document.body.dataset.motion = DEFAULTS.motion;
    setVar('--accent', accent);
    setVar('--accent2', accent2);
    setVar('--bg', bg1);
    setVar('--bg2', bg2);
    setVar('--panel', panel);
    setVar('--panel2', panel2);
    setVar('--line', line);
  }

  function choiceButton(group, value, label){
    return `<button type="button" class="uiSettingChoice" data-ui-setting="${group}" data-ui-value="${value}">
      <b>${label}</b>
    </button>`;
  }

  function renderPanel(){
    if(document.getElementById('uiSettingsPanel')) return;
    const panel = document.createElement('div');
    panel.className = 'uiSettingsPanel';
    panel.id = 'uiSettingsPanel';
    panel.hidden = true;
    panel.innerHTML = `<div class="uiSettingsCard">
      <div class="uiSettingsHead">
        <div><h2>外觀設定</h2><p>調整目前瀏覽器的顏色顯示，重整後會保留，不影響資料與計算。</p></div>
        <button type="button" class="ghost" id="closeUiSettingsBtn">關閉</button>
      </div>
      <div class="uiSettingsPreview">
        <div class="uiPreviewTitle">神州工具箱</div>
        <div class="uiPreviewCards"><span></span><span></span><span></span></div>
      </div>
      <div class="uiSettingsSection">
        <h3>主題色</h3>
        <div class="uiSettingGrid themeGrid">
          ${choiceButton('theme','jade','碧海青')}
          ${choiceButton('theme','azure','星藍')}
          ${choiceButton('theme','violet','玄紫')}
          ${choiceButton('theme','ember','金焰')}
          ${choiceButton('theme','custom','自訂色')}
        </div>
        <div class="uiColorGrid">
          <label class="uiColorPicker">主題色<input id="uiAccentColor" type="color" value="#2dd4bf"></label>
          <label class="uiColorPicker">背景色<input id="uiBgColor" type="color" value="#07111f"></label>
        </div>
      </div>
      <div class="uiSettingsFooter">
        <button type="button" class="ghost" id="resetUiSettingsBtn">重設外觀</button>
      </div>
    </div>`;
    document.body.appendChild(panel);
  }

  function syncPanel(settings){
    document.querySelectorAll('[data-ui-setting]').forEach(btn=>{
      btn.classList.toggle('active', settings[btn.dataset.uiSetting] === btn.dataset.uiValue);
    });
    const color = document.getElementById('uiAccentColor');
    if(color) color.value = settings.accent || DEFAULTS.accent;
    const bg = document.getElementById('uiBgColor');
    if(bg) bg.value = settings.background || DEFAULTS.background;
  }

  function setSettings(next){
    window.SZO_UI_SETTINGS = Object.assign({}, DEFAULTS, next);
    saveSettings(window.SZO_UI_SETTINGS);
    applySettings(window.SZO_UI_SETTINGS);
    syncPanel(window.SZO_UI_SETTINGS);
  }

  function openPanel(){
    renderPanel();
    syncPanel(window.SZO_UI_SETTINGS);
    const panel = document.getElementById('uiSettingsPanel');
    if(panel) panel.hidden = false;
  }

  function closePanel(){
    const panel = document.getElementById('uiSettingsPanel');
    if(panel) panel.hidden = true;
  }

  window.SZO_UI_SETTINGS = loadSettings();
  applySettings(window.SZO_UI_SETTINGS);

  fetch('data/site_design.json', { cache: 'no-store' })
    .then(res=>res.ok ? res.json() : null)
    .then(design=>{
      if(!design || safeParse(localStorage.getItem(KEY))) return;
      window.SZO_UI_SETTINGS = Object.assign({}, window.SZO_UI_SETTINGS, design);
      applySettings(window.SZO_UI_SETTINGS);
      syncPanel(window.SZO_UI_SETTINGS);
    })
    .catch(()=>{});

  document.addEventListener('click', function(ev){
    if(ev.target.closest('#openUiSettingsBtn')){ev.preventDefault();openPanel();return;}
    if(ev.target.closest('#closeUiSettingsBtn')){ev.preventDefault();closePanel();return;}
    if(ev.target.closest('#resetUiSettingsBtn')){ev.preventDefault();setSettings(DEFAULTS);return;}
    if(ev.target.id === 'uiSettingsPanel'){closePanel();return;}
    const choice = ev.target.closest('[data-ui-setting]');
    if(!choice) return;
    const next = Object.assign({}, window.SZO_UI_SETTINGS);
    next[choice.dataset.uiSetting] = choice.dataset.uiValue;
    setSettings(next);
  });

  document.addEventListener('input', function(ev){
    if(ev.target.id !== 'uiAccentColor' && ev.target.id !== 'uiBgColor') return;
    const patch = ev.target.id === 'uiAccentColor' ? { accent: ev.target.value } : { background: ev.target.value };
    const next = Object.assign({}, window.SZO_UI_SETTINGS, { theme: 'custom' }, patch);
    setSettings(next);
  });
})();

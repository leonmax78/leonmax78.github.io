// V281: appearance panel keeps only player-facing color controls.
// V677: theme cards with swatches, live mini preview, quick accent dots, 墨金/朱砂 themes.
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
    ink: { accent: '#d6b36a', accent2: '#a8a29e', bg1: '#0e0f11', bg2: '#17171a', panel: '#18181b', panel2: '#121214', line: '#3a352c' },
    cinnabar: { accent: '#f05d5e', accent2: '#f6b26b', bg1: '#140b0d', bg2: '#1d1114', panel: '#1f1316', panel2: '#170e11', line: '#4a2a2f' },
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

  const THEME_INFO = [
    ['jade','碧海青','清透青綠，預設'],
    ['azure','星藍','冷靜夜空藍'],
    ['violet','玄紫','神秘紫青'],
    ['ember','金焰','暖金烈焰'],
    ['ink','墨金','水墨黑底配金字'],
    ['cinnabar','朱砂','印泥紅與暖橘']
  ];
  const QUICK_ACCENTS = ['#2dd4bf','#38bdf8','#a78bfa','#f59e0b','#d6b36a','#f05d5e','#4ade80','#f472b6'];

  function themeCard(id, name, desc){
    const t = THEMES[id];
    return `<button type="button" class="uiThemeCard" data-ui-setting="theme" data-ui-value="${id}" style="--sw-bg:${t.bg1};--sw-panel:${t.panel};--sw-a:${t.accent};--sw-b:${t.accent2};--sw-line:${t.line}">
      <span class="uiSwatch" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="uiThemeText"><b>${name}</b><small>${desc}</small></span>
    </button>`;
  }

  function renderPanel(){
    if(document.getElementById('uiSettingsPanel')) return;
    const panel = document.createElement('div');
    panel.className = 'uiSettingsPanel';
    panel.id = 'uiSettingsPanel';
    panel.hidden = true;
    panel.innerHTML = `<div class="uiSettingsCard" role="dialog" aria-modal="true" aria-labelledby="uiSettingsTitle">
      <div class="uiSettingsHead">
        <div><h2 id="uiSettingsTitle">網頁外觀</h2><p>只改這台裝置的顏色，不影響資料與計算。</p></div>
        <button type="button" class="uiCloseBtn" id="closeUiSettingsBtn" aria-label="關閉">✕</button>
      </div>
      <div class="uiSettingsBody">
        <div class="uiSettingsPreview" aria-hidden="true">
          <div class="uiMiniTop"><span class="uiMiniLogo">神州</span><span class="uiMiniSearch"></span><span class="uiMiniBtn"></span></div>
          <div class="uiMiniMain">
            <div class="uiMiniNav"><i class="on"></i><i></i><i></i><i></i></div>
            <div class="uiMiniCard"><b>預覽</b><span class="uiMiniTag">掉落</span><span class="uiMiniLine"></span><span class="uiMiniLine short"></span><span class="uiMiniAction">搜尋</span></div>
          </div>
        </div>
        <div class="uiSettingsControls">
          <h3>主題</h3>
          <div class="uiThemeGrid">${THEME_INFO.map(([id,n,d])=>themeCard(id,n,d)).join('')}</div>
          <h3>自訂顏色</h3>
          <div class="uiQuickAccents" role="group" aria-label="快速主題色">${QUICK_ACCENTS.map(c=>`<button type="button" class="uiDot" data-ui-accent="${c}" style="--dot:${c}" aria-label="主題色 ${c}"></button>`).join('')}</div>
          <div class="uiColorGrid">
            <label class="uiColorPicker"><span>主題色</span><input id="uiAccentColor" type="color" value="#2dd4bf"></label>
            <label class="uiColorPicker"><span>背景色</span><input id="uiBgColor" type="color" value="#07111f"></label>
          </div>
        </div>
      </div>
      <div class="uiSettingsFooter">
        <button type="button" class="ghost" id="resetUiSettingsBtn">恢復預設</button>
        <button type="button" class="uiDoneBtn" id="doneUiSettingsBtn">完成</button>
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
    const accent = settings.theme === 'custom' ? (settings.accent || DEFAULTS.accent) : (THEMES[settings.theme] || THEMES.jade).accent;
    document.querySelectorAll('[data-ui-accent]').forEach(btn=>btn.classList.toggle('active', settings.theme === 'custom' && btn.dataset.uiAccent.toLowerCase() === String(accent).toLowerCase()));
    const custom = document.querySelector('.uiColorGrid');
    if(custom) custom.classList.toggle('active', settings.theme === 'custom');
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
    if(panel){panel.hidden = false;const active = panel.querySelector('.uiThemeCard.active') || panel.querySelector('.uiCloseBtn');if(active) active.focus({preventScroll:true});}
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
    if(ev.target.closest('#closeUiSettingsBtn,#doneUiSettingsBtn')){ev.preventDefault();closePanel();return;}
    const dot = ev.target.closest('[data-ui-accent]');
    if(dot){ev.preventDefault();setSettings(Object.assign({}, window.SZO_UI_SETTINGS, { theme: 'custom', accent: dot.dataset.uiAccent }));return;}
    if(ev.target.closest('#resetUiSettingsBtn')){ev.preventDefault();setSettings(DEFAULTS);return;}
    if(ev.target.id === 'uiSettingsPanel'){closePanel();return;}
    const choice = ev.target.closest('[data-ui-setting]');
    if(!choice) return;
    const next = Object.assign({}, window.SZO_UI_SETTINGS);
    next[choice.dataset.uiSetting] = choice.dataset.uiValue;
    setSettings(next);
  });

  document.addEventListener('keydown', function(ev){
    const panel = document.getElementById('uiSettingsPanel');
    if(ev.key === 'Escape' && panel && !panel.hidden) closePanel();
  });

  document.addEventListener('input', function(ev){
    if(ev.target.id !== 'uiAccentColor' && ev.target.id !== 'uiBgColor') return;
    const patch = ev.target.id === 'uiAccentColor' ? { accent: ev.target.value } : { background: ev.target.value };
    const next = Object.assign({}, window.SZO_UI_SETTINGS, { theme: 'custom' }, patch);
    setSettings(next);
  });
})();

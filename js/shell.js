// V212 shell: 只負責產生網站外框 DOM。
(function(){
  const root = document.getElementById('appRoot') || document.body;
  root.innerHTML = `<div id="mainShell">
<header class="topbar"><div class="topline">
  <button class="menuBtn" id="openMenuBtn">☰</button>
  <div class="brand"><div class="brandTitle" id="siteTitle">神州降神、經驗、修練試算、掉落查詢系統</div></div>
  <div class="maker" id="siteMaker">讀取署名中...</div>
  <button class="shellSettingsBtn" id="openUiSettingsBtn" type="button">網頁外觀</button>
  <div class="status" id="topStatus">準備中</div>
</div></header>
<div class="backdrop" id="backdrop"></div>
<div class="app">
<aside class="drawer" id="drawer">
  <div class="drawerHead"><div><div class="drawerTitle">功能選單</div><div class="muted" style="font-size:12px">選好後回到閱讀頁</div></div><button class="ghost closeOnly" id="closeMenuBtn">✕</button></div>
  <div class="drawerBody">
    <div class="navGroup" id="navGroup">
      <button class="navBtn major active" data-view="home">首頁 <span>›</span></button>
      <button class="navBtn major" data-view="jiang">降神、經驗、修練試算 <span>›</span></button>
      <div class="formBox" id="jiangForm">
        <button class="navBtn sub" data-jiang="support">副降神模擬 <span>›</span></button>
        <button class="navBtn sub" data-jiang="compare">主降神比較 <span>›</span></button>
        <button class="navBtn sub" data-jiang="stars">20星等 <span>›</span></button>
        <button class="navBtn sub" data-jiang="starAura">星等 / 靈氣 <span>›</span></button>
        <button class="navBtn sub" data-jiang="expPill">等級 / 經驗丹 <span>›</span></button>
        <button class="navBtn sub" data-jiang="training">修練機制 <span>›</span></button>
        <div id="jiangFields"></div>
      </div>
      <button class="navBtn major" data-view="monster">怪物查詢 <span>›</span></button>
      <button class="navBtn major" data-view="item">道具查詢 <span>›</span></button>
      <div class="formBox" id="itemForm">
        <div class="subMenuNote">道具相關功能</div>
        <button class="navBtn sub" data-item-open="item">道具查詢 <span>›</span></button>
        <button class="navBtn sub" data-item-open="reverse">掉落反查 <span>›</span></button>
        <button class="navBtn sub" data-item-open="compound">裝備合成模擬 <span>›</span></button>
      </div>
      <button class="navBtn major" data-view="soul">武魂能力試算 <span>›</span></button>
      <button class="navBtn major" data-view="collect">武冠收錄資料 <span>›</span></button>
      <div class="formBox" id="collectForm">
        <div class="subMenuNote">武冠收錄資料</div>
        <button class="navBtn sub" data-collect-open="weapon">武防出處 <span>›</span></button>
        <button class="navBtn sub" data-collect-open="artifact">法器出處 <span>›</span></button>
        <button class="navBtn sub" data-collect-open="recipe">配方出處 <span>›</span></button>
        <button class="navBtn sub" data-collect-open="beast">封獸出處 <span>›</span></button>
      </div>
      <button class="navBtn major" data-view="shop">商店販賣資訊 <span>›</span></button>
    </div>
    <div class="navGroup" id="manualGroup" style="display:none">
      <div class="navTitle">備用手動載入</div>
      <div class="muted" style="font-size:12px">自動讀取失敗時才需要。</div>
      <input type="file" id="manualFiles" multiple accept=".ini,.csv,.txt">
    </div>
  </div>
</aside>
<main class="content"><div class="reader" id="reader"></div></main>
</div>
</div>
<div class="authModal" id="licenseModal"><div class="authBox"><h2>授權驗證</h2><div class="muted">請貼上授權鑰匙。</div><textarea id="licenseInput"></textarea><div class="error" id="licenseError"></div><button class="primary" id="licenseSubmit">驗證授權</button></div></div>
`;

  // V213：快速選單保險事件。
  // 這裡在 shell 生成 DOM 後立刻綁定一次，避免後續模組載入失敗或 init 時機改變時，左上角 ☰ 沒反應。
  function bindShellMenu(){
    const drawer = document.getElementById('drawer');
    const backdrop = document.getElementById('backdrop');
    const openBtn = document.getElementById('openMenuBtn');
    const closeBtn = document.getElementById('closeMenuBtn');
    const open = function(ev){
      if(ev){ ev.preventDefault(); ev.stopPropagation(); }
      if(drawer) drawer.classList.add('open');
      if(backdrop) backdrop.classList.add('open');
    };
    const close = function(ev){
      if(ev){ ev.preventDefault(); ev.stopPropagation(); }
      if(drawer) drawer.classList.remove('open');
      if(backdrop) backdrop.classList.remove('open');
    };
    if(openBtn) openBtn.addEventListener('click', open, true);
    if(closeBtn) closeBtn.addEventListener('click', close, true);
    if(backdrop) backdrop.addEventListener('click', close, true);
    window.SZO_OPEN_MENU = open;
    window.SZO_CLOSE_MENU = close;
  }
  bindShellMenu();

  // V221：模組尚未載入完成時，先擋住功能選單點擊。
  // 避免使用者第一次太快點「副降神模擬」時，先跑到舊版頁面，後面初始化又跳回首頁。
  document.addEventListener('click', function(ev){
    const hit = ev.target && ev.target.closest && ev.target.closest('[data-view],[data-jiang],[data-item-open]');
    if(!hit) return;
    if(window.SZO_READY) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const st = document.getElementById('topStatus');
    if(st) st.textContent = '模組載入中，請稍候再點一次';
  }, true);

})();

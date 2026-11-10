// V212 shell: 只負責產生網站外框 DOM。
(function(){
  const root = document.getElementById('appRoot') || document.body;
  root.innerHTML = `<div id="mainShell">
<header class="topbar"><div class="topline">
  <button class="menuBtn" id="openMenuBtn">☰</button>
  <div class="brand"><div class="brandTitle" id="siteTitle">神州-四海同舟</div></div>
  <div class="maker" id="siteMaker" aria-hidden="true"></div>
  <form class="topSearch" id="globalSearchForm" role="search">
    <input id="globalSearchInput" placeholder="全站搜尋" autocomplete="off">
    <button type="submit">搜尋</button>
  </form>
  <div class="shellSettingsBtn languageTools">
    <button id="openUiSettingsBtn" type="button">網頁外觀</button>
    <div class="languageControl" translate="no" role="group" aria-label="繁簡切換"><button type="button" data-language="tw" lang="zh-Hant" disabled>繁</button><button type="button" data-language="cn" lang="zh-Hans" disabled>简</button></div>
    <button type="button" class="szoChatLauncher" id="szoChatLauncher" disabled><span>即時聊天</span><small>未連線</small></button>
  </div>
  <div class="status" id="topStatus">準備中</div>
</div></header>
<div class="backdrop" id="backdrop"></div>
<div class="app">
<aside class="drawer" id="drawer">
  <div class="drawerHead"><div><div class="drawerTitle">功能選單</div><div class="muted" style="font-size:12px">選好後回到閱讀頁</div></div><button class="ghost closeOnly" id="closeMenuBtn">✕</button><button type="button" class="ghost drawerCollapseBtn" id="drawerCollapseBtn" title="收合功能選單" aria-label="收合功能選單">«</button></div>
  <div class="drawerBody">
    <div class="navGroup" id="navGroup">
      <button class="navBtn major active" data-view="home">首頁 <span>›</span></button>
      <button class="navBtn major" data-view="quest">任務查詢 <span>›</span></button>
      <button class="navBtn major" data-view="item">道具、掉落查詢、合成模擬、武冠收錄 <span>›</span></button>
      <div class="formBox" id="itemForm">
        <div class="subMenuNote">道具、武冠相關功能</div>
        <button class="navBtn sub" data-item-open="item">道具查詢 <span>›</span></button>
        <button class="navBtn sub" data-item-open="reverse">掉落反查 <span>›</span></button>
        <button class="navBtn sub" data-item-open="compound">常用配方合成模擬 <span>›</span></button>
        <button class="navBtn sub" data-view="collect">武冠收錄資料 <span>›</span></button>
      </div>
      <button class="navBtn major" data-view="monster">怪物、封獸查詢 <span>›</span></button>
      <div class="formBox" id="monsterForm">
        <div class="formTitle">怪物與封獸</div>
        <button class="navBtn sub" data-view="monsterQuery">查詢怪物 <span>›</span></button>
        <button class="navBtn sub" data-view="beastQuery">查詢封獸 <span>›</span></button>
      </div>
      <button class="navBtn major" data-view="skill">技能查詢 <span>›</span></button>
      <button class="navBtn major" data-view="mapMenu">地圖、商店查詢 <span>›</span></button>
      <div class="formBox" id="mapForm">
        <div class="subMenuNote">地圖與商店相關功能</div>
        <button class="navBtn sub" data-view="map">地圖查詢 <span>›</span></button>
        <button class="navBtn sub" data-view="shop">商店販賣資訊 <span>›</span></button>
      </div>
      <!-- The editor stays separate from item search and loads only when opened. -->
      <button class="navBtn major" data-view="jiang">降神、經驗、修練、寶石、武魂試算 <span>›</span></button>
      <div class="formBox" id="jiangForm">
        <div class="subMenuNote">降神、經驗、修練、寶石、武魂相關功能</div>
        <button class="navBtn sub" data-jiang="support">副降神模擬 <span>›</span></button>
        <button class="navBtn sub" data-jiang="recommend">副降神組合推薦方案 <span>›</span></button>
        <button class="navBtn sub" data-jiang="compare">主降神比較 <span>›</span></button>
        <button class="navBtn sub" data-jiang="stars">降神20星能力總表 <span>›</span></button>
        <button class="navBtn sub" data-jiang="starAura">星等/靈氣試算 <span>›</span></button>
        <button class="navBtn sub" data-jiang="expPill">等級/經驗丹試算 <span>›</span></button>
        <button class="navBtn sub" data-jiang="training">修練機制試算 <span>›</span></button>
        <button class="navBtn sub" data-view="gems">寶石試算、加工配方 <span>›</span></button>
        <button class="navBtn sub" data-view="soul">武魂能力試算 <span>›</span></button>
        <div id="jiangFields"></div>
      </div>
      <button class="navBtn major" data-view="autodata">離線內掛物品編輯 <span>›</span></button>
      <button class="navBtn major" data-view="trade">玩家交易區 <span>›</span></button>
      <button class="navBtn major" data-view="downloads">工具下載區 <span>›</span></button>
    </div>
    <div class="navGroup" id="manualGroup" style="display:none">
      <div class="navTitle">備用手動載入</div>
      <div class="muted" style="font-size:12px">自動讀取失敗時才需要。</div>
      <input type="file" id="manualFiles" multiple accept=".ini,.csv,.txt">
    </div>
    <div class="siteSupportTools" aria-label="站務連結">
      <button class="siteSupportBtn" id="openSupportBtn" type="button">贊助本站</button>
      <button class="siteSupportBtn" id="openContactBtn" type="button">聯絡站長</button>
    </div>
    <div class="visitorCounter" aria-label="網頁瀏覽人數">
      <div class="visitorCounterTitle">網頁瀏覽人數</div>
      <span class="visitorCounterBadgeBox">
        <img class="visitorCounterBadge" src="https://visitor-badge.laobi.icu/badge?page_id=leonmax78.test&left_text=%E2%80%8B&left_color=%23040605&right_color=%23040605&height=34&radius=999" alt="網頁瀏覽人數" loading="lazy">
      </span>
    </div>
  </div>
</aside>
<main class="content"><div class="reader" id="reader"></div></main>
</div>
</div>
<div class="authModal" id="licenseModal"><div class="authBox"><h2>授權驗證</h2><div class="muted">請貼上授權鑰匙。</div><textarea id="licenseInput"></textarea><div class="error" id="licenseError"></div><button class="primary" id="licenseSubmit">驗證授權</button></div></div>
<div class="siteModal" id="siteInfoModal" aria-hidden="true">
  <div class="siteModalBackdrop" data-site-modal-close></div>
  <section class="siteModalBox" role="dialog" aria-modal="true" aria-labelledby="siteInfoTitle">
    <button class="siteModalClose" type="button" data-site-modal-close>✕</button>
    <div class="siteModalEyebrow" id="siteInfoEyebrow">站務資訊</div>
    <h2 id="siteInfoTitle">贊助本站</h2>
    <div id="siteInfoBody"></div>
  </section>
</div>
<button type="button" class="drawerExpandBtn" id="drawerExpandBtn" title="展開功能選單" aria-label="展開功能選單">☰ 選單</button>
<button id="collectFloatingTopBtn" class="collectTopBtn globalTopBtn" type="button" data-global-top data-collect-top hidden>↑ 回到頂部</button>
`;
  // V664：首頁就是這張背景圖；外框建好就先畫出來，不必等全部模組載完（app-core 的 renderHome 之後會畫出相同內容）。
  const firstReader = root.querySelector('#reader');
  if(firstReader && !firstReader.firstChild){
    document.body.classList.add('isHomeView');
    firstReader.innerHTML = '<section class="homeBlank" aria-label="首頁"></section>';
  }
  // Save-file editing is desktop-only; keep the mobile navigation uncluttered.
  const editorNav = root.querySelector('[data-view="autodata"]');
  const editorMobileQuery = window.matchMedia('(max-width: 767px)');
  const updateEditorNav = () => {
    editorNav.style.display = editorMobileQuery.matches || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) ? 'none' : '';
  };
  updateEditorNav();
  editorMobileQuery.addEventListener('change', updateEditorNav);

  window.SZO_SET_GLOBAL_TOP_VISIBLE = function(visible){
    const btn = document.getElementById('collectFloatingTopBtn');
    if(btn) btn.hidden = !visible;
  };

  document.addEventListener('click', function(ev){
    const hit = ev.target && ev.target.closest ? ev.target.closest('[data-global-top]') : null;
    if(!hit) return;
    ev.preventDefault();
    ev.stopPropagation();
    try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){ window.scrollTo(0, 0); }
  }, true);

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

  function bindSiteInfoTools(){
    const modal = document.getElementById('siteInfoModal');
    const title = document.getElementById('siteInfoTitle');
    const eyebrow = document.getElementById('siteInfoEyebrow');
    const body = document.getElementById('siteInfoBody');
    if(!modal || !title || !body) return;

    const paypalUrl = 'https://paypal.me/leonmax78';
    const issueUrl = 'https://github.com/leonmax78/SZOjiangshenNokey.github.io/issues';
    const discordName = 'leonmax78';
    const gmail = 'leonmax78@gmail.com';
    const jkopayImage = 'assets/donation-jkopay.jpg';
    const jkopayCode = '396';
    const jkopayAccount = '901616056';
    const ipassBankCode = '391';
    const ipassAccount = '0000001517184496';
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    const open = (kind) => {
      if(kind === 'contact'){
        if(eyebrow) eyebrow.textContent = '聯絡站長';
        title.textContent = '聯絡站長';
        body.innerHTML = `
          <p>資料錯誤、功能建議、更新問題，可以用 GitHub Issues 留紀錄，也可以透過 Discord 或 Gmail 聯絡站長。</p>
          <div class="siteInfoList">
            <div><span>問題回報</span><strong>GitHub Issues</strong></div>
            <div><span>Discord</span><strong>${escapeHtml(discordName)}</strong></div>
            <div><span>Gmail</span><strong>${escapeHtml(gmail)}</strong></div>
          </div>
          <div class="siteModalActions">
            <a class="siteActionLink primaryLike" href="${issueUrl}" target="_blank" rel="noopener">開啟問題回報</a>
            <button class="primary" type="button" data-copy-text="${escapeHtml(discordName)}">複製 Discord</button>
            <a class="siteActionLink" href="mailto:${escapeHtml(gmail)}">寄信給站長</a>
          </div>
        `;
      }else{
        if(eyebrow) eyebrow.textContent = '贊助本站';
        title.textContent = '贊助本站';
        body.innerHTML = `
          <p>如果這個工具對你有幫助，可以自由贊助本站維護。贊助完全自願，不影響任何功能使用，感謝支持。</p>
          <div class="donationGrid">
            <div class="donationPanel">
              <div class="donationLabel">PayPal</div>
              <div class="donationTitle">線上贊助</div>
              <a class="siteActionLink primaryLike" href="${paypalUrl}" target="_blank" rel="noopener">前往 PayPal</a>
            </div>
            <div class="donationPanel donationQrPanel">
              <div class="donationLabel">街口支付</div>
              <img class="donationQr" src="${jkopayImage}" alt="街口支付收款 QR Code" loading="lazy">
              <div class="donationCodeList">
                <div><span>街口代碼</span><strong>${escapeHtml(jkopayCode)}</strong></div>
                <div><span>街口帳號</span><strong>${escapeHtml(jkopayAccount)}</strong></div>
              </div>
            </div>
            <div class="donationPanel">
              <div class="donationLabel">iPASS MONEY</div>
              <div class="donationTitle">手動轉帳資訊</div>
              <div class="donationCodeList">
                <div><span>電支機構代號</span><strong>${escapeHtml(ipassBankCode)}</strong></div>
                <div><span>iPASS MONEY</span><strong>${escapeHtml(ipassAccount)}</strong></div>
              </div>
            </div>
          </div>
          <div class="siteModalActions">
            <button class="primary" type="button" data-copy-text="${escapeHtml(jkopayAccount)}">複製街口帳號</button>
            <button class="primary" type="button" data-copy-text="${escapeHtml(ipassAccount)}">複製 iPASS MONEY</button>
          </div>
          <div class="siteInfoHint">街口這張收款碼可先當作固定收款用。若有人反應掃碼失敗，可用街口代碼與街口帳號手動輸入。</div>
        `;
      }
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };

    document.getElementById('openSupportBtn')?.addEventListener('click', (ev) => { ev.preventDefault(); open('support'); });
    document.getElementById('openContactBtn')?.addEventListener('click', (ev) => { ev.preventDefault(); open('contact'); });
    modal.addEventListener('click', async (ev) => {
      const closeHit = ev.target && ev.target.closest && ev.target.closest('[data-site-modal-close]');
      if(closeHit){ close(); return; }
      const copyBtn = ev.target && ev.target.closest && ev.target.closest('[data-copy-text]');
      if(!copyBtn) return;
      const text = copyBtn.getAttribute('data-copy-text') || '';
      try{
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '已複製';
      }catch(err){
        copyBtn.textContent = text;
      }
    });
    document.addEventListener('keydown', (ev) => {
      if(ev.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }
  bindSiteInfoTools();

  async function runGlobalSearch(){
    const input = document.getElementById('globalSearchInput');
    const q = String(input && input.value || '').trim();
    if(!q) return;
    window.SZO_PENDING_GLOBAL_SEARCH = q;
    if(typeof window.setView === 'function') await window.setView('qa');
    else setTimeout(runGlobalSearch, 250);
  }
  document.addEventListener('submit', async function(ev){
    if(!ev.target || ev.target.id !== 'globalSearchForm') return;
    ev.preventDefault();
    await runGlobalSearch();
  });
  document.addEventListener('click', async function(ev){
    if(!ev.target || !ev.target.closest || !ev.target.closest('#globalSearchForm button')) return;
    ev.preventDefault();
    await runGlobalSearch();
  });
  document.addEventListener('keydown', async function(ev){
    if(!ev.target || ev.target.id !== 'globalSearchInput' || ev.key !== 'Enter' || ev.isComposing) return;
    ev.preventDefault();
    await runGlobalSearch();
  });

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

  // V365：手機瀏覽器可能把已開啟的 SPA 分頁放回前景，卻保留舊資料陣列。
  // 回到分頁時檢查 build_meta；若線上資料較新，重新整理一次拿最新 bundle。
  (function bindDataFreshnessGuard(){
    const currentBuild = document.body?.dataset?.buildAt || '';
    if(!currentBuild || !window.fetch) return;
    let checking = false;
    let lastCheck = 0;
    async function checkFreshData(){
      const now = Date.now();
      if(checking || now - lastCheck < 15000) return;
      checking = true;
      lastCheck = now;
      try{
        const res = await fetch('data/build_meta.json?fresh=' + now, { cache: 'no-store' });
        if(!res.ok) return;
        const meta = await res.json();
        const remoteBuild = String(meta && meta.built_at || '');
        if(!remoteBuild || remoteBuild === currentBuild) return;
        const reloadKey = 'szo_reloaded_build_' + remoteBuild;
        if(sessionStorage.getItem(reloadKey)) return;
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
      }catch(err){
        // Ignore network failures; normal navigation still works.
      }finally{
        checking = false;
      }
    }
    window.addEventListener('focus', checkFreshData);
    window.addEventListener('pageshow', checkFreshData);
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible') checkFreshData();
    });
  })();

  // V662：桌機版左側功能選單可收合，讓地圖等內容區更寬；狀態記在本機瀏覽器。
  (function(){
    const KEY = 'szo:drawerCollapsed';
    const root = document.documentElement;
    function apply(on){
      root.classList.toggle('szoDrawerCollapsed', !!on);
      try{ localStorage.setItem(KEY, on ? '1' : '0'); }catch(e){}
      try{ window.dispatchEvent(new Event('resize')); }catch(e){}
    }
    try{ if(localStorage.getItem(KEY) === '1') root.classList.add('szoDrawerCollapsed'); }catch(e){}
    document.getElementById('drawerCollapseBtn')?.addEventListener('click', () => apply(true));
    document.getElementById('drawerExpandBtn')?.addEventListener('click', () => apply(false));
  })();

})();

// V680: header search shows grouped suggestions (items / monsters / maps / NPCs) while typing.
(function(){
  const LIMIT = { item: 5, monster: 5, map: 3, npc: 4, quest: 4, talk: 4 };
  let talkIndex = null, dismissed = false;
  let mapIndex = null, timer = 0, active = -1, rows = [], composing = false, seq = 0;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => { v = String(v ?? ''); if(window.SZO_LANGUAGE) v = window.SZO_LANGUAGE.toSimple(v); return v.toLowerCase().replace(/[\s　]+/g, ''); };
  const input = () => document.getElementById('globalSearchInput');
  function box(){
    let el = document.getElementById('globalSuggest');
    if(!el){
      el = document.createElement('div');
      el.id = 'globalSuggest'; el.className = 'globalSuggest'; el.hidden = true; el.setAttribute('role', 'listbox');
      document.body.appendChild(el);
    }
    return el;
  }
  async function loadMapIndex(){
    if(mapIndex) return mapIndex;
    const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
    mapIndex = fetch('data/stage_map_index.json?v=' + v, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    return mapIndex;
  }
  async function loadTalkIndex(){
    if(talkIndex) return talkIndex;
    const v = encodeURIComponent(document.body?.dataset?.version || 'dev');
    talkIndex = fetch('data/npc_item_talk.json?v=' + v, { cache: 'force-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    return talkIndex;
  }
  // 「交出 / 持有 / 獲得」 rows for an item keyword, best matches first.
  window.szoItemTalkRows = async function(raw, limit){
    const q = norm(raw); if(q.length < 2) return [];
    const t = await loadTalkIndex(); const items = t.items || {}, npcs = t.npcs || {};
    const names = Object.keys(items).filter(n => norm(n).includes(q))
      .sort((a,b) => (norm(a) === q ? 0 : 1) - (norm(b) === q ? 0 : 1) || a.length - b.length);
    const ORDER = { t: 0, h: 1, g: 2 }, VERB = { t: '交出', h: '持有', g: '獲得' };
    // One row per item × relation × NPC; several dialogue nodes of the same NPC are merged.
    const out = [], byKey = new Map();
    for(const name of names.slice(0, 6)){
      const list = items[name].slice().sort((a,b) => ORDER[a[3]] - ORDER[b[3]]);
      for(const [npcId, stageId, msgId, kind, other] of list){
        if(kind === 'h' && byKey.has(`${name}|t|${npcId}`)) continue;  // already listed as hand-in
        const k = `${name}|${kind}|${npcId}`;
        const gets = String(other || '').replace(/…$/, '').split('、').filter(Boolean);
        if(byKey.has(k)){ const r = byKey.get(k); r.count++; for(const g of gets) if(!r.gets.includes(g)) r.gets.push(g); continue; }
        const [npcName, stageName] = npcs[npcId] || ['NPC', ''];
        const row = { kind: 'talk', item: name, rel: kind, verb: VERB[kind], label: npcName, key: `${stageId}:${npcId}:${msgId}`, stageName, npcId, gets, count: 1 };
        Object.defineProperty(row, 'sub', { enumerable: true, get(){ const g = this.gets; return `${this.verb}「${this.item}」${g.length ? ' → ' + g.slice(0, 4).join('、') + (g.length > 4 ? '…' : '') : ''}${this.stageName ? '・' + this.stageName : ''}`; } });
        byKey.set(k, row); out.push(row);
      }
    }
    return limit ? out.slice(0, limit) : out;
  };
  function rank(list, getName, q, limit, bonus){
    const out = [], seen = new Set();
    for(let i = 0; i < list.length; i++){
      const name = getName(list[i]); const n = norm(name);
      if(!n || !n.includes(q)) continue;
      const score = (n === q ? 0 : n.startsWith(q) ? 1 : 2) * 1e6 + (bonus ? bonus(list[i]) : 0) + n.length * 1000 + i / 1e3;
      out.push({ row: list[i], name, score });
    }
    out.sort((a,b) => a.score - b.score);
    const res = [];
    for(const r of out){ const key = r.name + '|' + (r.row.level || ''); if(seen.has(key)) continue; seen.add(key); res.push(r); if(res.length >= limit) break; }
    return res;
  }
  async function compute(raw){
    const q = norm(raw);
    if(!q) return [];
    try{ if(typeof window.ensureSearchIndexLoaded === 'function') await window.ensureSearchIndexLoaded(); }catch(e){}
    const idx = (window.SZO_DATA_BUNDLES || {}).search_index || {};
    const maps = await loadMapIndex();
    const out = [];
    for(const r of rank(idx.items || [], x => x.name, q, LIMIT.item)) out.push({ kind: 'item', label: r.name, sub: 'ID ' + r.row.id, id: r.row.id });
    for(const r of rank(idx.monsters || [], x => x.name, q, LIMIT.monster)) out.push({ kind: 'monster', label: r.name, sub: r.row.level ? 'Lv.' + r.row.level : '', id: r.row.id });
    for(const r of rank(maps.stages || [], x => x.stageName, q, LIMIT.map)) out.push({ kind: 'map', label: r.name, sub: '', id: r.row.stageId });
    const npcs = (maps.npcs || []).map(([name, stageId, npcId, shop, stageName]) => ({ name, stageId, npcId, shop, stageName }));
    npcs.sort((a,b) => b.shop - a.shop);
    const npcCount = new Map();
    for(const n of npcs) npcCount.set(n.name, (npcCount.get(n.name) || 0) + 1);
    for(const r of rank(npcs, x => x.name, q, LIMIT.npc, x => x.shop ? 0 : 500000)){
      const more = npcCount.get(r.name) > 1 ? ` 等 ${npcCount.get(r.name)} 處` : '';
      out.push({ kind: 'npc', label: r.name, sub: r.row.stageName + more + (r.row.shop ? '・商店' : ''), id: r.row.npcId, stageId: r.row.stageId, stageName: r.row.stageName, shop: r.row.shop });
    }
    try{ if(typeof window.ensureQuestPageLoaded === 'function') await window.ensureQuestPageLoaded(); out.push(...await window.szoQuestRows(raw, LIMIT.quest)); }catch(e){}
    try{ out.push(...await window.szoItemTalkRows(raw, LIMIT.talk)); }catch(e){}
    return out;
  }
  const KIND = { item: '道具', monster: '怪物', map: '地圖', npc: 'NPC', quest: '任務', talk: '兌換・任務對話' };
  function render(raw){
    const el = box(); if(!el) return;
    if(!rows.length){ el.hidden = true; el.innerHTML = ''; return; }
    let last = '';
    el.innerHTML = rows.map((r, i) => {
      const head = r.kind !== last ? `<div class="gsHead">${KIND[r.kind]}</div>` : '';
      last = r.kind;
      return `${head}<div role="option" tabindex="-1" class="gsRow${i === active ? ' active' : ''}" data-gs="${i}"><b>${esc(r.label)}</b><small>${esc(r.sub)}</small></div>`;
    }).join('') + `<div role="option" tabindex="-1" class="gsAll${active === rows.length ? ' active' : ''}" data-gs="all">查看「${esc(raw)}」的全部結果</div>`;
    place(el);
    el.hidden = false;
  }
  function place(el){
    const form = document.getElementById('globalSearchForm');
    if(!form) return;
    const r = form.getBoundingClientRect();
    const narrow = window.innerWidth < 600;
    el.style.top = Math.round(r.bottom + 6) + 'px';
    el.style.left = narrow ? '12px' : Math.round(r.left) + 'px';
    el.style.width = narrow ? 'calc(100vw - 24px)' : Math.max(320, Math.round(r.width)) + 'px';
  }
  window.addEventListener('resize', () => { const el = document.getElementById('globalSuggest'); if(el && !el.hidden) place(el); });
  window.addEventListener('scroll', () => { const el = document.getElementById('globalSuggest'); if(el && !el.hidden) place(el); }, { passive: true });
  function hide(){ const el = box(); if(el){ el.hidden = true; } active = -1; }
  async function update(){
    const raw = String(input()?.value || '').trim();
    const my = ++seq;
    if(!raw){ rows = []; hide(); return; }
    const next = await compute(raw);
    if(my !== seq || dismissed) return;
    rows = next; active = -1; render(raw);
  }
  async function openRow(r){
    hide();
    input()?.blur();
    const P = window.SZO_PREVIEW;
    try{
      if(r.kind === 'item'){ if(P) return P.open('item', r.id); if(window.ensureItemPageLoaded) await window.ensureItemPageLoaded(); if(window.showItem) window.showItem(r.id); }
      else if(r.kind === 'monster'){ if(P) return P.open('monster', r.id); if(window.ensureMonsterPageLoaded) await window.ensureMonsterPageLoaded(); if(window.showMonster) window.showMonster(r.id); }
      else if(r.kind === 'map'){ if(window.ensureMapPageLoaded) await window.ensureMapPageLoaded(); if(window.openMapSearchLocation) await window.openMapSearchLocation(r.label, ''); }
      else if(r.kind === 'quest'){ if(P) return P.open('quest', r.id); }
      else if(r.kind === 'talk'){ if(P) return P.open('npc', r.key); }
      else if(r.kind === 'npc'){
        if(P) return P.open(r.shop ? 'npcshop' : 'npc', r.stageId + ':' + r.id);
        if(window.ensureMapPageLoaded) await window.ensureMapPageLoaded(); if(window.openMapSearchLocation) await window.openMapSearchLocation(r.stageName, r.label, r.id);
      }
    }catch(e){ console.error(e); }
  }
  function submitAll(){ hide(); document.getElementById('globalSearchForm')?.requestSubmit?.(); }
  document.addEventListener('input', ev => {
    if(ev.target?.id !== 'globalSearchInput' || composing) return;
    dismissed = false;
    clearTimeout(timer); timer = setTimeout(update, 180);
  });
  document.addEventListener('compositionstart', ev => { if(ev.target?.id === 'globalSearchInput') composing = true; });
  document.addEventListener('compositionend', ev => { if(ev.target?.id === 'globalSearchInput'){ composing = false; dismissed = false; clearTimeout(timer); timer = setTimeout(update, 120); } });
  document.addEventListener('focusin', ev => { if(ev.target?.id === 'globalSearchInput' && rows.length && ev.target.value.trim() && !dismissed) render(ev.target.value.trim()); });
  // Searching (button or Enter) shows the full results page, so the dropdown closes and stays
  // closed — including a suggestion lookup still in flight — until the user types again.
  function dismiss(){ clearTimeout(timer); seq++; dismissed = true; hide(); input()?.blur(); }
  window.szoDismissSuggest = dismiss;
  document.addEventListener('submit', ev => { if(ev.target?.id === 'globalSearchForm') dismiss(); }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#globalSearchForm button')) dismiss(); }, true);
  document.addEventListener('keydown', ev => {
    if(ev.target?.id !== 'globalSearchInput' || ev.isComposing) return;
    const el = box(); const open = el && !el.hidden && rows.length;
    if(ev.key === 'Escape'){ hide(); return; }
    if(!open){ if(ev.key === 'Enter') dismiss(); return; }
    if(ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      ev.preventDefault();
      const n = rows.length + 1;
      active = ev.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n;
      render(ev.target.value.trim());
      return;
    }
    if(ev.key === 'Enter' && active >= 0 && active < rows.length){
      ev.preventDefault(); ev.stopImmediatePropagation();
      openRow(rows[active]);
      return;
    }
    if(ev.key === 'Enter') dismiss();
  }, true);
  document.addEventListener('click', ev => {
    const hit = ev.target?.closest?.('#globalSuggest [data-gs]');
    if(hit){
      ev.preventDefault(); ev.stopPropagation();
      if(hit.dataset.gs === 'all') submitAll(); else openRow(rows[Number(hit.dataset.gs)]);
      return;
    }
    if(!ev.target?.closest?.('#globalSearchForm,#globalSuggest')) hide();
  }, true);
  document.addEventListener('submit', ev => { if(ev.target?.id === 'globalSearchForm') hide(); }, true);
})();

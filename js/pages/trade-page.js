// 玩家交易區：販賣／收購留言板。資料存在聊天室同一個 Supabase 專案（supabase/trade.sql）。
// 瀏覽不需登入；刊登、標記成交、刪除需先通過人機驗證取得匿名身分（與聊天室共用）。
// 貼文不會自動下架，由發文者本人或站長手動處理。
(function(){
  const SUPABASE_SRC = 'js/vendor/supabase/supabase-2.118.0.js';
  const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const KIND_LABEL = { sell: '販賣', buy: '收購' };
  const IMAGE_BUCKET = 'trade-images';
  const MAX_IMAGES = 3;
  const MAX_IMAGE_SIDE = 1280;
  const ERRORS = {
    TRADE_RATE_LIMIT: '刊登太快了，請隔 1 分鐘再試。',
    TRADE_DAILY_LIMIT: '今天的刊登次數已達上限（10 篇），請明天再試。',
    TRADE_BANNED: '此訪客已被限制刊登。',
    TRADE_INVALID: '欄位格式不符，請檢查標題、價格與飛鴿 ID 的長度。',
    TRADE_NOT_OWNER: '只能管理自己在這個瀏覽器刊登的貼文。',
    TRADE_AUTH_REQUIRED: '請先完成人機驗證。',
    IMAGE_UPLOAD: '圖片上傳失敗，請稍後再試，或先移除圖片再刊登。',
    IMAGE_READ: '這張圖片無法讀取，請改用 JPG 或 PNG。',
    captcha_failed: '人機驗證未通過，請重新驗證。',
    over_request_rate_limit: '操作太頻繁，請稍後再試。',
    over_request_rate_limit_anonymous: '驗證次數過多，請稍後再試。',
    anonymous_provider_disabled: '網站尚未開啟匿名登入，請聯絡站長。'
  };

  const state = {
    config: null, client: null, uid: '', posts: [], loaded: false,
    filter: 'all', query: '', hideDone: false,
    captchaToken: '', widget: null, pendingId: null, pendingKey: '', busy: false,
    images: []
  };
  const scripts = new Map();

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function $(selector){ return document.querySelector('.tradePage ' + selector); }
  function say(text){ const box = $('.tradeStatus'); if(box) box.textContent = text || ''; }
  function formSay(text){ const box = $('.tradeFormStatus'); if(box) box.textContent = text || ''; }
  function errorText(error){
    const message = String(error?.message || error || '');
    const code = String(error?.code || '');
    return ERRORS[message] || ERRORS[code] || '操作沒有完成，請稍後再試。';
  }

  async function boundedFetch(url, options = {}){
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000);
    const upstream = options.signal, relay = () => abort.abort();
    upstream?.addEventListener('abort', relay, { once: true });
    if(upstream?.aborted) abort.abort();
    try { return await fetch(url, { ...options, signal: abort.signal }); }
    finally { clearTimeout(timer); upstream?.removeEventListener('abort', relay); }
  }
  function loadScript(src){
    if(scripts.has(src)) return scripts.get(src);
    if(src === SUPABASE_SRC && window.supabase?.createClient) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement('script'); node.src = src; node.async = true;
      const timer = setTimeout(() => { node.remove(); scripts.delete(src); reject(new Error('script_timeout')); }, 15000);
      node.onload = () => { clearTimeout(timer); resolve(); };
      node.onerror = () => { clearTimeout(timer); node.remove(); scripts.delete(src); reject(new Error('script_error')); };
      document.head.append(node);
    });
    scripts.set(src, promise); return promise;
  }

  async function getClient(){
    if(state.client) return state.client;
    if(!state.config){
      const response = await boundedFetch('data/chat-config.json', { cache: 'no-store' });
      if(!response.ok) throw new Error('config_error');
      const value = await response.json();
      if(!value.enabled || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value.url) || !value.publishableKey) throw new Error('config_error');
      state.config = value;
    }
    await loadScript(SUPABASE_SRC);
    // 與聊天室共用同一個連線與匿名身分，避免同一頁出現兩組登入狀態。
    if(!window.__szoSupabase){
      window.__szoSupabase = window.supabase.createClient(state.config.url, state.config.publishableKey, {
        auth: { storageKey: 'szo-chat-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
        global: { fetch: boundedFetch }
      });
    }
    state.client = window.__szoSupabase;
    try {
      const existing = await state.client.auth.getSession();
      state.uid = existing.data?.session?.user?.id || '';
    } catch(_error) { state.uid = ''; }
    return state.client;
  }

  function timeLabel(value){
    const time = new Date(value);
    if(Number.isNaN(time.getTime())) return '';
    const minutes = Math.floor((Date.now() - time.getTime()) / 60000);
    if(minutes < 1) return '剛剛';
    if(minutes < 60) return minutes + ' 分鐘前';
    if(minutes < 1440) return Math.floor(minutes / 60) + ' 小時前';
    if(minutes < 1440 * 7) return Math.floor(minutes / 1440) + ' 天前';
    const pad = n => String(n).padStart(2, '0');
    return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
  }

  function imageUrl(path){
    return state.config ? `${state.config.url.replace(/\/$/, '')}/storage/v1/object/public/${IMAGE_BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';
  }

  // 上傳前在瀏覽器壓縮：最長邊 1280px，優先 WebP，不支援時改 JPEG。
  async function compressImage(file){
    let source;
    try { source = await createImageBitmap(file); }
    catch(_error) {
      source = await new Promise((resolve, reject) => {
        const image = new Image(), url = URL.createObjectURL(file);
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE_READ')); };
        image.src = url;
      });
    }
    const width = source.width, height = source.height;
    if(!width || !height) throw new Error('IMAGE_READ');
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if(source.close) source.close();
    const encode = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
    let blob = await encode('image/webp', 0.82);
    if(!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85);
    if(blob && blob.size > 950 * 1024) blob = await encode(blob.type, 0.6);
    if(!blob) throw new Error('IMAGE_READ');
    return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'jpg', preview: URL.createObjectURL(blob) };
  }

  function renderImagePicks(){
    const box = $('.tradeImagePicks');
    if(!box) return;
    box.innerHTML = state.images.map((item, index) => `<figure>
        <img src="${esc(item.preview)}" alt="待上傳圖片 ${index + 1}">
        <button type="button" data-trade-image-drop="${index}" aria-label="移除圖片">✕</button>
      </figure>`).join('');
    const add = $('[data-trade-image-add]');
    if(add) add.disabled = state.images.length >= MAX_IMAGES;
    $('[data-trade-image-count]').textContent = `${state.images.length} / ${MAX_IMAGES}`;
  }

  async function addImages(files){
    const list = Array.from(files || []).filter(file => /^image\//.test(file.type));
    if(!list.length) return;
    const room = MAX_IMAGES - state.images.length;
    if(room <= 0){ formSay(`每篇最多 ${MAX_IMAGES} 張圖片。`); return; }
    if(list.length > room) formSay(`每篇最多 ${MAX_IMAGES} 張圖片，只加入前 ${room} 張。`);
    for(const file of list.slice(0, room)){
      try { state.images.push(await compressImage(file)); }
      catch(error) { formSay(errorText(error)); }
    }
    state.pendingKey = '';
    renderImagePicks();
  }

  function clearImages(){
    state.images.forEach(item => URL.revokeObjectURL(item.preview));
    state.images = [];
    renderImagePicks();
  }

  function openViewer(src){
    let viewer = document.querySelector('.tradeViewer');
    if(!viewer){
      viewer = document.createElement('div');
      viewer.className = 'tradeViewer';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-label', '查看圖片');
      viewer.innerHTML = '<img alt="交易圖片"><button type="button" aria-label="關閉">✕</button>';
      viewer.addEventListener('click', () => { viewer.hidden = true; });
      document.addEventListener('keydown', event => { if(event.key === 'Escape') viewer.hidden = true; });
      document.body.append(viewer);
    }
    viewer.querySelector('img').src = src;
    viewer.hidden = false;
  }

  function visiblePosts(){
    const query = state.query.trim().toLowerCase();
    return state.posts.filter(post =>
      (state.filter === 'all' || post.kind === state.filter) &&
      (!state.hideDone || post.status !== 'done') &&
      (!query || String(post.title).toLowerCase().includes(query) || String(post.note).toLowerCase().includes(query)));
  }

  function renderList(){
    const list = $('.tradeList');
    if(!list) return;
    if(!state.loaded){ list.innerHTML = ''; return; }
    const rows = visiblePosts();
    $('.tradeCount').textContent = `共 ${rows.length} 筆`;
    if(!rows.length){
      list.innerHTML = `<li class="tradeEmpty">${state.posts.length ? '沒有符合條件的貼文。' : '目前還沒有貼文，歡迎刊登第一筆！'}</li>`;
      return;
    }
    list.innerHTML = rows.map(post => {
      const mine = state.uid && post.user_id === state.uid;
      const done = post.status === 'done';
      const tools = mine ? `<div class="tradeOwnerTools">
          <button type="button" data-trade-status="${esc(post.id)}" data-next="${done ? 'open' : 'done'}">${done ? '重新上架' : '標記已成交'}</button>
          <button type="button" class="danger" data-trade-remove="${esc(post.id)}" data-images="${esc(JSON.stringify(post.images || []))}">刪除</button>
        </div>` : '';
      return `<li class="tradePost ${done ? 'isDone' : ''}" data-kind="${esc(post.kind)}">
        <header>
          <span class="tradeKind ${esc(post.kind)}">${esc(KIND_LABEL[post.kind] || post.kind)}</span>
          ${done ? '<span class="tradeDoneBadge">已成交</span>' : ''}
          ${mine ? '<span class="tradeMineBadge">我的貼文</span>' : ''}
          <time datetime="${esc(post.created_at)}">${esc(timeLabel(post.created_at))}</time>
        </header>
        <h3 translate="no">${esc(post.title)}</h3>
        <dl>
          <div><dt>價格</dt><dd translate="no">${esc(post.price)}</dd></div>
          <div><dt>飛鴿 ID</dt><dd><span translate="no">${esc(post.contact)}</span>
            <button type="button" class="tradeCopy" data-trade-copy="${esc(post.contact)}">複製</button></dd></div>
        </dl>
        ${post.note ? `<p class="tradeNote" translate="no">${esc(post.note)}</p>` : ''}
        ${Array.isArray(post.images) && post.images.length ? `<div class="tradeImages">${post.images.map((path, index) =>
          `<button type="button" class="tradeThumb" data-trade-view="${esc(imageUrl(path))}"><img src="${esc(imageUrl(path))}" alt="${esc(post.title)} 圖片 ${index + 1}" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
        ${tools}
      </li>`;
    }).join('');
  }

  async function loadPosts(){
    say('讀取貼文中…');
    try {
      const client = await getClient();
      const result = await client.from('szo_trade_posts')
        .select('id,user_id,kind,title,price,contact,note,status,created_at,images')
        .order('created_at', { ascending: false })
        .limit(500);
      if(result.error) throw result.error;
      state.posts = Array.isArray(result.data) ? result.data : [];
      state.loaded = true;
      say('');
    } catch(error) {
      say(String(error?.message) === 'config_error' ? '交易區尚未開放。' : '貼文讀取失敗，請稍後按「重新整理」。');
    }
    renderList();
  }

  async function prepareCaptcha(){
    const box = $('.tradeCaptcha');
    if(!box || state.uid || !state.config?.turnstileSiteKey) return;
    try {
      await loadScript(TURNSTILE_SRC);
      if(state.widget !== null) { window.turnstile.reset(state.widget); return; }
      state.widget = window.turnstile.render(box, {
        sitekey: state.config.turnstileSiteKey, theme: 'auto', size: 'flexible',
        callback: value => { state.captchaToken = value; formSay('驗證成功，可以送出。'); },
        'expired-callback': () => { state.captchaToken = ''; formSay('驗證已過期，請重新驗證。'); },
        'error-callback': () => { state.captchaToken = ''; formSay('人機驗證失敗，請重新整理頁面後再試。'); }
      });
    } catch(_error) { formSay('人機驗證載入失敗，請稍後再試。'); }
  }

  async function ensureSignedIn(){
    const client = await getClient();
    if(state.uid) return client;
    if(state.config.turnstileSiteKey && !state.captchaToken){
      await prepareCaptcha();
      throw new Error('TRADE_AUTH_REQUIRED');
    }
    const result = await client.auth.signInAnonymously(state.captchaToken ? { options: { captchaToken: state.captchaToken } } : {});
    if(state.widget !== null && window.turnstile){ window.turnstile.remove(state.widget); state.widget = null; }
    state.captchaToken = '';
    if(result.error) throw result.error;
    state.uid = result.data?.user?.id || result.data?.session?.user?.id || '';
    const captcha = $('.tradeCaptcha'); if(captcha) captcha.innerHTML = '';
    return client;
  }

  function openForm(open){
    const form = $('.tradeForm');
    if(!form) return;
    form.hidden = !open;
    $('[data-trade-new]').hidden = open;
    if(open){
      formSay('');
      try { if(!form.elements.contact.value) form.elements.contact.value = localStorage.getItem('szo.trade.contact') || ''; } catch(_error) {}
      getClient().then(prepareCaptcha).catch(() => formSay('交易區尚未開放。'));
      form.elements.title.focus();
    }
  }

  // 網站的 patch-13 會把所有按鈕改成 type="button"，所以不依賴表單 submit 事件，直接由按鈕觸發。
  async function submitPost(){
    if(state.busy) return;
    const form = $('.tradeForm');
    const submitButton = $('[data-trade-submit]');
    const data = {
      kind: form.elements.kind.value,
      title: form.elements.title.value.trim(),
      price: form.elements.price.value.trim(),
      contact: form.elements.contact.value.trim(),
      note: form.elements.note.value.trim()
    };
    if(!KIND_LABEL[data.kind]){ formSay('請選擇販賣或收購。'); return; }
    if(!data.title || !data.price || !data.contact){ formSay('請填寫標題、價格與飛鴿 ID。'); return; }
    // 同一份內容重送時沿用同一個編號，伺服器不會重複刊登。
    const key = JSON.stringify(data) + '|' + state.images.map(item => item.preview).join(',');
    if(state.pendingKey !== key){ state.pendingKey = key; state.pendingId = crypto.randomUUID(); }
    state.busy = true; submitButton.disabled = true;
    formSay('送出中…');
    try {
      const client = await ensureSignedIn();
      const paths = [];
      for(let index = 0; index < state.images.length; index++){
        formSay(`上傳圖片 ${index + 1} / ${state.images.length}…`);
        const item = state.images[index];
        const path = `${state.uid}/${state.pendingId}-${index}.${item.ext}`;
        const upload = await client.storage.from(IMAGE_BUCKET).upload(path, item.blob, { contentType: item.blob.type, upsert: true, cacheControl: '31536000' });
        if(upload.error) throw new Error('IMAGE_UPLOAD');
        paths.push(path);
      }
      formSay('送出中…');
      const result = await client.rpc('szo_create_trade_post', {
        p_id: state.pendingId, p_kind: data.kind, p_title: data.title,
        p_price: data.price, p_contact: data.contact, p_note: data.note, p_images: paths
      });
      if(result.error) throw result.error;
      try { localStorage.setItem('szo.trade.contact', data.contact); } catch(_error) {}
      state.pendingKey = ''; state.pendingId = null;
      form.reset(); form.elements.contact.value = data.contact; clearImages();
      openForm(false);
      await loadPosts();
      say('刊登成功！');
    } catch(error) {
      formSay(errorText(error));
    } finally {
      state.busy = false; submitButton.disabled = false;
    }
  }

  async function ownerAction(run, okText){
    if(state.busy) return;
    state.busy = true;
    try {
      const client = await getClient();
      if(!state.uid) throw new Error('TRADE_NOT_OWNER');
      const result = await run(client);
      if(result.error) throw result.error;
      await loadPosts();
      say(okText);
    } catch(error) {
      say(errorText(error));
    } finally { state.busy = false; }
  }

  function bind(){
    const page = document.querySelector('.tradePage');
    page.addEventListener('click', event => {
      const tab = event.target.closest('[data-trade-filter]');
      if(tab){
        state.filter = tab.dataset.tradeFilter;
        page.querySelectorAll('[data-trade-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === tab)));
        renderList(); return;
      }
      const view = event.target.closest('[data-trade-view]');
      if(view){ openViewer(view.dataset.tradeView); return; }
      if(event.target.closest('[data-trade-image-add]')){ $('.tradeImageInput').click(); return; }
      const drop = event.target.closest('[data-trade-image-drop]');
      if(drop){
        const index = Number(drop.dataset.tradeImageDrop);
        const [item] = state.images.splice(index, 1);
        if(item) URL.revokeObjectURL(item.preview);
        state.pendingKey = ''; renderImagePicks(); return;
      }
      if(event.target.closest('[data-trade-new]')){ openForm(true); return; }
      if(event.target.closest('[data-trade-submit]')){ submitPost(); return; }
      if(event.target.closest('[data-trade-cancel]')){ openForm(false); return; }
      if(event.target.closest('[data-trade-refresh]')){ loadPosts(); return; }
      const copy = event.target.closest('[data-trade-copy]');
      if(copy){
        const text = copy.dataset.tradeCopy;
        (navigator.clipboard?.writeText(text) || Promise.reject()).then(
          () => { copy.textContent = '已複製'; setTimeout(() => { copy.textContent = '複製'; }, 1500); },
          () => say('無法自動複製，請手動選取飛鴿 ID。'));
        return;
      }
      const status = event.target.closest('[data-trade-status]');
      if(status){
        const next = status.dataset.next;
        ownerAction(client => client.rpc('szo_set_trade_post_status', { p_id: status.dataset.tradeStatus, p_status: next }),
          next === 'done' ? '已標記為成交。' : '已重新上架。');
        return;
      }
      const remove = event.target.closest('[data-trade-remove]');
      if(remove){
        if(!confirm('確定要刪除這筆貼文嗎？刪除後無法復原。')) return;
        let paths = [];
        try { paths = JSON.parse(remove.dataset.images || '[]'); } catch(_error) { paths = []; }
        ownerAction(async client => {
          const result = await client.rpc('szo_remove_trade_post', { p_id: remove.dataset.tradeRemove });
          // 貼文刪除成功後再刪圖片；圖片刪除失敗不影響貼文已隱藏。
          if(!result.error && paths.length) await client.storage.from(IMAGE_BUCKET).remove(paths).catch(() => null);
          return result;
        }, '貼文已刪除。');
      }
    });
    $('.tradeSearch').addEventListener('input', event => { state.query = event.target.value; renderList(); });
    $('.tradeHideDone').addEventListener('change', event => { state.hideDone = event.target.checked; renderList(); });
    $('.tradeForm').addEventListener('submit', event => { event.preventDefault(); submitPost(); });
    $('.tradeImageInput').addEventListener('change', event => { addImages(event.target.files); event.target.value = ''; });
    // 表單開啟時可直接 Ctrl+V 貼上遊戲截圖。
    $('.tradeForm').addEventListener('paste', event => {
      const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter(Boolean);
      if(files.length){ event.preventDefault(); addImages(files); }
    });
    const note = $('.tradeForm').elements.note;
    note.addEventListener('input', () => { $('[data-trade-note-length]').textContent = Array.from(note.value).length + ' / 300'; });
  }

  async function renderTradePage(){
    window.v86LastView = 'trade';
    const reader = document.getElementById('reader');
    if(!reader) return;
    state.widget = null; state.captchaToken = ''; state.images.forEach(item => URL.revokeObjectURL(item.preview)); state.images = [];
    reader.innerHTML = `<section class="card tradePage">
      <h1>玩家交易區</h1>
      <p class="tradeNotice">本站僅提供資訊交流，不經手任何交易。交易前請自行確認對方身分，風險自負；請勿張貼帳號、密碼或個人資料。</p>
      <div class="tradeToolbar">
        <div class="tradeTabs" role="group" aria-label="類型篩選">
          <button type="button" data-trade-filter="all" aria-pressed="true">全部</button>
          <button type="button" data-trade-filter="sell" aria-pressed="false">販賣</button>
          <button type="button" data-trade-filter="buy" aria-pressed="false">收購</button>
        </div>
        <input class="tradeSearch" type="search" placeholder="搜尋物品名稱" aria-label="搜尋物品名稱">
        <label class="tradeCheck"><input class="tradeHideDone" type="checkbox"> 隱藏已成交</label>
        <button type="button" data-trade-refresh>重新整理</button>
        <button type="button" class="primary" data-trade-new>我要刊登</button>
      </div>
      <form class="tradeForm" hidden>
        <fieldset class="tradeKindPick"><legend>類型</legend>
          <label><input type="radio" name="kind" value="sell" checked> 販賣</label>
          <label><input type="radio" name="kind" value="buy"> 收購</label>
        </fieldset>
        <label>標題（想買或賣的東西）<input name="title" maxlength="40" required placeholder="例：武防 XXX +10"></label>
        <label>價格<input name="price" maxlength="40" required placeholder="例：500 萬、可議"></label>
        <label>飛鴿 ID（遊戲內聯絡用）<input name="contact" maxlength="30" required autocomplete="off"></label>
        <label>補充說明（選填）<textarea name="note" maxlength="300" rows="3" placeholder="例：數量、屬性、交易時間"></textarea>
          <small data-trade-note-length>0 / 300</small></label>
        <div class="tradeImageField">
          <div class="tradeImageHead"><span>圖片（選填，最多 ${MAX_IMAGES} 張）</span><small data-trade-image-count>0 / ${MAX_IMAGES}</small></div>
          <div class="tradeImagePicks"></div>
          <div class="tradeImageActions">
            <button type="button" data-trade-image-add>選擇圖片</button>
            <span>或在這裡按 Ctrl+V 直接貼上截圖</span>
          </div>
          <input class="tradeImageInput" type="file" accept="image/*" multiple hidden>
        </div>
        <div class="tradeCaptcha" translate="no"></div>
        <div class="tradeFormStatus" role="status" aria-live="polite"></div>
        <div class="tradeFormActions">
          <button type="button" data-trade-cancel>取消</button>
          <button type="button" class="primary" data-trade-submit>送出刊登</button>
        </div>
        <p class="tradeHint">刊登後可在同一個瀏覽器標記已成交或刪除。貼文不會自動下架，成交後請記得處理。</p>
      </form>
      <div class="tradeMeta"><span class="tradeStatus" role="status" aria-live="polite"></span><span class="tradeCount"></span></div>
      <ol class="tradeList" aria-label="交易貼文"></ol>
    </section>`;
    bind();
    await loadPosts();
  }

  window.renderTradePage = renderTradePage;
})();

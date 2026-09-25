// Tool downloads page. Each downloadable tool owns an independent release manifest.
(function(){
  const MANIFEST_URLS = [
    'downloads/version.json',
    'downloads/szo-launcher-version.json',
    'downloads/collectbook-version.json'
  ];
  const DESCRIPTIONS = [
    '快速記錄武冠收納進度，匯出未收清單與道具出處，方便補齊收藏。',
    '自動開啟遊戲並輸入帳號密碼，免去手動登入操作，同時支援遊戲更新與帳號管理。',
    '彙整武冠道具與出處資料，離線也能查找掉落位置與取得方式。'
  ];

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function asText(value, fallback='-'){
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function resolveUrl(url){
    try { return new URL(url, location.href).href; }
    catch(e){ return url || '#'; }
  }

  async function loadManifests(){
    return await Promise.all(MANIFEST_URLS.map(async url => {
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok) throw new Error('下載資訊讀取失敗');
      return { ...await res.json(), description: DESCRIPTIONS[MANIFEST_URLS.indexOf(url)] };
    }));
  }

  function renderDownloadsCard(items){
    const rows = items.map(data => {
      const displayName = asText(data.display_name || '工具');
      const version = asText(data.version);
      const published = asText(data.published_at);
      const fileName = asText(data.file_name || displayName);
      const downloadUrl = resolveUrl(data.download_url || fileName);
      const fileLabel = fileName === displayName
        ? esc(fileName)
        : `${esc(displayName)}<span class="downloadFileName">${esc(fileName)}</span>`;
      return `<tr>
        <td data-label="檔案名稱"><span class="downloadCellValue downloadNameValue">${fileLabel}</span></td>
        <td data-label="載點"><span class="downloadCellValue"><a class="downloadBtn" href="${esc(downloadUrl)}" download>載點</a></span></td>
        <td data-label="版本號"><span class="downloadCellValue">${esc(version)}</span></td>
        <td data-label="上傳時間"><span class="downloadCellValue">${esc(published)}</span></td>
        <td data-label="說明"><span class="downloadCellValue">${esc(data.description)}</span></td>
      </tr>`;
    }).join('');
    return `<section class="card downloadsPage">
      <h1>工具下載區</h1>
      <div class="downloadTableWrap">
        <table class="downloadTable">
          <thead>
            <tr><th>檔案名稱</th><th>載點</th><th>版本號</th><th>上傳時間</th><th>說明</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  async function renderDownloadsPage(){
    window.v86LastView = 'downloads';
    const reader = document.getElementById('reader');
    if(reader) reader.innerHTML = '<section class="card downloadsPage"><h1>工具下載區</h1><div class="muted">下載資訊載入中...</div></section>';
    try{
      const items = await loadManifests();
      if(reader) reader.innerHTML = renderDownloadsCard(items);
    }catch(err){
      if(reader) reader.innerHTML = `<section class="card downloadsPage"><h1>工具下載區</h1><div class="empty">${esc(err.message || err)}</div></section>`;
    }
  }

  window.renderDownloadsPage = renderDownloadsPage;
})();

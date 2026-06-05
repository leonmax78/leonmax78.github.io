// Tool downloads page. Reads downloads/version.json so the website and desktop app share one release manifest.
(function(){
  const MANIFEST_URL = 'downloads/version.json';

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

  async function loadManifest(){
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if(!res.ok) throw new Error('下載資訊讀取失敗');
    return await res.json();
  }

  function renderDownloadsCard(data){
    const version = asText(data.version);
    const published = asText(data.published_at);
    const fileName = asText(data.file_name || '武冠判讀_DEMO.exe');
    const downloadUrl = resolveUrl(data.download_url || fileName);
    return `<section class="card downloadsPage">
      <h1>工具下載區</h1>
      <div class="downloadTableWrap">
        <table class="downloadTable">
          <thead>
            <tr><th>下載</th><th>版本號</th><th>上傳時間</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><a class="downloadBtn" href="${esc(downloadUrl)}" download>下載</a></td>
              <td>${esc(version)}</td>
              <td>${esc(published)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>`;
  }

  async function renderDownloadsPage(){
    window.v86LastView = 'downloads';
    const reader = document.getElementById('reader');
    if(reader) reader.innerHTML = '<section class="card downloadsPage"><h1>工具下載區</h1><div class="muted">下載資訊載入中...</div></section>';
    try{
      const data = await loadManifest();
      if(reader) reader.innerHTML = renderDownloadsCard(data);
    }catch(err){
      if(reader) reader.innerHTML = `<section class="card downloadsPage"><h1>工具下載區</h1><div class="empty">${esc(err.message || err)}</div></section>`;
    }
  }

  window.renderDownloadsPage = renderDownloadsPage;
})();

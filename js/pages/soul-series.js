// V767: 武魂 picker grouped by 聯動 — chips above the 武魂 select filter its options.
(function(){
  if(window.__SZO_SOUL_SERIES__) return;
  window.__SZO_SOUL_SERIES__ = true;
  // 聯動 in release order (follows the 武魂 IDs)
  const ORDER = ['神州','霹靂','真侍魂','幻想三國誌','東離劍遊紀','活俠傳','絕代雙驕'];
  const NAMES = {
    '霹靂': ['素還真','一頁書','葉小釵','亂世狂刀','金獅'],
    '真侍魂': ['霸王丸','娜可露露','橘右京','加爾福特','千兩狂死郎'],
    '幻想三國誌': ['姬軒','姬霜','百玥','貂芷','靡香','虞冰','燕起','趙雲','黃帝','蚩尤（呂布）','莫琳','紅夜','白樺','劉備','關羽','張飛','蘇童顏','莫千千','姬風','姜秀','魔化黃帝','太陰之女'],
    '東離劍遊紀': ['凜雪鴉','殤不患','浪巫謠','阿爾貝盧法','禍世螟蝗'],
    '活俠傳': ['趙活','唐布衣','唐默鈴','龍湘','虞小梅','夏侯蘭'],
    '絕代雙驕': ['江小魚','花無缺','鐵心蘭','張菁','蘇櫻','燕南天','邀月','憐星','江小魚（壹）','燕南天（前）','邀月（參）']
  };
  const seriesOf = name => { for(const k in NAMES) if(NAMES[k].includes(name)) return k; return '神州'; };
  window.SZO_SOUL_SERIES_OF = seriesOf;
  let current = '';
  function enhance(){
    const sel = document.getElementById('soulSelect');
    if(!sel || sel.dataset.seriesReady) return;
    sel.dataset.seriesReady = '1';
    const all = Array.from(sel.options).map(o => ({value:o.value, text:o.textContent, series:seriesOf(o.textContent.trim())}));
    const counts = Object.fromEntries(ORDER.map(k => [k, all.filter(o => o.series === k).length]));
    const row = document.createElement('div');
    row.className = 'soulSeries jsSeries';
    const paint = () => {
      row.innerHTML = ['', ...ORDER].filter(k => !k || counts[k]).map(k => `<button type="button" class="${current===k?'active':''}" data-soul-series="${k}">${k ? k + `<small>${counts[k]}</small>` : '全部'}</button>`).join('');
    };
    const apply = () => {
      const keep = sel.value;
      const list = all.filter(o => !current || o.series === current);
      sel.replaceChildren(...list.map(o => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.text; return op; }));
      sel.value = list.some(o => o.value === keep) ? keep : (list[0] ? list[0].value : '');
      if(sel.value !== keep) sel.dispatchEvent(new Event('change', {bubbles:true}));
      paint();
    };
    row.addEventListener('click', e => {
      const b = e.target.closest('[data-soul-series]'); if(!b) return;
      e.preventDefault(); e.stopPropagation();
      current = b.dataset.soulSeries; apply();
    });
    const kv = sel.closest('.kv') || sel.parentElement;
    kv.parentElement.insertBefore(row, kv);
    if(current) apply(); else paint();
  }
  const start = () => {
    const r = document.getElementById('reader'); if(!r) return setTimeout(start, 300);
    new MutationObserver(enhance).observe(r, {childList:true, subtree:true});
    enhance();
  };
  start();
})();

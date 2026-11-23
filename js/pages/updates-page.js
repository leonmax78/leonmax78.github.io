// 每週更新歷程：每週遊戲更新的資料差異（data/updates/，tools/build_update_log.py 產生）。
// 道具、怪物、技能、狀態的新增與數值變更，怪物掉落率變化，以及站長補充的重點說明。
(function(){
  'use strict';
  const state = { week: '', query: '', cat: 'all', open: new Set(['notes', 'drops']) };
  const OFFICIAL_LIST = 'https://szo.uj.com.tw/news.php?c=5';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => { v = String(v ?? ''); if(window.SZO_LANGUAGE) v = window.SZO_LANGUAGE.toSimple(v); return v.toLowerCase().replace(/\s+/g, ''); };
  const ver = () => encodeURIComponent(document.body?.dataset?.version || 'dev');
  const cache = new Map();
  const get = url => { if(!cache.has(url)) cache.set(url, fetch(url + '?v=' + ver(), { cache: 'force-cache' }).then(r => { if(!r.ok) throw Error('每週更新歷程載入失敗'); return r.json(); }).catch(e => { cache.delete(url); throw e; })); return cache.get(url); };
  const D = () => window.SZO_DISPLAY;
  const EXTRA_LABEL = { Stun: '暈眩值', HitTime: '命中時間', Mana: '耗精力', TriggerType: '觸發類型', TriggerParm1: '觸發參數' };
  let STATUS = {};
  const label = k => EXTRA_LABEL[k] || (D() ? D().label(k) : k) || k;
  // 狀態編號 → 名稱（data/status.json），例如 ExtraStatus 34 → 詛咒
  const val = (k, v) => v === null || v === undefined || v === '' ? '（無）' : /^(ExtraStatus|RemoveStatus|Status)$/.test(k) && STATUS[v] ? `${STATUS[v]}（${v}）` : (D() ? D().value(k, v) : v);
  const day = d => { const [y, m, dd] = d.split('-'); return `${Number(m)}/${Number(dd)}`; };
  const rate = r => r === null || r === undefined ? '' : (r >= 1 ? +r.toFixed(3) : +r.toPrecision(3)) + '%';
  const SECTIONS = [
    ['notes', '重點說明'], ['drops', '掉落變更'],
    ['items+', '新道具'], ['items~', '道具變更'], ['monsters+', '新怪物'], ['monsters~', '怪物變更'],
    ['magic+', '新技能'], ['magic~', '技能變更'], ['status+', '新狀態'], ['status~', '狀態變更']
  ];
  const KIND = { items: 'item', monsters: 'monster' };
  // 週內分類：每週資料會越來越多，用分類切換只看需要的部分
  const CATS = [['all', '全部'], ['notes', '重點說明', ['notes']], ['drops', '掉落', ['drops']], ['items', '道具', ['items+', 'items~']], ['monsters', '怪物', ['monsters+', 'monsters~']], ['skills', '技能・狀態', ['magic+', 'magic~', 'status+', 'status~']]];
  const monthOf = d => `${d.slice(0, 4)} 年 ${Number(d.slice(5, 7))} 月`;

  function link(sec, id, name){
    const kind = KIND[sec];
    return kind ? `<button type="button" class="upLink" data-up-open="${kind}" data-up-id="${esc(id)}">${esc(name || 'ID ' + id)}</button>` : `<span class="upName">${esc(name || 'ID ' + id)}</span>`;
  }
  function change(field, a, b){
    if(a === null && b === null) return `<span class="upField">${esc(label(field))}</span>`;
    const na = Number(a), nb = Number(b);
    const num = a !== null && b !== null && a !== '' && b !== '' && Number.isFinite(na) && Number.isFinite(nb) && !/Status|Flag|Type|Class|Kind|Icon/.test(field);
    const dir = num ? (nb > na ? ' up' : nb < na ? ' down' : '') : '';
    const long = String(a ?? '').length + String(b ?? '').length > 60;
    if(long) return `<div class="upLong"><span class="upField">${esc(label(field))}</span><div class="upOld">${esc(val(field, a))}</div><div class="upNew">${esc(val(field, b))}</div></div>`;
    return `<span class="upChg${dir}"><span class="upField">${esc(label(field))}</span>${esc(val(field, a))} → <b>${esc(val(field, b))}</b></span>`;
  }
  function rowsFor(sec, w, q){
    const [kind, op] = [sec.slice(0, -1), sec.slice(-1)];
    if(sec === 'notes') return (w.notes || []).filter(t => !q || norm(t).includes(q)).map(t => `<li>${esc(t)}</li>`);
    if(sec === 'drops') return (w.monsters.drops || []).filter(([, n, list]) => !q || norm(n).includes(q) || list.some(x => norm(x[1]).includes(q))).map(([id, n, list]) =>
      `<li><div class="upHead">${link('monsters', id, n)}</div><div class="upDrops">${list.map(([iid, iname, a, b]) => `<span class="upDrop${a === null ? ' add' : b === null ? ' del' : ''}">${link('items', iid, iname)} ${a === null ? `<em>新增</em> ${rate(b)}` : b === null ? `<em>移除</em>（原 ${rate(a)}）` : `${rate(a)} → <b>${rate(b)}</b>`}</span>`).join('')}</div></li>`);
    const part = w[kind] || {};
    if(op === '+') return (part.added || []).filter(([id, n]) => !q || norm(n).includes(q) || String(id) === q).map(([id, n]) => `<li class="upChip">${link(kind, id, n)}</li>`);
    return (part.changed || []).filter(([id, n, f]) => !q || norm(n).includes(q) || String(id) === q || f.some(x => norm(label(x[0])).includes(q))).map(([id, n, f]) => `<li><div class="upHead">${link(kind, id, n)}<small>ID ${esc(id)}</small></div><div class="upChanges">${f.map(x => change(...x)).join('')}</div></li>`);
  }

  async function renderUpdatesPage(){
    const reader = document.getElementById('reader'); if(!reader) return;
    let index;
    try{ index = await get('data/updates/index.json'); }catch(e){ reader.innerHTML = `<section class="card"><div class="empty">${esc(e.message)}</div></section>`; return; }
    if(!index.some(x => x.d === state.week)) state.week = index[0]?.d || '';
    if(!Object.keys(STATUS).length) try{ STATUS = Object.fromEntries((await get('data/status.json')).map(x => [String(x.ID), x.Name])); }catch(e){}
    let w;
    try{ w = await get(`data/updates/${state.week}.json`); }catch(e){ reader.innerHTML = `<section class="card"><div class="empty">${esc(e.message)}</div></section>`; return; }
    const q = norm(state.query);
    // 週次：最近 4 週直接點；全部週次放在依月份分組的下拉選單；上一週／下一週
    const at = index.findIndex(x => x.d === state.week);
    const weekBtn = x => `<button type="button" class="upWeek${x.d === state.week ? ' active' : ''}" data-up-week="${esc(x.d)}"><b>${day(x.d)}</b>${x.v ? `<small>${esc(x.v)}</small>` : ''}</button>`;
    const months = [...new Set(index.map(x => monthOf(x.d)))];
    const select = `<select id="upWeekSelect" aria-label="選擇週次">${months.map(m => `<optgroup label="${esc(m)}">${index.filter(x => monthOf(x.d) === m).map(x => `<option value="${esc(x.d)}"${x.d === state.week ? ' selected' : ''}>${esc(x.d.replace(/-/g, '/'))}${x.v ? '　' + esc(x.v) : ''}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const prev = index[at + 1], next = index[at - 1];
    const nav = `<div class="upWeekBar"><div class="upWeekRecent">${index.slice(0, 4).map(weekBtn).join('')}</div><div class="upWeekPick">${index.length > 4 ? `<label>全部週次 ${select}</label>` : ''}<button type="button" class="upStep" ${prev ? `data-up-week="${esc(prev.d)}"` : 'disabled'}>‹ 上一週</button><button type="button" class="upStep" ${next ? `data-up-week="${esc(next.d)}"` : 'disabled'}>下一週 ›</button></div></div>`;
    // 週內分類與各區塊
    const secRows = Object.fromEntries(SECTIONS.map(([k]) => [k, rowsFor(k, w, q)]));
    const catCount = c => (c[2] || SECTIONS.map(x => x[0])).reduce((n, k) => n + (secRows[k]?.length || 0), 0);
    if(state.cat !== 'all' && !catCount(CATS.find(c => c[0] === state.cat) || CATS[0])) state.cat = 'all';
    const cat = CATS.find(c => c[0] === state.cat) || CATS[0];
    const catTabs = CATS.map(c => { const n = catCount(c); return n || c[0] === 'all' ? `<button type="button" class="qaNavChip${c[0] === state.cat ? ' active' : ''}" data-up-cat="${c[0]}">${c[1]}<b>${n}</b></button>` : ''; }).join('');
    const blocks = SECTIONS.filter(([k]) => !cat[2] || cat[2].includes(k)).map(([k, title]) => {
      const rows = secRows[k]; if(!rows.length) return '';
      const art = k.endsWith('~') && !q ? (w[k.slice(0, -1)]?.art || 0) : 0;
      const open = q || cat[2] || state.open.has(k) || rows.length <= 12;
      return `<details class="upSec" data-up-sec="${k}"${open ? ' open' : ''}><summary>${title}<b>${rows.length}</b>${art ? `<small>另有 ${art} 筆圖示／音效更換未列出</small>` : ''}</summary><ul class="upList${k.endsWith('+') ? ' chips' : ''}">${rows.join('')}</ul></details>`;
    }).join('');
    const official = (w.links || []).map(l => `<a class="upOfficialLink" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">📢 ${esc(l.t || '官方公告')} ↗</a>`).join('');
    reader.innerHTML = `<section class="card updatesPage">
      <header class="upHeader"><div><h1>每週更新歷程</h1><p class="muted">每週遊戲更新後拆包比對的資料差異，加上整理自官方公告的重點說明。</p></div><a class="upOfficialAll" href="${OFFICIAL_LIST}" target="_blank" rel="noopener noreferrer">官方更新公告列表 ↗</a></header>
      ${nav}
      <article class="upWeekBox">
        <header class="upWeekHead"><h2>${esc(state.week.replace(/-/g, '/'))} 更新${w.v ? `<span class="upVerTitle">版本 ${esc(w.v)}</span>` : ''}</h2>${official ? `<div class="upOfficialBox">${official}</div>` : ''}</header>
        <div class="upTools"><nav class="qaNav upCats">${catTabs}</nav><input id="upQuery" type="search" placeholder="在這週裡找：道具、怪物、欄位…" value="${esc(state.query)}"></div>
        ${blocks || '<div class="empty">沒有符合的變更。</div>'}
      </article>
    </section>`;
    if(typeof window.szoSetRoute === 'function') window.szoSetRoute('updates');
  }
  window.renderUpdatesPage = renderUpdatesPage;

  let timer = 0;
  document.addEventListener('input', ev => {
    if(ev.target?.id !== 'upQuery' || ev.isComposing) return;
    clearTimeout(timer);
    timer = setTimeout(async () => { state.query = ev.target.value; await renderUpdatesPage(); const el = document.getElementById('upQuery'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 300);
  });
  document.addEventListener('change', ev => { if(ev.target?.id === 'upWeekSelect'){ state.week = ev.target.value; state.query = ''; renderUpdatesPage(); } });
  document.addEventListener('compositionend', ev => { if(ev.target?.id === 'upQuery') ev.target.dispatchEvent(new Event('input', { bubbles: true })); });
  document.addEventListener('click', ev => {
    const wk = ev.target.closest?.('[data-up-week]');
    if(wk){ state.week = wk.dataset.upWeek; state.query = ''; renderUpdatesPage(); return; }
    const cat = ev.target.closest?.('[data-up-cat]');
    if(cat){ state.cat = cat.dataset.upCat; renderUpdatesPage(); return; }
    const op = ev.target.closest?.('[data-up-open]');
    if(op){ ev.preventDefault(); ev.stopPropagation(); window.SZO_PREVIEW?.open(op.dataset.upOpen, op.dataset.upId); }
  }, true);
  document.addEventListener('toggle', ev => { const k = ev.target?.dataset?.upSec; if(k){ if(ev.target.open) state.open.add(k); else state.open.delete(k); } }, true);
})();

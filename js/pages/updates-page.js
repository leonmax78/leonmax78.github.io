// 每週更新歷程：每週遊戲更新的資料差異（data/updates/，tools/build_update_log.py 產生）。
// 道具、怪物、技能、狀態的新增與數值變更，怪物掉落率變化，以及站長補充的重點說明。
(function(){
  'use strict';
  const state = { week: '', query: '', open: new Set(['notes', 'drops']) };
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
    const tabs = index.map(x => `<button type="button" class="qaChip${x.d === state.week ? ' active' : ''}" data-up-week="${esc(x.d)}">${day(x.d)}</button>`).join('');
    const blocks = SECTIONS.map(([k, title]) => {
      const rows = rowsFor(k, w, q); if(!rows.length) return '';
      const art = k.endsWith('~') && !q ? (w[k.slice(0, -1)]?.art || 0) : 0;
      const open = q || state.open.has(k) || rows.length <= 12;
      return `<details class="upSec" data-up-sec="${k}"${open ? ' open' : ''}><summary>${title}<b>${rows.length}</b>${art ? `<small>另有 ${art} 筆圖示／音效更換未列出</small>` : ''}</summary><ul class="upList${k.endsWith('+') ? ' chips' : ''}">${rows.join('')}</ul></details>`;
    }).join('');
    const chips = SECTIONS.map(([k, title]) => { const n = rowsFor(k, w, q).length; return n ? `<button type="button" class="qaNavChip" data-up-jump="${k}">${title}<b>${n}</b></button>` : ''; }).join('');
    reader.innerHTML = `<section class="card updatesPage">
      <h1>每週更新歷程</h1>
      <p class="muted">每週遊戲更新後，拆包比對新舊資料的差異：新道具、新怪物、數值與說明變更、掉落率變化。重點說明由站長補充（兌換、地圖等資料比對看不出來的部分）；有官方公告的週次附上連結。</p>
      <div class="upWeeks">${tabs}</div>
      <div class="upSearch"><input id="upQuery" type="search" placeholder="在這週的變更裡找：道具、怪物、欄位名稱…" value="${esc(state.query)}"></div>
      <h2 class="upTitle">${esc(state.week.replace(/-/g, '/'))} 更新</h2>
      ${(w.links || []).length ? `<div class="upLinks">${w.links.map(l => `<a class="qaChip upOfficial" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">📢 ${esc(l.t || '官方公告')}</a>`).join('')}</div>` : ''}
      <nav class="qaNav">${chips}</nav>
      ${blocks || '<div class="empty">沒有符合的變更。</div>'}
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
  document.addEventListener('compositionend', ev => { if(ev.target?.id === 'upQuery') ev.target.dispatchEvent(new Event('input', { bubbles: true })); });
  document.addEventListener('click', ev => {
    const wk = ev.target.closest?.('[data-up-week]');
    if(wk){ state.week = wk.dataset.upWeek; state.query = ''; renderUpdatesPage(); return; }
    const jump = ev.target.closest?.('[data-up-jump]');
    if(jump){ const sec = document.querySelector(`[data-up-sec="${jump.dataset.upJump}"]`); if(sec){ sec.open = true; sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    const op = ev.target.closest?.('[data-up-open]');
    if(op){ ev.preventDefault(); ev.stopPropagation(); window.SZO_PREVIEW?.open(op.dataset.upOpen, op.dataset.upId); }
  }, true);
  document.addEventListener('toggle', ev => { const k = ev.target?.dataset?.upSec; if(k){ if(ev.target.open) state.open.add(k); else state.open.delete(k); } }, true);
})();

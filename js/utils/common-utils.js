// V220: common DOM / formatting helpers shared by pages and features.
function byId(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function nameOf(o){return String((o&&o.Name)||'').trim()}
function intOf(v,d=0){const n=parseInt(String(v??'').replace(/,/g,''),10);return Number.isFinite(n)?n:d}
function fmt(n){if(typeof n==='bigint')return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); const x=Number(n); if(!Number.isFinite(x))return String(n??''); return Math.round(x).toLocaleString('en-US')}
function normHex(v){if(!v)return "";v=String(v).trim();if(/^0x/i.test(v))return "0x"+v.slice(2).toUpperCase().padStart(8,"0");const n=Number(v);if(Number.isFinite(n))return "0x"+n.toString(16).toUpperCase().padStart(8,"0");return v.toUpperCase()}
function raceName(v){const h=normHex(v);return RACE_MAP[h]||h||''}
function subtypeName(type,sub){const th=normHex(type), sh=normHex(sub);return SUBTYPE_MAP[`${th}|${sh}`]||sh||''}
function statusName(id){return statusIndex[String(intOf(id))]?.Name||''}
function magicName(id){return magicIndex[String(intOf(id))]?.Name||''}
function openDrawer(){byId('drawer').classList.add('open');byId('backdrop').classList.add('open')}
function closeDrawer(){byId('drawer').classList.remove('open');byId('backdrop').classList.remove('open')}
function setTopStatus(s){byId('topStatus').textContent=s}
function empty(msg){byId('reader').innerHTML=`<section class="empty">${esc(msg)}</section>`}


(function(){
 const groups={214:'虛空鬼奴（月費）',215:'虛空鬼奴（免費）',218:'錢莊理事：兌換',219:'錢莊理事：拆兌',220:'敖姬：再造',221:'敖姬：磨碎',222:'敖姬：磨碎',223:'敖姬：磨碎',224:'敖姬：磨碎',225:'敖姬：磨碎',226:'敖姬：磨碎',231:'敖姬：精製',232:'敖姬：精製',233:'敖姬：精製',241:'百濟煉魂師：2026武魂禮券'};
 window.SZO_ABYSS_ITEM_HTML=function(item){
  const data=window.SZO_ABYSS_EXCHANGES;
  if(!data)return '';
  const rows=data.rows.filter(r=>[...r.rewards,...r.materials].some(p=>p.id===String(item.ID)));
  if(!rows.length)return '';
  const list=parts=>parts.map(p=>`<button type="button" data-item="${esc(p.id)}">${esc(data.names[p.id]||p.id)}</button> × ${esc(p.count)}`).join('、');
  return `<section class="itemDetailSection"><h2>兌換與加工</h2><details${rows.length<=6?' open':''}><summary>${rows.length} 種配方</summary>${rows.map(r=>`<div style="padding:12px 0;border-bottom:1px solid var(--border,#354557);overflow-wrap:anywhere"><strong>${esc(groups[r.group]||r.name)}</strong><p>${list(r.materials)}</p><p>換得：${list(r.rewards)}</p></div>`).join('')}</details></section>`;
 };
})();

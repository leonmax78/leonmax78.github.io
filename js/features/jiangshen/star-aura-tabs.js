// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* ===== v88ax: 星等/靈氣內部分頁 + 破防備註移到底部 ===== */
(function(){
  const oldSetJiang = window.setJiang || (typeof setJiang==='function'?setJiang:null);
  const _esc2 = (s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const _byId2 = (id)=>document.getElementById(id);
  function _fmt2(n){ try{return (typeof fmt==='function')?fmt(n):Number(n||0).toLocaleString('zh-Hant');}catch(e){return String(n??'');} }
  function starOptions(selected=20){ return Array.from({length:21},(_,i)=>`<option value="${i}" ${i===selected?'selected':''}>${i} 星</option>`).join(''); }
  window.setJiang=function(kind){
    if(kind!=='starAura'){ if(oldSetJiang) return oldSetJiang(kind); return; }
    const r=_byId2('reader'); if(!r)return;
    r.innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>星等 / 靈氣計算</h2>
      <div class="calcTabs"><button class="calcTab active" type="button" data-star-tab="star">星等計算</button><button class="calcTab" type="button" data-star-tab="aura">靈氣計算</button></div>
      <div id="starTabNeed"><h3>星等：需要的降神數量</h3><div class="kvGrid">
        <div class="kv"><div class="k">目前星等</div><div class="v"><select id="needCur">${starOptions(0)}</select></div></div>
        <div class="kv"><div class="k">目標星等</div><div class="v"><select id="needTar">${starOptions(20)}</select></div></div>
        <div class="kv"><div class="k">已有降神魂數量</div><div class="v"><input id="needOwned" type="number" value="0"></div></div>
        <div class="kv"><div class="k">降神倍率</div><div class="v"><input id="needRate" type="number" value="1" step="0.1"></div></div>
      </div><div class="quick"><button id="calcNeeds" type="button">計算星等<small>估算升星還需要的數量</small></button></div><div id="starNeedResult"></div></div>
      <div id="starTabAura" style="display:none"><h3>靈氣：所需靈氣</h3><div class="kvGrid">
        <div class="kv"><div class="k">目前等級</div><div class="v"><input id="auraCur" type="number" value="1"></div></div>
        <div class="kv"><div class="k">目標等級</div><div class="v"><input id="auraTar" type="number" value="20"></div></div>
      </div><div class="quick"><button id="calcStarAura" type="button">計算靈氣<small>估算升等所需靈氣</small></button></div><div id="auraNeedResult"></div></div>
    </section>`;
    if(typeof closeDrawer==='function')closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
  };
  window.calcNeeds=function(){
    const cur=Math.max(0,Math.min(20,Number(_byId2('needCur')?.value||0))), tar=Math.max(0,Math.min(20,Number(_byId2('needTar')?.value||0)));
    const owned=Math.max(0,Number(_byId2('needOwned')?.value||0)), rate=Math.max(0.0001,Number(_byId2('needRate')?.value||1));
    const total=Math.abs(tar-cur); const need=Math.max(0,Math.ceil(total/rate-owned));
    const box=_byId2('starNeedResult'); if(box) box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">目標星等</div><div class="v">${cur} 星 → ${tar} 星</div></div><div class="kv"><div class="k">預估還需</div><div class="v">${_fmt2(need)}</div></div></div>`;
  };
  window.calcStarAura=function(){
    const cur=Math.max(1,Number(_byId2('auraCur')?.value||1)), tar=Math.max(cur,Number(_byId2('auraTar')?.value||cur));
    let total=0; for(let lv=cur;lv<tar;lv++) total+=lv;
    const box=_byId2('auraNeedResult'); if(box) box.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">等級區間</div><div class="v">${cur} → ${tar}</div></div><div class="kv"><div class="k">預估靈氣</div><div class="v">${_fmt2(total)}</div></div></div>`;
  };
  document.addEventListener('click',function(e){ const st=e.target.closest('[data-star-tab]'); if(!st)return; e.preventDefault(); e.stopPropagation(); document.querySelectorAll('[data-star-tab]').forEach(b=>b.classList.remove('active')); st.classList.add('active'); const tab=st.dataset.starTab; const need=_byId2('starTabNeed'), aura=_byId2('starTabAura'); if(need)need.style.display=tab==='star'?'block':'none'; if(aura)aura.style.display=tab==='aura'?'block':'none'; },true);
  function compactWan2(n){ n=Math.max(0,Math.round(Number(n)||0)); if(n>=10000){let v=n/10000; return (Math.round(v*10)/10).toString().replace(/\.0$/,'')+'萬';} return String(n); }
  window.breakSuggestText=function(def){ const d=Number(def)||0; if(!d)return ''; const r=64893/87946; const s=d/(2+r/2), x=s*r; const ax=d/(2+r/2), as=ax*r; return `破防參考：一般武器約 ${compactWan2(s)}力 / ${compactWan2(x)}敏；暗器約 ${compactWan2(as)}力 / ${compactWan2(ax)}敏`; };
  window.showMonster=function(id){
    window.v86LastView='monster'; try{history.pushState({app:'detail',view:'monster'},'','#monster-'+id);}catch(e){}
    const m=(window.monsters||monsters||[]).find(x=>String(x.ID).trim()===String(id).trim()); if(!m)return;
    const loc=(typeof locOf==='function')?locOf(nameOf(m)):'';
    const basicFields=[['ID',m.ID],['怪物名稱',nameOf(m)],['等級',m.Level],['生命',m.HP],['精力',m.MP],['種族',raceName(m.Type)],['子分類',subtypeName(m.Type,m.SubType)],['經驗',m.DropExp],['掉錢',monsterMoneyText(m)],['位置',loc]];
    const statFields=[['體魄',m.Con],['力量',m.Str],['智慧',m.Int],['靈敏',m.Dex]];
    const defenseFields=[['物理防禦',m.ExtraDef],['術法攻擊',m.MagicAttack],['術法防禦',m.MagicDef],['冰防',m.IceDef],['火防',m.FireDef],['雷防',m.LightningDef],['冥防',m.DarkDef],['抗定身',m.ParalysisRes],['抗毒',m.PosionRes],['抗盲目',m.BlindRes],['抗禁咒',m.SilentRes]];
    const skillFields=[['技能1',monsterSkillText(m.Skill1)],['技能2',monsterSkillText(m.Skill2)],['技能3',monsterSkillText(m.Skill3)],['技能4',monsterSkillText(m.Skill4)]];
    const showRows=rows=>rows.filter(x=>x[1]!==''&&x[1]!==undefined&&x[1]!==null&&String(x[1]).trim()!=='0');
    const kvHtml=(rows,cls='')=>`<div class="kvGrid ${cls}">${showRows(rows).map(([k,v])=>`<div class="kv"><div class="k">${_esc2(k)}</div><div class="v">${_esc2(v)}</div></div>`).join('')}</div>`;
    const drops=monsterDropRows(m); const basic=showRows(basicFields), stats=showRows(statFields), defenses=showRows(defenseFields), skills=showRows(skillFields);
    const breakNote=hasVal(m.ExtraDef)?`<div class="muted" style="margin-top:10px;font-weight:800">${_esc2(breakSuggestText(m.ExtraDef))}</div>`:'';
    _byId2('reader').innerHTML=`<section class="card monsterCompact"><button class="backBtn" type="button" onclick="goBackToPrevious()">← 返回查詢</button><h1>${_esc2(nameOf(m))}</h1><div class="monsterTopActions"><button type="button" class="primary" onclick="showMonsterDropPage('${_esc2(id)}')">查看掉落資訊<small>${drops.length?`共 ${drops.length} 筆掉落資料`:'沒有掉落資料'}</small></button></div><div class="monsterGrid"><div class="monsterPanel"><h3>怪物資料</h3>${kvHtml(basic,'monsterDataGrid')}</div>${stats.length?`<div class="monsterPanel"><h3>能力資訊</h3>${kvHtml(statFields,'monsterStatGrid')}</div>`:''}${defenses.length?`<div class="monsterPanel"><h3>防禦資訊</h3>${kvHtml(defenseFields,'monsterDefenseGrid')}${breakNote}</div>`:''}${skills.length?`<div class="monsterPanel monsterSkillPanel"><h3>技能資訊</h3>${kvHtml(skillFields,'monsterSkillGrid')}</div>`:''}</div></section>`;
    if(typeof closeDrawer==='function')closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
  };
})();

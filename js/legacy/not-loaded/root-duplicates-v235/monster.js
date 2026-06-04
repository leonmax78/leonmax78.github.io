// V201 monster.js
// Monster search/detail/drop page module extracted from app-core.js.
// This file intentionally uses the existing global helpers/data from app-core.js.

function parseDrop(v){
 const nums=String(v||'').split(',').map(x=>x.trim()).filter(Boolean); if(nums.length<4)return [];
 const raw=[]; for(let i=2;i+1<nums.length;i+=2){const id=String(nums[i]).trim();const w=Number(nums[i+1]);if(id&&id!=='0'&&Number.isFinite(w)&&w>0)raw.push([id,w])}
 const total=raw.reduce((s,x)=>s+x[1],0); return total?raw.map(([id,w])=>[id,w/total*100,w,total]):[];
}

function monsterSearchText(m){return `${nameOf(m)} ${m.ID||''} ${m.Level||''} ${m.DropExp||''} ${raceName(m.Type)} ${subtypeName(m.Type,m.SubType)} ${locOf(nameOf(m))}`.toLowerCase()}

function uniqueMonsterValues(fn){
 const set=new Set();
 monsters.forEach(m=>{const v=String(fn(m)||'').trim(); if(v)set.add(v);});
 return [...set];
}

function monsterRaceOptionsHTML(selected){
 const order=Object.values(RACE_MAP);
 const vals=uniqueMonsterValues(m=>raceName(m.Type)).sort((a,b)=>{
  const ai=order.indexOf(a), bi=order.indexOf(b);
  return (ai<0?999:ai)-(bi<0?999:bi) || a.localeCompare(b,'zh-Hant');
 });
 return `<option value="">全部種族</option>`+vals.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
}

function monsterSubtypeOptionsHTML(selected,race){
 const order=Object.values(SUBTYPE_MAP);
 const vals=uniqueMonsterValues(m=>{
  if(race && raceName(m.Type)!==race)return '';
  return subtypeName(m.Type,m.SubType);
 }).sort((a,b)=>{
  const ai=order.indexOf(a), bi=order.indexOf(b);
  return (ai<0?9999:ai)-(bi<0?9999:bi) || a.localeCompare(b,'zh-Hant');
 });
 return `<option value="">全部子分類</option>`+vals.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
}

function filterMonsterList(q,min,max,race,subtype){
 const hasLvFilter = !!(min || max);
 const qText=(q||'').trim().toLowerCase();
 const minLv=min?intOf(min):null;
 const maxLv=max?intOf(max):null;
 const raceFilter=String(race||'').trim();
 const subtypeFilter=String(subtype||'').trim();
 let arr=monsters.filter(m=>
  (!qText||monsterSearchText(m).includes(qText)) &&
  (!raceFilter||raceName(m.Type)===raceFilter) &&
  (!subtypeFilter||subtypeName(m.Type,m.SubType)===subtypeFilter) &&
  (minLv===null||intOf(m.Level)>=minLv) &&
  (maxLv===null||intOf(m.Level)<=maxLv)
 );
 if(hasLvFilter){arr = arr.slice().sort((a,b)=>intOf(b.DropExp)-intOf(a.DropExp));}
 return arr.slice(0,150);
}

function monsterResultsHTML(arr){
 return arr.map(m=>`<button type="button" class="resultItem" data-monster="${esc(m.ID)}" onclick="showMonster('${esc(m.ID)}');return false;"><div class="rName">${esc(nameOf(m))}</div><div class="rSub">Lv.${esc(m.Level||'')}｜EXP ${esc(m.DropExp||0)}｜${esc(raceName(m.Type))}${subtypeName(m.Type,m.SubType)?' / '+esc(subtypeName(m.Type,m.SubType)):''}｜${esc(locOf(nameOf(m)))}</div></button>`).join('')||'<div class="muted">找不到怪物</div>';
}

function renderMonsterPage(){
 const q=window.v88MonsterQ||'';
 const min=window.v88MonsterMin||'';
 const max=window.v88MonsterMax||'';
 const race=window.v88MonsterRace||'';
 const subtype=window.v88MonsterSubtype||'';
 byId('reader').innerHTML=`<section class="card monsterSearchPage"><h1>怪物查詢</h1>
  <div class="kvGrid">
    <div class="kv"><div class="k">怪物名稱 / ID / 位置 / 種族 / 子分類</div><div class="v"><input id="monsterQMain" placeholder="例如：問頂仙龍、飛燕、妖物系、蜘蛛精" value="${esc(q)}"></div></div>
    <div class="kv"><div class="k">種族</div><div class="v"><select id="monsterRaceMain">${monsterRaceOptionsHTML(race)}</select></div></div>
    <div class="kv"><div class="k">子分類</div><div class="v"><select id="monsterSubtypeMain">${monsterSubtypeOptionsHTML(subtype,race)}</select></div></div>
    <div class="kv"><div class="k">最低 Lv</div><div class="v"><input id="monsterMinMain" type="number" value="${esc(min)}"></div></div>
    <div class="kv"><div class="k">最高 Lv</div><div class="v"><input id="monsterMaxMain" type="number" value="${esc(max)}"></div></div>
  </div>
  <div class="results" id="monsterResultsMain"></div>
 </section>`;
 searchMonstersMain();
}

function searchMonstersMain(){
 const q=byId('monsterQMain'); if(!q)return;
 window.v88MonsterQ=q.value;
 window.v88MonsterMin=byId('monsterMinMain')?.value||'';
 window.v88MonsterMax=byId('monsterMaxMain')?.value||'';
 window.v88MonsterRace=byId('monsterRaceMain')?.value||'';
 window.v88MonsterSubtype=byId('monsterSubtypeMain')?.value||'';
 const subSel=byId('monsterSubtypeMain');
 if(subSel){
  const old=window.v88MonsterSubtype;
  subSel.innerHTML=monsterSubtypeOptionsHTML(old,window.v88MonsterRace);
  if([...subSel.options].some(o=>o.value===old))subSel.value=old;
  else {subSel.value=''; window.v88MonsterSubtype='';}
 }
 const hasFilter = !!(String(window.v88MonsterQ||'').trim() || String(window.v88MonsterMin||'').trim() || String(window.v88MonsterMax||'').trim() || String(window.v88MonsterRace||'').trim() || String(window.v88MonsterSubtype||'').trim());
 const box=byId('monsterResultsMain');
 if(!box)return;
 if(!hasFilter){box.innerHTML='';return;}
 const arr=filterMonsterList(window.v88MonsterQ,window.v88MonsterMin,window.v88MonsterMax,window.v88MonsterRace,window.v88MonsterSubtype);
 box.innerHTML=monsterResultsHTML(arr);
}

function monsterSkillText(v){
 const raw=String(v||'').trim();
 if(!raw)return '';
 return raw.split(',').map(x=>x.trim()).filter(Boolean).map(id=>{
  const mg=magicIndex[String(id).trim()];
  const n=mg && mg.Name ? String(mg.Name).trim() : '';
  return n || id;
 }).join('、');
}

function monsterMoneyText(m){
 const min=m.DropMoneyMin||'';
 const max=m.DropMoneyMax||'';
 if(!min&&!max)return '';
 return `${min||0} ~ ${max||0}`;
}

function monsterDropRows(m){
 return parseDrop(m.DropItem).map(([iid,rate])=>[iid,itemIndex[iid]?.Name||`未知道具 ${iid}`,rate.toFixed(6)+'%']);
}

function monsterDropsTableHTML(drops){
 return drops.length
  ? `<div class="tableWrap monsterDropTable"><table><thead><tr><th>道具</th><th>機率</th></tr></thead><tbody>${drops.map(r=>`<tr><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`
  : '<div class="empty">沒有掉落資料</div>';
}

function showMonsterDropPage(id){
 window.v86LastView='monsterDrop';
 history.pushState({app:'detail',view:'monsterDrop'},'','#monster-drop-'+id);
 const m=monsters.find(x=>String(x.ID).trim()===String(id).trim()); if(!m)return;
 const drops=monsterDropRows(m);
 byId('reader').innerHTML=`<section class="card monsterDropPage"><button class="backBtn" type="button" onclick="showMonster('${esc(id)}')">← 返回怪物資料</button><h1>${esc(nameOf(m))}｜掉落資訊</h1>${monsterDropsTableHTML(drops)}</section>`;
 closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}

function showMonster(id){
 window.v86LastView='monster';
 try{history.pushState({app:'detail',view:'monster'},'','#monster-'+id);}catch(e){}
 const m=monsters.find(x=>String(x.ID).trim()===String(id).trim()); if(!m)return;
 const loc=locOf(nameOf(m));
 const basicFields=[
  ['ID',m.ID],['怪物名稱',nameOf(m)],['等級',m.Level],['生命',m.HP],['精力',m.MP],
  ['種族',raceName(m.Type)],['子分類',subtypeName(m.Type,m.SubType)],
  ['經驗',m.DropExp],['掉錢',monsterMoneyText(m)],['位置',loc]
 ];
 const statFields=[
  ['體魄',m.Con],['力量',m.Str],['智慧',m.Int],['靈敏',m.Dex]
 ];
 const defenseFields=[
  ['物理防禦',hasVal(m.ExtraDef)?String(m.ExtraDef)+'｜建議：'+breakSuggestText(m.ExtraDef):m.ExtraDef],['術法攻擊',m.MagicAttack],['術法防禦',m.MagicDef],
  ['冰防',m.IceDef],['火防',m.FireDef],['雷防',m.LightningDef],['冥防',m.DarkDef],
  ['抗定身',m.ParalysisRes],['抗毒',m.PosionRes],['抗盲目',m.BlindRes],['抗禁咒',m.SilentRes]
 ];
 const skillFields=[
  ['技能1',monsterSkillText(m.Skill1)],['技能2',monsterSkillText(m.Skill2)],['技能3',monsterSkillText(m.Skill3)],['技能4',monsterSkillText(m.Skill4)]
 ];
 const showRows=rows=>rows.filter(x=>x[1]!==''&&x[1]!==undefined&&x[1]!==null&&String(x[1]).trim()!=='0');
 const kvHtml=(rows,cls='')=>`<div class="kvGrid ${cls}">${showRows(rows).map(([k,v])=>`<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`;
 const drops=monsterDropRows(m);
 const basic=showRows(basicFields), stats=showRows(statFields), defenses=showRows(defenseFields), skills=showRows(skillFields);
 byId('reader').innerHTML=`<section class="card monsterCompact"><button class="backBtn" type="button" onclick="goBackToPrevious()">← 返回查詢</button><h1>${esc(nameOf(m))}</h1><div class="monsterTopActions"><button type="button" class="primary" onclick="showMonsterDropPage('${esc(id)}')">查看掉落資訊<small>${drops.length?`共 ${drops.length} 筆掉落資料`:'沒有掉落資料'}</small></button></div><div class="monsterGrid"><div class="monsterPanel"><h3>怪物資料</h3>${kvHtml(basic,'monsterDataGrid')}</div>${stats.length?`<div class="monsterPanel"><h3>能力資訊</h3>${kvHtml(statFields,'monsterStatGrid')}</div>`:''}${defenses.length?`<div class="monsterPanel"><h3>防禦資訊</h3>${kvHtml(defenseFields,'monsterDefenseGrid')}</div>`:''}${skills.length?`<div class="monsterPanel monsterSkillPanel"><h3>技能資訊</h3>${kvHtml(skillFields,'monsterSkillGrid')}</div>`:''}</div></section>`;
 closeDrawer(); window.scrollTo({top:0,behavior:'smooth'});
}

// Expose monster module functions for later patch scripts and inline handlers.

window.parseDrop = parseDrop;
window.monsterSearchText = monsterSearchText;
window.uniqueMonsterValues = uniqueMonsterValues;
window.monsterRaceOptionsHTML = monsterRaceOptionsHTML;
window.monsterSubtypeOptionsHTML = monsterSubtypeOptionsHTML;
window.filterMonsterList = filterMonsterList;
window.monsterResultsHTML = monsterResultsHTML;
window.renderMonsterPage = renderMonsterPage;
window.searchMonstersMain = searchMonstersMain;
window.searchMonsters = searchMonstersMain;
window.monsterSkillText = monsterSkillText;
window.monsterMoneyText = monsterMoneyText;
window.monsterDropRows = monsterDropRows;
window.monsterDropsTableHTML = monsterDropsTableHTML;
window.showMonsterDropPage = showMonsterDropPage;
window.showMonster = showMonster;

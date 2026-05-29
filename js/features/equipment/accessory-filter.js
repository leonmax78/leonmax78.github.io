// Formal module path in V219. Original patch kept archived under js/legacy/not-loaded/archived-patches-v218/
/* v88ae 飾品清單與裝備篩選結構修正 */
(function(){
  const ACCESSORY_SEEDS = {"職業": ["獨眼慧珠", "諾亞航令", "誅仙御鐸", "龍之印信"], "五佐": ["金梁天佐鎮", "水嶷天佐針", "火熒天佐徽", "土伏天佐玉", "木篁天佐戒"], "五絕": ["五絕皇器"], "經驗": ["北饕萬餮硯", "謙卑集", "九鼎太清經"], "掉寶": ["天祿銜瑞綴", "萬用鑰匙", "南華題命譜"]};
  const MAIN_ORDER_88AE = ['武器','防具','飾品','仙器'];
  const WEAPON_TYPE_ORDER_88AE = ['劍','刀','斧頭','錘','槍','棍','禪杖','拂塵','暗器','盾'];
  const ARMOR_TYPE_ORDER_88AE = ['頭盔','鎧甲','護腕','靴'];
  const ACCESSORY_SERIES_ORDER_88AE = ['職業','五佐','五絕','經驗','掉寶'];
  const ACC_TIER_ORDER_88AE = ['五佐','真五佐','超五佐','極五佐','五絕','真五絕','超五絕','極五絕'];
  const DEF_JOB_ORDER_88AE = ['劍俠','勇士','術者','道人','僧侶','騰陽','靜月','宿星'];
  function n88(v){return String(v??'').replace(/\s+/g,'').trim();}
  function stripAccPrefix88(name){return n88(name).replace(/^(真|超|極)/,'');}
  function accTierByPrefix88(name,base){
    const s=n88(name);
    if(s.startsWith('極'))return '極'+base;
    if(s.startsWith('超'))return '超'+base;
    if(s.startsWith('真'))return '真'+base;
    return base;
  }
  function accessoryClassify88(name){
    const s=n88(name);
    if(!s)return null;
    const base=stripAccPrefix88(s);
    const inList=(cat)=> (ACCESSORY_SEEDS[cat]||[]).some(x=>stripAccPrefix88(x)===base || s.includes(n88(x)) || base.includes(stripAccPrefix88(x)));
    if(s.includes('天佐') || inList('五佐')) return {series:'五佐', tier:accTierByPrefix88(s,'五佐')};
    if(s.includes('五絕') || inList('五絕')) return {series:'五絕', tier:accTierByPrefix88(s,'五絕')};
    for(const cat of ['職業','經驗','掉寶']){
      if((ACCESSORY_SEEDS[cat]||[]).some(x=>n88(x)===s || s.includes(n88(x)))) return {series:cat, tier:''};
    }
    return null;
  }
  function rawToBaseStats88(raw){
    const add=(obj,key,label,value)=>{if(value!==undefined&&value!==null&&value!==''&&String(value)!=='0')obj[key]={label,value:Number(value)||0};};
    const addRange=(obj,key,label,min,max)=>{if((min!==undefined&&String(min)!=='') || (max!==undefined&&String(max)!==''))obj[key]={label,min:Number(min)||0,max:Number(max??min)||0};};
    const out={};
    raw=raw||{};
    add(out,'level','等級',raw.Level);
    add(out,'clevel','職等(CL)',raw.CLevel);
    add(out,'con','體魄',raw.Con);
    add(out,'str','力量',raw.Str);
    add(out,'int','智慧',raw.Int);
    add(out,'dex','敏捷',raw.Dex);
    add(out,'hp','生命',raw.HP);
    add(out,'mp','精力',raw.MP);
    addRange(out,'damage','傷害',raw.DamageMin,raw.DamageMax);
    add(out,'m_attack','術法攻擊',raw.MagicAttack);
    add(out,'def','物理防禦',raw.ExtraDef);
    add(out,'m_def','術法防禦',raw.MagicDef);
    add(out,'ice_def','冰防',raw.IceDef);
    add(out,'fire_def','火防',raw.FireDef);
    add(out,'lightning_def','雷防',raw.LightningDef);
    add(out,'dark_def','冥防',raw.DarkDef);
    add(out,'fire_attack','火傷',raw.FireAttack);
    add(out,'ice_attack','冰傷',raw.IceAttack);
    add(out,'lightning_attack','雷傷',raw.LightningAttack);
    add(out,'dark_attack','冥傷',raw.DarkAttack);
    add(out,'fire_prob','火傷機率',raw.FireProb);
    add(out,'ice_prob','冰傷機率',raw.IceProb);
    add(out,'lightning_prob','雷傷機率',raw.LightningProb);
    add(out,'dark_prob','冥傷機率',raw.DarkProb);
    add(out,'paralysis_res','麻痺抗性',raw.ParalysisRes);
    add(out,'poison_res','中毒抗性',raw.PosionRes ?? raw.PoisonRes);
    add(out,'blind_res','盲目抗性',raw.BlindRes);
    add(out,'silent_res','封咒抗性',raw.SilentRes);
    add(out,'attack','命中',raw.Attack);
    add(out,'attack_range','攻擊距離',raw.AttackRange);
    add(out,'durability','耐久',raw.Durabulity ?? raw.Durability);
    add(out,'weight','重量',raw.Weight);
    return out;
  }
  function itemByName88(name){
    const s=n88(name);
    if(!s || !Array.isArray(window.items||items))return null;
    return (items||[]).find(it=>n88(it.Name)===s) || null;
  }
  function typeHasOrnament88(it){
    const t=String(it?.Type||'');
    return t.split(',').map(x=>x.trim()).includes('ORNAMENT') || t==='ORNAMENT';
  }
  let accessoryCacheKey88='', accessoryCache88=[];
  function makeAccessoryEntry88(name, cls, raw, idx){
    raw=raw||itemByName88(name)||{};
    const nm=String(raw.Name||name||'').trim();
    const id=raw.ID||('acc_'+idx);
    const tier=cls.tier||'';
    return {
      uid:'acc_'+String(id)+'_'+n88(nm),
      item_id: raw.ID || '',
      name:nm,
      base_name:nm.replace(/^(真|超|極)/,''),
      display_type:'飾品',
      main_category:'飾品',
      type_codes:['ORNAMENT'],
      item_type_raw:'ORNAMENT',
      source_section:'飾品',
      source_name:nm,
      is_variant:/^(真|超|極)/.test(n88(nm)),
      variant_label:(n88(nm).match(/^(真|超|極)/)||[])[1]||null,
      series_group:cls.series,
      series_grade:tier,
      tier:tier,
      accessory_series:cls.series,
      accessory_tier:tier,
      base_stats:rawToBaseStats88(raw),
      raw_item:raw.ID?raw:{},
      matched_item_ini:!!raw.ID,
      series:cls.series+(tier?'('+tier+')':''),
      search_text:[nm,'飾品',cls.series,tier,raw.ID||'',raw.Type||''].filter(Boolean).join(' ')
    };
  }
  function dynamicAccessoryEquipment88(){
    const key=(items||[]).length+'|'+Object.keys(itemIndex||{}).length;
    if(key===accessoryCacheKey88)return accessoryCache88;
    const map=new Map();
    let idx=0;
    for(const [cat,names] of Object.entries(ACCESSORY_SEEDS)){
      for(const nm of names){
        const cls=accessoryClassify88(nm)||{series:cat,tier:''};
        map.set(n88(nm),makeAccessoryEntry88(nm,cls,itemByName88(nm),++idx));
      }
    }
    for(const it of (items||[])){
      if(!typeHasOrnament88(it))continue;
      const cls=accessoryClassify88(it.Name);
      if(!cls)continue;
      map.set(n88(it.Name),makeAccessoryEntry88(it.Name,cls,it,++idx));
    }
    accessoryCacheKey88=key;
    accessoryCache88=[...map.values()].sort((a,b)=>{
      const sa=ACCESSORY_SERIES_ORDER_88AE.indexOf(a.series_group), sb=ACCESSORY_SERIES_ORDER_88AE.indexOf(b.series_group);
      const ta=ACC_TIER_ORDER_88AE.indexOf(a.accessory_tier||''), tb=ACC_TIER_ORDER_88AE.indexOf(b.accessory_tier||'');
      return (sa<0?99:sa)-(sb<0?99:sb) || (ta<0?99:ta)-(tb<0?99:tb) || String(a.name).localeCompare(String(b.name),'zh-Hant');
    });
    return accessoryCache88;
  }
  const originalEqEquipList88 = window.eqEquipList || eqEquipList;
  window.eqEquipList=function(){
    const base=(typeof originalEqEquipList88==='function'?originalEqEquipList88():((eqData().equipment)||[]));
    const acc=dynamicAccessoryEquipment88();
    const seen=new Set();
    return [...base,...acc].filter(e=>{
      const k=e.uid||String(e.name);
      if(seen.has(k))return false;
      seen.add(k); return true;
    });
  };
  function eqKind88(e){
    if(!e)return '';
    if(e.main_category==='飾品'||e.display_type==='飾品')return '飾品';
    if(e.main_category==='仙器'||e.display_type==='仙器')return '仙器';
    if(e.display_type==='盾')return '武器';
    if(e.main_category==='武器')return '武器';
    if(e.main_category==='防具')return '防具';
    return e.main_category||'';
  }
  function displayJob88(e){
    if(e.series_group==='特仕裝'){
      if(e.job==='狂陽')return '騰陽';
      if(e.job==='靜月')return '靜月';
      if(e.job==='宿星')return '宿星';
      const nm=String(e.name||e.base_name||'');
      if(nm.startsWith('騰陽'))return '騰陽';
      if(nm.startsWith('凜月')||nm.startsWith('靜月'))return '靜月';
      if(nm.startsWith('舞星')||nm.startsWith('宿星'))return '宿星';
    }
    return e.job||e.series_grade||e.tier||'';
  }
  function eqSeriesVal88(e){
    const k=eqKind88(e);
    if(k==='仙器')return '';
    if(k==='飾品')return e.series_group||'';
    if(k==='防具')return e.series_group||'';
    if(k==='武器')return e.series_group||'';
    return e.series_group||'';
  }
  function eqTierVal88(e){
    const k=eqKind88(e);
    if(k==='飾品')return e.accessory_tier||e.series_grade||e.tier||'';
    if(k==='防具'){
      if(e.series_group==='職業裝')return e.job||'';
      if(e.series_group==='特仕裝')return displayJob88(e);
      return '';
    }
    if(k==='武器'){
      if(e.series_group==='職業裝')return e.series_grade||e.tier||'';
      if(e.series_group==='世貿裝')return e.tier||'';
    }
    return e.tier||e.series_grade||'';
  }
  function eqTypeVal88(e){
    const k=eqKind88(e);
    if(k==='飾品')return '飾品';
    if(k==='仙器')return '仙器';
    return e.display_type||'';
  }
  function orderValues88(vals,order){
    return eqUnique(vals).sort((a,b)=>{
      const ia=order.indexOf(a), ib=order.indexOf(b);
      return (ia<0?999:ia)-(ib<0?999:ib) || String(a).localeCompare(String(b),'zh-Hant',{numeric:true});
    });
  }
  function setEqFilterLabels88(){
    const labels=[...document.querySelectorAll('.eqFilterGrid label')];
    if(labels[0])labels[0].textContent='種類（武器 / 防具 / 飾品 / 仙器）';
    if(labels[1])labels[1].textContent='系列';
    if(labels[2]){
      if(eqState.main==='武器' && eqState.series==='世貿裝')labels[2].textContent='等級';
      else if(eqState.main==='防具')labels[2].textContent=eqState.series==='職業裝'?'職業':'種類';
      else if(eqState.main==='飾品')labels[2].textContent=(eqState.series==='五佐'||eqState.series==='五絕')?'分類':'細項';
      else labels[2].textContent='階級 / 等級';
    }
    if(labels[3])labels[3].textContent=eqState.main==='防具'?'部位':(eqState.main==='武器'?'部位':'類型');
  }
  window.eqRefreshFilters=function(){
    const all=eqEquipList();
    eqFillSelect('eqMain',MAIN_ORDER_88AE,'全部種類',eqState.main);
    const a1=all.filter(e=>!eqState.main||eqKind88(e)===eqState.main);
    let series=[];
    if(eqState.main==='武器')series=['職業裝','世貿裝'];
    else if(eqState.main==='防具')series=['職業裝','特仕裝'];
    else if(eqState.main==='飾品')series=ACCESSORY_SERIES_ORDER_88AE.filter(s=>a1.some(e=>eqSeriesVal88(e)===s));
    else series=eqUnique(a1.map(eqSeriesVal88)).filter(Boolean);
    eqFillSelect('eqSeries',series,'全部系列',eqState.series);
    const a2=a1.filter(e=>!eqState.series||eqSeriesVal88(e)===eqState.series);
    let tiers=eqUnique(a2.map(eqTierVal88)).filter(Boolean);
    if(eqState.main==='防具'&&eqState.series==='特仕裝')tiers=['騰陽','靜月','宿星'].filter(t=>a2.some(e=>eqTierVal88(e)===t));
    else if(eqState.main==='防具'&&eqState.series==='職業裝')tiers=orderValues88(tiers,DEF_JOB_ORDER_88AE);
    else if(eqState.main==='飾品'&&(eqState.series==='五佐'||eqState.series==='五絕'))tiers=orderValues88(tiers,ACC_TIER_ORDER_88AE);
    else tiers=tiers.sort((a,b)=>{const na=Number(a),nb=Number(b); if(!isNaN(na)&&!isNaN(nb))return na-nb; return String(a).localeCompare(String(b),'zh-Hant',{numeric:true});});
    eqFillSelect('eqTier',tiers, eqState.main==='武器'&&eqState.series==='世貿裝'?'全部等級':'全部階級 / 分類', eqState.tier);
    const a3=a2.filter(e=>!eqState.tier||String(eqTierVal88(e))===String(eqState.tier));
    let order=eqState.main==='防具'?ARMOR_TYPE_ORDER_88AE:(eqState.main==='武器'?WEAPON_TYPE_ORDER_88AE:['飾品','仙器']);
    let types=orderValues88(a3.map(eqTypeVal88).filter(Boolean),order);
    if(eqState.main==='飾品')types=[];
    eqFillSelect('eqType',types,'全部部位 / 類型',eqState.type);
    const typeBox=byId('eqType')?.closest('div');
    if(typeBox)typeBox.style.display=(eqState.main==='飾品')?'none':'';
    setEqFilterLabels88();
  };
  window.eqFilteredEquipment=function(){
    const q=(eqState.q||'').trim().toLowerCase();
    return eqEquipList().filter(e=>{
      if(eqState.main&&eqKind88(e)!==eqState.main)return false;
      if(eqState.series&&eqSeriesVal88(e)!==eqState.series)return false;
      if(eqState.tier&&String(eqTierVal88(e))!==String(eqState.tier))return false;
      if(eqState.type&&eqTypeVal88(e)!==eqState.type)return false;
      // v88ai：隱藏只有系列種子、沒有實際 ITEM 資料的飾品基礎項目。
      // 例如「誅仙御鐸」若實際裝備從「誅仙御鐸Ⅰ」開始，清單不顯示無 ID / 無 Lv 的基礎項。
      if(eqKind88(e)==='飾品' && !(e.item_id || e.raw_item?.ID || e.matched_item_ini))return false;
      if(q&&!String(e.search_text||e.name||'').toLowerCase().includes(q))return false;
      return true;
    }).slice(0,200);
  };
  window.eqRefreshList=function(){
    const box=byId('eqList'); if(!box)return;
    const arr=eqFilteredEquipment();
    box.innerHTML=arr.map(e=>`<button class="resultItem" data-eq-uid="${esc(e.uid)}"><div class="rName">${esc(e.name)}</div><div class="rSub">${esc(eqKind88(e)||'')}｜${esc(eqSeriesVal88(e)||e.series||'')}｜${esc(eqTierVal88(e)||'')}｜${esc(eqTypeVal88(e)||'')}｜Lv.${esc(e.base_stats?.level?.value||e.base_stats?.level||e.raw_item?.Level||'')}｜${e.item_id?('ID '+esc(e.item_id)):''}</div></button>`).join('') || '<div class="empty">請調整篩選條件，或找不到裝備。</div>';
  };
  window.eqSelected=function(){return eqEquipList().find(e=>e.uid===eqState.uid)||null;};
  const oldEqBaseStatsWithRaw88 = window.eqBaseStatsWithRaw || eqBaseStatsWithRaw;
  window.eqBaseStatsWithRaw=function(eq){
    if(eq && eq.main_category==='飾品' && (!eq.raw_item || !eq.raw_item.ID)){
      const it=itemByName88(eq.name);
      if(it){ eq.raw_item=it; eq.base_stats=rawToBaseStats88(it); eq.item_id=it.ID; eq.matched_item_ini=true; }
    }
    const base=oldEqBaseStatsWithRaw88(eq);
    const raw=eq?.raw_item||{};
    const extra=rawToBaseStats88(raw);
    for(const [k,v] of Object.entries(extra)){ if(base[k]===undefined)base[k]=v; }
    return base;
  };
  window.eqMetaLine=function(eq){
    const base=eqBaseStatsWithRaw(eq);
    const level=base.level?.value||eq?.raw_item?.Level||'';
    const clevel=base.clevel?.value??eq?.raw_item?.CLevel??'';
    const main=['等級 '+(level||'-'),'職等(CL) '+eqCLevelText(clevel)];
    const rest=[eq.item_id?('ID '+eq.item_id):'',eqKind88(eq),eqSeriesVal88(eq)||eq.series_group,eqTierVal88(eq),eqTypeVal88(eq)].filter(Boolean);
    return `<div class="eqTopMeta">${main.map(x=>`<span class="pill" style="font-size:14px;border-color:#60a5fa;color:#e0f2fe">${esc(x)}</span>`).join('')}${rest.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`;
  };
  window.renderEquipmentCompoundPage=function(){
    if(
      typeof ensureCompoundDataLoaded==='function' &&
      (typeof compoundDataReady==='undefined'||!compoundDataReady)
    ){
      byId('reader').innerHTML='<section class="card"><h1>合成資料讀取中</h1><div class="muted">第一次進入裝備合成模擬時會載入配方與裝備資料。</div></section>';
      ensureCompoundDataLoaded().then(ok=>{if(ok)window.renderEquipmentCompoundPage();});
      return;
    }
    window.v86LastView='item';
    byId('reader').innerHTML=`<section class="card"><h1>裝備合成模擬</h1><div class="muted">先依種類篩選裝備，點選裝備後會進入合成模擬頁。</div>
    <div class="eqFilterGrid"><div><label>種類（武器 / 防具 / 飾品 / 仙器）</label><select id="eqMain"></select></div><div><label>系列</label><select id="eqSeries"></select></div><div><label>階級 / 等級</label><select id="eqTier"></select></div><div><label>部位 / 類型</label><select id="eqType"></select></div><div style="grid-column:1/-1"><label>搜尋裝備名稱 / ID</label><input id="eqQ" value="${esc(eqState.q||'')}" placeholder="例如：椒圖、宮殤、五佐、飾品、300"></div></div>
    <h3>選擇裝備</h3><div class="results" id="eqList"></div></section>`;
    eqRefreshFilters(); eqRefreshList();
    closeDrawer();
    window.scrollTo({top:0,behavior:'smooth'});
  };
  document.addEventListener('change',function(e){
    const id=e.target&&e.target.id;
    if(id==='eqMain'){
      eqState.main=e.target.value; eqState.series=''; eqState.tier=''; eqState.type='';
      eqRefreshFilters(); eqRefreshList();
    }
    if(id==='eqSeries'){
      eqState.series=e.target.value; eqState.tier=''; eqState.type='';
      eqRefreshFilters(); eqRefreshList();
    }
    if(id==='eqTier'){
      eqState.tier=e.target.value; eqState.type='';
      eqRefreshFilters(); eqRefreshList();
    }
    if(id==='eqType'){
      eqState.type=e.target.value;
      eqRefreshFilters(); eqRefreshList();
    }
  },true);
})();

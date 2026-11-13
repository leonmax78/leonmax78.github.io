// V293: support jiangshen calculator, save slots, and comparison.
(function(){
  const $ = id => document.getElementById(id);
  const E = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const D = () => { try{ if(typeof DATA !== 'undefined') return DATA; }catch(e){} return window.DATA || {}; };
  const stats = () => (D().stats && D().stats.length ? D().stats : ['血量','精力','體魄','力量','智慧','靈敏','術攻','防禦','術防']);
  const allNames = () => (D().displayNames && D().displayNames.length ? D().displayNames : Object.keys(D().baseStats || {}));
  const names = () => allNames().filter(n => (window.SZO_JIANG_SHOWN||(()=>true))(n));
  let activeHeroMenu=null;
  document.addEventListener('pointerdown',e=>{
    if(activeHeroMenu && !activeHeroMenu.wrap.contains(e.target))activeHeroMenu.close();
  },true);
  function addHeroSearch(){
    const valid = new Set(allNames());
    document.querySelectorAll('#reader select').forEach(select=>{
      if(select.dataset.searchReady || !Array.from(select.options).some(o=>valid.has(o.value))) return;
      select.dataset.searchReady='1';
      const input=document.createElement('input');
      input.type='search'; input.className='heroNameSearch';
      input.placeholder='搜尋降神名稱'; input.setAttribute('aria-label','搜尋降神名稱');
      input.setAttribute('aria-controls',select.id);
      {
        const wrap=document.createElement('div'); wrap.className='heroCombobox';
        const list=document.createElement('div'); list.className='heroChoices'; list.hidden=true;
        list.id=select.id+'Choices';
        const toggle=document.createElement('button'); toggle.type='button'; toggle.className='heroChoiceToggle';
        toggle.textContent='▾'; toggle.title='展開降神名單'; toggle.setAttribute('aria-label','展開降神名單');
        const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');if(activeHeroMenu?.wrap===wrap)activeHeroMenu=null;};
        const choices=new WeakMap();
        const show=(query='')=>{
          if(activeHeroMenu?.wrap!==wrap)activeHeroMenu?.close();
          activeHeroMenu={wrap,close};
          list.replaceChildren();
          Array.from(select.options).filter(o=>!query || o.textContent.includes(query)).forEach(o=>{
            const option=document.createElement('button'); option.type='button'; option.textContent=o.textContent;
            option.setAttribute('role','option'); option.setAttribute('aria-selected',String(o.value===select.value));
            const choose=keyboard=>{select.value=o.value;input.value=o.value;input.setCustomValidity('');select.dispatchEvent(new Event('change',{bubbles:true}));close();if(keyboard)input.focus();else input.blur();};
            choices.set(option,choose);
            option.addEventListener('click',e=>{e.stopPropagation();choose(e.detail===0);});
            list.append(option);
          });
          list.hidden=false;input.setAttribute('aria-expanded','true');
        };
        list.setAttribute('role','listbox'); list.setAttribute('aria-label','主降神');
        // Safari can blur the input before a tapped option receives its click.
        let touchPick=null;
        list.addEventListener('pointerdown',e=>{
          const button=e.target.closest('button');
          if(!button)return;
          e.preventDefault();
          touchPick=e.pointerType==='touch' ? {button,x:e.clientX,y:e.clientY,scroll:list.scrollTop} : null;
        });
        list.addEventListener('pointercancel',()=>{touchPick=null;});
        list.addEventListener('touchend',e=>{
          const pick=touchPick;touchPick=null;
          const touch=e.changedTouches[0];
          if(!pick || !touch || Math.hypot(touch.clientX-pick.x,touch.clientY-pick.y)>10 || list.scrollTop!==pick.scroll)return;
          // Cancel the native compatibility click before hiding its target.
          // Selecting on pointerup lets iOS retarget that click underneath the list.
          e.preventDefault();
          e.stopPropagation();
          choices.get(pick.button)?.(false);
        },{passive:false});
        list.addEventListener('touchcancel',()=>{touchPick=null;});
        toggle.addEventListener('click',()=>show());
        input.addEventListener('click',()=>show());
        input.addEventListener('keydown',e=>{
          if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)show();list.querySelector('button')?.focus();}
          if(e.key==='Escape')close();
        });
        list.addEventListener('keydown',e=>{
          if(e.key==='Escape'){close();input.focus();}
          if(e.key==='ArrowDown' || e.key==='ArrowUp'){e.preventDefault();(e.key==='ArrowDown' ? e.target.nextElementSibling : e.target.previousElementSibling)?.focus();}
        });
        wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close();});
        input.type='text'; input.setAttribute('role','combobox');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-autocomplete','list');
        input.id=select.id+'Search'; input.placeholder=select.id==='recMain' ? '預設（自動推薦主降神）' : '搜尋或選擇降神';
        input.value=select.value; input.style.marginBottom='0';
        select.hidden=true;
        document.querySelector(`label[for="${select.id}"]`)?.setAttribute('for',input.id);
        input.addEventListener('input',()=>{
          const value=input.value.trim();
          show(value);
          const known=!value || value==='預設' || Array.from(select.options).some(o=>o.value===value);
          input.setCustomValidity(known ? '' : '請選擇清單中的降神名稱');
          if(known){select.value=valid.has(value) ? value : ''; select.dispatchEvent(new Event('change',{bubbles:true}));}
        });
        input.addEventListener('change',()=>{
          if(!input.checkValidity())input.value=select.value;
          input.setCustomValidity('');
        });
        select.before(wrap);wrap.append(input,toggle,list);
        select.addEventListener('change',()=>{input.value=select.value;});
        new MutationObserver(()=>{input.value=select.value;close();}).observe(select,{childList:true});
        return;
      }
      input.addEventListener('input',()=>{
        const query=input.value.trim();
        Array.from(select.options).forEach(o=>{o.hidden=!!query && !!o.value && !o.textContent.includes(query) && !o.selected;});
      });
      select.before(input);
    });
  }
  new MutationObserver(addHeroSearch).observe(document.getElementById('reader'),{childList:true,subtree:true});
  addHeroSearch();
  const fmt = n => {
    const x = Math.ceil(Number(n || 0));
    try { return x.toLocaleString('zh-Hant'); } catch(e){ return String(x); }
  };
  const starOptions = (sel=1) => Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join('');
  const SLOT_KEY = 'szo_support_slots_v88be';
  const CUR_KEY = 'szo_support_current_v88be';
  const SLOT_LETTERS = ['A','B','C','D','E'];

  function closeMenu(){ if(typeof closeDrawer === 'function') closeDrawer(); }
  function scrollTop(){ try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); } }
  function getAbility(name,star){ if(typeof ability === 'function') return ability(name,star) || {}; return {}; }
  function scale(a,rate=1){ const out={}; for(const st of stats()) out[st] = Math.ceil(Number(a?.[st] || 0) * rate); return out; }
  function add(a,b){ const out={}; for(const st of stats()) out[st] = Math.ceil(Number(a?.[st] || 0) + Number(b?.[st] || 0)); return out; }
  function kvGrid(obj){ return `<div class="kvGrid">${stats().map(st=>`<div class="kv"><div class="k">${E(window.SZO_DISPLAY.label(st))}</div><div class="v">${fmt(obj?.[st] || 0)}</div></div>`).join('')}</div>`; }
  function emptyMsg(msg){ if(typeof empty === 'function') empty(msg); else alert(msg); }
  function supportBackBtn(){ return '<button class="backBtn" type="button" onclick="setJiang(\'support\')">← 返回副降神試算</button>'; }
  function defaultSet(){ return Array.from({length:5},()=>({n:'',s:1})); }
  function readJson(k,def){ try{return JSON.parse(localStorage.getItem(k) || '') || def;}catch(e){return def;} }
  function writeJson(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function normalizeSet(set){ return Array.from({length:5},(_,i)=>({n:set?.[i]?.n || '', s:Math.max(0,Math.min(20,Math.floor(Number(set?.[i]?.s ?? 1))))})); }
  function getSlots(){ const arr = readJson(SLOT_KEY,[]); return Array.from({length:5},(_,i)=>normalizeSet(Array.isArray(arr[i]) ? arr[i] : defaultSet())); }
  function setSlots(slots){ writeJson(SLOT_KEY, slots.map(normalizeSet)); }
  function getCurrent(){ return normalizeSet(readJson(CUR_KEY,defaultSet())); }
  function setCurrent(v){ writeJson(CUR_KEY,normalizeSet(v)); }
  function readPlan(prefix='P'){ return Array.from({length:5},(_,i)=>({n:$(prefix+'N'+i)?.value || '', s:Math.max(0,Math.min(20,Math.floor(Number($(prefix+'S'+i)?.value || 1))))})); }
  function fillPlan(prefix,set){ normalizeSet(set).forEach((p,i)=>{ const n=$(prefix+'N'+i), s=$(prefix+'S'+i); if(n)n.value=p.n || ''; if(s)s.value=String(p.s ?? 1); }); }
  function slotSummary(set){ const parts = normalizeSet(set).filter(p=>p.n).map(p=>`${p.n}(${p.s})`); return parts.length ? parts.join('、') : '空白'; }
  function saveCurrent(){ setCurrent(readPlan('P')); }
  function selectedNames(prefix='P'){ return Array.from({length:5},(_,i)=>$(prefix+'N'+i)?.value || '').filter(Boolean); }
  function supportNameOptions(current='',chosen=[]){
    return '<option value="">空白</option>' + names()
      .filter(n => n === current || !chosen.includes(n))
      .map(n => `<option value="${E(n)}" ${n===current?'selected':''}>${E(n)}</option>`)
      .join('');
  }
  function refreshNameOptions(prefix='P'){
    const chosen = selectedNames(prefix);
    for(let i=0;i<5;i++){
      const sel = $(prefix+'N'+i);
      if(!sel) continue;
      const current = sel.value || '';
      sel.innerHTML = supportNameOptions(current, chosen);
    }
  }
  function planHtml(prefix='P'){
    return `<div class="supportPlan"><h3>降神配置</h3>${Array.from({length:5},(_,i)=>`
      <div class="kv supportChoiceCard">
        <div class="k">${i===0?'主降神':'副降神 '+i}</div>
        <div class="v"><select id="${prefix}N${i}" class="supportInput">${supportNameOptions()}</select><label>星等</label><select id="${prefix}S${i}" class="supportInput">${starOptions(i===0?20:1)}</select></div>
      </div>`).join('')}</div>`;
  }
  function slotOptions(selected=0){ const slots=getSlots(); return SLOT_LETTERS.map((x,i)=>`<option value="${i}" ${i===selected?'selected':''}>存檔 ${x}：${E(slotSummary(slots[i]))}</option>`).join(''); }
  function calcPlan(set){
    let total = Object.fromEntries(stats().map(s=>[s,0]));
    const picks = [];
    for(let i=0;i<5;i++){
      const p = normalizeSet(set)[i] || {};
      if(!p.n) continue;
      const shown = scale(getAbility(p.n,p.s || 1), i===0 ? 1 : 0.1);
      total = add(total, shown);
      picks.push({i,n:p.n,s:p.s || 1,a:shown});
    }
    const combos = typeof activeCombos === 'function' ? activeCombos(picks.map(p=>p.n)) : [];
    if(typeof comboBonus === 'function') total = add(total, scale(comboBonus(combos),1));
    return {total,picks,combos};
  }
  function picksText(res){
    return res.picks.length
      ? res.picks.map(p => `${p.i===0?'主降神':'副降神 '+p.i}：${E(p.n)} ${p.s}星${p.i===0?'':'（10%）'}`).join('、')
      : '尚未選擇';
  }
  function comboTextBlock(res){
    return res.combos && res.combos.length
      ? res.combos.map(c=>`<div class="notice"><b>${E(c)}</b><br>${E(((D().comboMembers || {})[c] || []).join('、'))}<br>${E(typeof comboText === 'function' ? comboText(c) : '')}</div>`).join('')
      : '<div class="empty">沒有成立連結</div>';
  }

  function renderSupportLegacy(){
    const reader = $('reader'); if(!reader) return;
    reader.innerHTML = `<section class="card"><h1>降神、經驗、修練試算</h1><h2>副降神試算</h2>
      <div class="notice">主降神以 100% 能力計算；副降神 1 ~ 4 各 10%。可直接試算，也可以存入 A ~ E 後做比較。</div>
      ${planHtml('P')}
      <div class="supportSaveBar">
        <button id="calcSupportOnce" type="button">直接試算</button>
        <label style="margin:0">存檔到<select id="supportSaveSlot">${SLOT_LETTERS.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select></label>
        <button id="saveSupportSlot" type="button">存檔</button>
        <button id="loadSupportSlot" type="button">讀取</button>
        <button id="openSupportCompare" type="button">開啟存檔比較</button>
      </div>
      <div id="supportLoadNotice" class="muted"></div>
      <h3>目前存檔</h3><div id="supportSlotList" class="kvGrid"></div>
    </section>`;
    fillPlan('P',getCurrent());
    refreshNameOptions('P');
    document.querySelectorAll('.supportInput').forEach(el=>el.addEventListener('change',()=>{ saveCurrent(); if(/^PN\d+$/.test(el.id || '')) refreshNameOptions('P'); }));
    refreshSlotList();
    $('calcSupportOnce').onclick = calcSupportOnce;
    $('saveSupportSlot').onclick = () => {
      const idx = Number($('supportSaveSlot').value || 0);
      const slots = getSlots();
      const plan = readPlan('P');
      slots[idx] = plan;
      setSlots(slots);
      setCurrent(plan);
      refreshSlotList();
      alert('已存入存檔 ' + SLOT_LETTERS[idx] + '：' + slotSummary(plan));
    };
    $('loadSupportSlot').onclick = () => loadSupportSlot(Number($('supportSaveSlot').value || 0));
    $('openSupportCompare').onclick = renderSupportCompare;
  }

  // V755: card layout like the 神魂寶石 page — pick a slot card, choose 降神 and 星等 on the left,
  // totals and 連結 update at once. Same storage (szo_support_current / slots) as before.
  let activeSlot = 0, heroQuery = '', heroSeries = '';
  // V756: portrait (BODYWND body{Head}) and 聯動 series for each 降神: name -> [head, series, game order, hidden?]; series from the owner's 降神分類.xlsx
  const HERO_INFO = {"蝦兵":[6001,"（待定）原創一般",1,1],"蟹將":[6002,"（待定）原創一般",2,1],"鬼卒":[6003,"（待定）原創稀有",3,1],"白骨妖":[6004,"（待定）原創精英",4,1],"傘鬼":[6005,"（待定）原創精英",5,1],"河童":[6006,"（待定）原創一般",6,1],"猴精":[6007,"（待定）原創一般",7,1],"火元素":[6008,"（待定）原創一般",8,1],"風元素":[6009,"（待定）原創精英",9,1],"水元素":[6010,"（待定）原創精英",10,1],"土元素":[6011,"（待定）原創一般",11,1],"兔精":[6012,"（待定）原創精英",12,1],"狐精":[6013,"（待定）原創精英",13,1],"狸妖":[6014,"（待定）原創精英",14,1],"侏人戰將":[6015,"（待定）原創一般",15,1],"金翅鳥":[6016,"（待定）原創一般",16,1],"牛頭":[6017,"（待定）原創一般",17,1],"馬面":[6018,"（待定）原創一般",18,1],"喇嘛":[6019,"（待定）原創精英",19,1],"魔女":[6020,"（待定）原創精英",20,1],"天將":[6021,"（待定）原創稀有",21,1],"火麒麟":[6022,"（待定）原創一般",22,1],"冰麒麟":[6023,"（待定）原創稀有",23,1],"毒麒麟":[6024,"（待定）原創精英",24,1],"合薩兒":[6025,"（待定）原創稀有",25,1],"哲別":[6026,"（待定）原創一般",26,1],"衝石徹":[6027,"（待定）原創一般",27,1],"東瀛劍聖":[6028,"（待定）原創一般",28,1],"東瀛忍尊":[6029,"（待定）原創稀有",29,1],"象神格涅沙":[6030,"（待定）原創一般",30,1],"東海龍王":[6031,"（待定）原創稀有",31,1],"蒼狼大汗":[6032,"（待定）原創一般",32,1],"非我":[6033,"（待定）原創一般",33,1],"樓蘭公主":[6034,"（待定）原創精英",34,1],"西域邪神":[6035,"（待定）原創精英",35,1],"鬼嶽將軍":[6036,"（待定）原創一般",36,1],"濕婆":[6037,"（待定）原創稀有",37,1],"波斯武帝":[6038,"（待定）原創稀有",38,1],"修羅魔君":[6039,"傳說",39,1],"無界閻羅":[6040,"傳說",40,1],"魔獄邪帝":[6041,"傳說",41,1],"天鬼神":[6042,"傳說",42,1],"九華神曜":[6043,"傳說",43,1],"四聖太宰":[6044,"傳說",44,1],"呂布":[6045,"傳說降神",45],"應龍":[6046,"傳說降神",46],"雅典娜":[6047,"傳說降神",47],"毛古":[6048,"特殊類",48,1],"劉備":[6049,"幻想三國誌",49],"關羽":[6050,"幻想三國誌",50],"張飛":[6051,"幻想三國誌",51],"趙雲":[6052,"幻想三國誌",52],"計蒙":[6053,"幻想三國誌5",53],"玄京":[6054,"幻想三國誌5",54],"殊臣":[6055,"幻想三國誌5",55],"玄冥":[6056,"幻想三國誌5",56],"鐵馥雪":[6057,"幻想三國誌5",57],"慕容妍":[6058,"幻想三國誌5",58],"嚴朔":[6059,"幻想三國誌5",59],"勾芒":[6060,"幻想三國誌5",60],"雷歐納德":[6061,"幻世錄一轉",61],"克羅蒂":[6066,"幻世錄一轉",62],"緹娜":[6062,"幻世錄一轉",63],"琥":[6063,"幻世錄一轉",64],"雷特":[6064,"幻世錄一轉",65],"雪拉":[6065,"幻世錄一轉",66],"精靈王克里歐司":[6069,"幻世錄一轉",67],"劍豪雷歐納德":[6071,"幻世錄二轉",68],"神官緹娜":[6072,"幻世錄二轉",69],"魍魎劍士克羅蒂":[6082,"幻世錄二轉",70],"神射手琥":[6081,"幻世錄二轉",71],"天行者雷特":[6083,"幻世錄二轉",72],"精靈使雪拉":[6084,"幻世錄二轉",73],"漢克斯":[6067,"幻世錄一轉",74],"暗殺者漢克斯":[6085,"幻世錄二轉",75],"嚎":[6068,"幻世錄一轉",76],"狂戰士嚎":[6086,"幻世錄二轉",77],"咕嚕":[6070,"幻世錄一轉",78],"魔物咕嚕":[6080,"幻世錄二轉",79],"魔神":[6089,"幻世錄三轉",80],"素還真":[6077,"霹靂布袋戲",81],"一頁書":[6078,"霹靂布袋戲",82],"葉小釵":[6079,"霹靂布袋戲",83],"終焉劍使雷歐納德":[6087,"幻世錄三轉",84],"公主緹娜":[6088,"幻世錄三轉",85],"魔將克羅蒂":[6099,"幻世錄三轉",86],"魔將塔克斯":[6102,"幻世錄三轉",87],"魔將傲":[6101,"幻世錄三轉",88],"魔將席德爾":[6100,"幻世錄三轉",89],"妖精王克里歐司":[6098,"幻世錄三轉",90],"霸王丸":[6113,"真侍魂",91],"娜可露露":[6114,"真侍魂",92],"橘右京":[6115,"真侍魂",93],"加爾福特":[6116,"真侍魂",94],"千兩狂死郎":[6117,"真侍魂",95],"姬軒":[6130,"幻想三國誌",96],"姬霜":[6131,"幻想三國誌",97],"百玥":[6132,"幻想三國誌",98],"貂芷":[6133,"幻想三國誌",99],"糜香":[6134,"幻想三國誌",100],"虞冰":[6135,"幻想三國誌",101],"黃帝":[6136,"幻想三國誌",102],"孟祈":[6140,"超時空英雄傳說",103],"凜雪鴉":[6142,"東離劍遊紀",104],"殤不患":[6143,"東離劍遊紀",105],"浪巫謠":[6144,"東離劍遊紀",106],"阿爾貝盧法":[6145,"東離劍遊紀",107],"禍世螟蝗":[6146,"東離劍遊紀",108],"紅夜":[6163,"幻想三國誌鳳凰誓",109],"白樺":[6164,"幻想三國誌鳳凰誓",110],"魔化黃帝":[6139,"幻想三國誌鳳凰誓",111],"趙活":[6165,"活俠傳",112],"唐布衣":[6166,"活俠傳",113],"唐默鈴":[6167,"活俠傳",114],"龍湘":[6168,"活俠傳",115],"虞小梅":[6169,"活俠傳",116],"夏侯蘭":[6170,"活俠傳",117],"楊鐵":[6179,"超時空英雄傳說",118],"雪兒":[6180,"超時空英雄傳說",119],"無雙":[6181,"超時空英雄傳說",120],"韓凱蒂":[6182,"超時空英雄傳說",121],"江小魚":[6196,"新絕代雙驕",122],"花無缺":[6197,"新絕代雙驕",123],"鐵心蘭":[6198,"新絕代雙驕",124],"張菁":[6199,"新絕代雙驕",125],"蘇櫻":[6200,"新絕代雙驕",126],"憐星":[6201,"新絕代雙驕",127],"燕南天":[6202,"新絕代雙驕",128],"魔黃":[6139,"幻想三國誌鳳凰誓",111,1],"咕嚕(一轉)":[6070,"幻世錄一轉",78,1]};
  // V758: the owner's hidden list applies to every 降神 page (比較、20星總表、推薦…)
  window.SZO_JIANG_SHOWN = n => !(HERO_INFO[n] && HERO_INFO[n][3]);
  // 聯動 in release order (follows the game's 降神 order); 幻想三國誌 series kept together
  const SERIES = ['傳說降神','幻想三國誌','幻想三國誌5','幻想三國誌鳳凰誓','幻世錄一轉','幻世錄二轉','幻世錄三轉','霹靂布袋戲','真侍魂','超時空英雄傳說','東離劍遊紀','活俠傳','新絕代雙驕'];
  const headSrc = n => { const h = HERO_INFO[n]; if(!h) return ''; const p = String(location.pathname||''); return (p==='/test'||p.startsWith('/test/')?'/test/':'/') + 'assets/test-media/jiangshen-heads/h' + h[0] + '.webp?v=1'; };
  const headImg = (n, cls) => { const src = headSrc(n); return src ? `<img class="${cls}" src="${src}" alt="" loading="lazy" decoding="async">` : `<span class="${cls} none"></span>`; };
  window.SZO_JIANG_HEADS = {info:HERO_INFO, series:SERIES, img:headImg};
  const RATE_LABEL = i => i===0 ? '主降神・100%' : `副降神 ${i}・10%`;
  // V763: shared bits for the three 降神 tabs
  const canon = n => { try{ return (typeof canonicalName === 'function' && canonicalName(n)) || n; }catch(e){ return n; } };
  const comboList = () => Object.entries(D().comboMembers || {}).map(([c,m]) => [c, (m || []).map(canon)]);
  const combosOf = list => (typeof activeCombos === 'function' ? activeCombos(list.filter(Boolean)) : []);
  const JS_TABS = active => (window.SZO_JIANG_NAV ? window.SZO_JIANG_NAV('support') : '') + `<div class="jsTabs jsSubTabs">${[['support','副降神試算'],['recommend','組合推薦方案'],['supportCompare','存檔比較']].map(([k,l]) => `<button type="button" ${k===active ? 'aria-selected="true"' : `onclick="setJiang('${k}')"`}>${l}</button>`).join('')}</div>`;
  const miniHeads = set => `<span class="jsMini">${normalizeSet(set).map((p,i) => p.n ? `<span title="${E(p.n)} ${p.s}星">${headImg(p.n,'')}${i===0 ? `<em>${p.s}</em>` : ''}</span>` : '<span class="none"></span>').join('')}</span>`;
  let cmpSlot = null;
  if(!window.__jsStickyBound){
    window.__jsStickyBound = true;
    window.addEventListener('scroll', () => {
      const bar = document.getElementById('jsSticky'); if(!bar) return;
      const cards = document.querySelector('.jsPage .jsCards');
      if(!cards){ bar.remove(); return; }
      const hdr = document.querySelector('header.topbar');
      const top = hdr && /fixed|sticky/.test(getComputedStyle(hdr).position) ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0;
      bar.style.top = top + 'px';
      bar.classList.toggle('show', !!cards && window.matchMedia('(max-width:820px)').matches && cards.getBoundingClientRect().bottom < top);
    }, {passive:true});
  }
  function renderSupport(){
    const reader = $('reader'); if(!reader) return;
    const plan = getCurrent();
    const res = calcPlan(plan);
    const chosen = plan.map(p=>p.n);
    const cur = plan[activeSlot];
    const q = heroQuery.trim();
    const order = n => (HERO_INFO[n] ? HERO_INFO[n][2] : 999);
    const shown = n => HERO_INFO[n] && !HERO_INFO[n][3];
    const heroes = names().filter(n => shown(n) && (!q || n.includes(q)) && (!heroSeries || (HERO_INFO[n] && HERO_INFO[n][1]===heroSeries))).sort((a,b)=>order(a)-order(b));
    const seriesCount = k => names().filter(n => shown(n) && HERO_INFO[n][1]===k).length;
    const slots = getSlots();
    // which picks would complete a new 連結 in the slot being edited
    const base = chosen.filter((n,i) => n && i !== activeSlot);
    const baseCombos = new Set(combosOf(base));
    const gainOf = n => combosOf(base.concat(n)).filter(c => !baseCombos.has(c));
    // 連結 that are one 降神 short
    const have = new Set(chosen.filter(Boolean).map(canon));
    const near = comboList().filter(([c,m]) => m.length > 1 && !res.combos.includes(c) && m.filter(x => !have.has(x)).length === 1)
      .map(([c,m]) => [c, m.find(x => !have.has(x))]).filter(([,miss]) => shown(miss)).slice(0, 8);
    const freeSlot = plan.findIndex(p => !p.n);
    const cardLinks = n => res.combos.filter(c => ((D().comboMembers || {})[c] || []).map(canon).includes(canon(n)));
    const cmpOk = cmpSlot !== null && normalizeSet(slots[cmpSlot]).some(p=>p.n);
    const cmpTotal = cmpOk ? calcPlan(slots[cmpSlot]).total : null;
    reader.innerHTML = `<section class="card jsPage"><h1>降神、經驗、修練試算</h1>
      ${JS_TABS('support')}
      <div class="jsSticky" id="jsSticky">${plan.map((p,i)=>`<button type="button" data-js-jump="${i}" class="${i===activeSlot?'active':''}">${p.n ? headImg(p.n,'') : '<span>＋</span>'}<small>${i===0?'主':'副'+i}</small></button>`).join('')}</div>
      <div class="jsLayout">
        <aside class="jsSide">
          <div class="jsSideHead">正在設定：<b>${E(RATE_LABEL(activeSlot).replace('・',' '))}</b></div>
          <input id="jsHeroSearch" type="search" placeholder="搜尋降神名稱" value="${E(heroQuery)}">
          <div class="jsSeries">${['', ...SERIES].map(k => `<button type="button" class="${heroSeries===k?'active':''}" data-js-series="${E(k)}">${k ? E(k) + `<small>${seriesCount(k)}</small>` : '全部'}</button>`).join('')}</div>
          <div class="jsHeroList">${['', ...heroes].map(n => {
              const used = n && chosen.includes(n) && cur.n !== n;
              const gain = n && !used && cur.n !== n ? gainOf(n) : [];
              return `<button type="button" class="${cur.n===n ? 'active' : ''} ${n ? '' : 'clear'} ${gain.length ? 'link' : ''}" data-js-hero="${E(n)}" ${used ? 'disabled title="已放在其他欄位"' : gain.length ? `title="選了可成立：${E(gain.join('、'))}"` : ''}>${n ? headImg(n,'jsHeroFace') + `<span>${E(n)}</span>` + (gain.length ? `<em class="jsLinkHint">＋${E(gain[0])}${gain.length>1?' 等'+gain.length+'個':''}</em>` : '') : '<span>清除此欄</span>'}</button>`;
            }).join('')}${heroes.length ? '' : '<small class="muted">沒有符合的降神</small>'}</div>
          <div class="jsLabel">星等</div>
          <div class="jsStars">${Array.from({length:21},(_,i)=>`<button type="button" class="${cur.s===i ? 'active' : ''}" data-js-star="${i}">${i}</button>`).join('')}</div>
          <button type="button" class="jsStarAll" id="jsStarAll" ${plan.slice(1).some(p=>p.n) ? '' : 'disabled'}>副降神全部設為 ${cur.s} 星</button>
        </aside>
        <div class="jsStat">
          <div class="jsLabel">總能力（含連結）</div>
          <div class="jsTotals">${stats().map(st=>`<div><span>${E(window.SZO_DISPLAY.label(st))}</span><b class="${Number(res.total[st])?'':'zero'}">+${fmt(res.total[st])}</b></div>`).join('')}</div>
          <div class="jsLabel">成立連結</div>
          <div class="jsCombos">${res.combos && res.combos.length ? res.combos.map(c=>`<div><b>${E(c)}</b><small>${E(typeof comboText === 'function' ? comboText(c) : '')}</small></div>`).join('') : '<small class="muted">沒有成立連結</small>'}</div>
          ${near.length ? `<div class="jsLabel">差 1 隻就成立</div>
          <div class="jsNear">${near.map(([c,miss])=>`<button type="button" data-js-fill="${E(miss)}" title="${E(typeof comboText === 'function' ? comboText(c) : '')}">${headImg(miss,'jsHeroFace')}<span><b>${E(c)}</b><small>缺 ${E(miss)}・點一下放進${freeSlot>=0 ? (freeSlot===0?'主降神':'副降神 '+freeSlot) : '目前欄位'}</small></span></button>`).join('')}</div>` : ''}
        </div>
        <div class="jsMain">
          <div class="jsCards">${plan.map((p,i)=>{
            const a = res.picks.find(x=>x.i===i)?.a || {};
            const all = stats().map(st=>[st, Number(a[st]||0)]);
            const links = p.n ? cardLinks(p.n) : [];
            return `<button type="button" class="jsCard ${i===activeSlot?'active':''} ${p.n?'':'empty'}" data-js-slot="${i}">
              <span class="jsCardRole">${E(RATE_LABEL(i))}</span>
              <span class="jsCardFace">${p.n ? headImg(p.n,'') : '<span class="jsCardPlus">＋</span>'}${p.n ? `<span class="jsCardStar">${p.s} 星</span>` : ''}</span>
              <span class="jsCardName">${p.n ? E(p.n) : '點這裡選降神'}</span>
              ${links.length ? `<span class="jsCardLinks">${links.map(l=>`<i>${E(l)}</i>`).join('')}</span>` : ''}
              ${p.n ? `<span class="jsCardStats">${all.map(([st,v])=>`<span class="${v?'':'zero'}"><i>${E(window.SZO_DISPLAY.label(st))}</i><b>+${fmt(v)}</b></span>`).join('')}</span>` : ''}
            </button>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="jsBelow">
          <div class="jsLabel">存檔</div>
          <div class="jsSlots">${SLOT_LETTERS.map((x,i)=>{
            const empty = !normalizeSet(slots[i]).some(p=>p.n);
            return `<div class="jsSlot ${cmpSlot===i && !empty ? 'cmp' : ''}"><b>${x}</b>${empty ? '<span class="muted">空白</span>' : miniHeads(slots[i])}<button type="button" data-js-save="${i}">存入</button><button type="button" data-js-load="${i}" ${empty?'disabled':''}>讀取</button><button type="button" data-js-cmp="${i}" ${empty?'disabled':''}>${cmpSlot===i && !empty ? '收起' : '和目前比較'}</button></div>`;
          }).join('')}</div>
          ${cmpOk ? `<div class="jsDiff"><div class="jsLabel">目前組合 比 存檔 ${SLOT_LETTERS[cmpSlot]}</div><div class="jsTotals">${stats().map(st=>{ const d = Math.ceil(Number(res.total[st]||0)) - Math.ceil(Number(cmpTotal[st]||0)); return `<div><span>${E(window.SZO_DISPLAY.label(st))}</span><b class="${d>0?'up':d<0?'down':'zero'}">${d>0?'+':''}${fmt(d)}</b></div>`; }).join('')}</div></div>` : ''}
          <div class="jsActions"><button type="button" id="jsDetail">看各降神能力明細</button><button type="button" id="jsClearAll">全部清空</button></div>
      </div>
    </section>`;
    // the card has a transform, so a fixed bar inside it would scroll away: host it on <body>
    document.querySelectorAll('body > .jsSticky').forEach(x => x.remove());
    const sticky = $('jsSticky'); if(sticky) document.body.appendChild(sticky);
    const rerender = () => { const y = window.scrollY; renderSupport(); window.scrollTo(0, y); };
    const toPicker = () => { if(window.matchMedia('(max-width:820px)').matches) document.querySelector('.jsSide')?.scrollIntoView({behavior:'smooth',block:'start'}); };
    reader.querySelectorAll('[data-js-slot]').forEach(b=>b.onclick=()=>{ activeSlot = Number(b.dataset.jsSlot); rerender(); toPicker(); });
    document.querySelectorAll('[data-js-jump]').forEach(b=>b.onclick=()=>{ activeSlot = Number(b.dataset.jsJump); rerender(); document.querySelector('.jsSide')?.scrollIntoView({behavior:'smooth',block:'start'}); });
    const place = (slot, n) => {
      const set = getCurrent(); const was = set[slot].n; set[slot].n = n;
      if(n && !was) set[slot].s = slot===0 ? 20 : 1;
      setCurrent(set); return set;
    };
    reader.querySelectorAll('[data-js-hero]').forEach(b=>b.onclick=()=>{
      const set = place(activeSlot, b.dataset.jsHero);
      // move on to the next empty slot so five picks take five taps
      if(b.dataset.jsHero){ const next = set.findIndex((p,i)=>i>activeSlot && !p.n); if(next>=0) activeSlot = next; }
      rerender();
    });
    reader.querySelectorAll('[data-js-fill]').forEach(b=>b.onclick=()=>{
      const slot = freeSlot >= 0 ? freeSlot : activeSlot;
      const set = place(slot, b.dataset.jsFill);
      const next = set.findIndex(p=>!p.n); activeSlot = next >= 0 ? next : slot;
      rerender();
    });
    reader.querySelectorAll('[data-js-series]').forEach(b=>b.onclick=()=>{ heroSeries = b.dataset.jsSeries; rerender(); });
    reader.querySelectorAll('[data-js-star]').forEach(b=>b.onclick=()=>{ const set = getCurrent(); set[activeSlot].s = Number(b.dataset.jsStar); setCurrent(set); rerender(); });
    $('jsStarAll').onclick = () => { const set = getCurrent(); set.forEach((p,i)=>{ if(i>0 && p.n) p.s = cur.s; }); setCurrent(set); rerender(); };
    const search = $('jsHeroSearch');
    search.oninput = () => { heroQuery = search.value; const pos = search.selectionStart; rerender(); const s2 = $('jsHeroSearch'); s2.focus(); try{ s2.setSelectionRange(pos,pos); }catch(e){} };
    reader.querySelectorAll('[data-js-save]').forEach(b=>b.onclick=()=>{ const i = Number(b.dataset.jsSave); const all = getSlots(); all[i] = getCurrent(); setSlots(all); rerender(); });
    reader.querySelectorAll('[data-js-load]').forEach(b=>b.onclick=()=>{ const i = Number(b.dataset.jsLoad); setCurrent(getSlots()[i]); activeSlot = 0; rerender(); });
    reader.querySelectorAll('[data-js-cmp]').forEach(b=>b.onclick=()=>{ const i = Number(b.dataset.jsCmp); cmpSlot = cmpSlot===i ? null : i; rerender(); });
    $('jsClearAll').onclick = () => { setCurrent(defaultSet()); activeSlot = 0; rerender(); };
    $('jsDetail').onclick = () => { renderSupportLegacy(); calcSupportOnce(); };
  }
  function loadSupportSlot(idx){
    const slots = getSlots();
    const plan = normalizeSet(slots[idx]);
    if(!plan.some(p=>p.n)){
      const notice = $('supportLoadNotice');
      if(notice) notice.textContent = '存檔 ' + SLOT_LETTERS[idx] + ' 目前是空白。';
      else alert('存檔 ' + SLOT_LETTERS[idx] + ' 目前是空白。');
      return;
    }
    const slotSelect = $('supportSaveSlot');
    if(slotSelect) slotSelect.value = String(idx);
    fillPlan('P', plan);
    refreshNameOptions('P');
    setCurrent(plan);
    const notice = $('supportLoadNotice');
    if(notice) notice.textContent = '已讀取存檔 ' + SLOT_LETTERS[idx] + '：' + slotSummary(plan);
  }
  function refreshSlotList(){
    const el = $('supportSlotList'); if(!el) return;
    const slots = getSlots();
    el.innerHTML = SLOT_LETTERS.map((x,i)=>{
      const isEmpty = !normalizeSet(slots[i]).some(p=>p.n);
      return `<div class="kv"><div class="k">存檔 ${x}</div><div class="v"><span>${E(slotSummary(slots[i]))}</span><button class="smallBtn" type="button" data-support-load="${i}" style="margin-left:12px" ${isEmpty?'disabled':''}>讀取</button></div></div>`;
    }).join('');
    el.querySelectorAll('[data-support-load]').forEach(btn=>{
      btn.addEventListener('click',()=>loadSupportSlot(Number(btn.dataset.supportLoad || 0)));
    });
  }
  function calcSupportOnce(){
    saveCurrent();
    const res = calcPlan(readPlan('P'));
    if(!res.picks.length){ emptyMsg('請至少選擇一位降神'); return; }
    $('reader').innerHTML = `<section class="card">${supportBackBtn()}<h1>副降神試算結果</h1>
      <div class="muted">${picksText(res)}</div>
      <h3>總能力</h3>${kvGrid(res.total)}
      <h3>成立連結</h3>${comboTextBlock(res)}
      <h3>各降神能力</h3>
      ${res.picks.map(p=>`<div class="card supportChoiceCard" style="box-shadow:none"><h2>${E(p.i===0?'主降神':'副降神 '+p.i)}｜${E(p.n)}｜${p.s} 星${p.i===0?'':'｜10%'}</h2>${kvGrid(p.a)}</div>`).join('')}
    </section>`;
    scrollTop();
  }
  let cmpPick = null;
  function renderSupportCompare(){
    const slots = getSlots();
    const filled = slots.map(s => normalizeSet(s).some(p=>p.n));
    if(!cmpPick) cmpPick = filled.slice();
    $('reader').innerHTML = `<section class="card jsPage"><h1>降神、經驗、修練試算</h1>
      ${JS_TABS('supportCompare')}
      <div class="jsLabel">點選要比較的存檔（可多選，存檔在「副降神試算」下方存入）</div>
      <div class="jsCmpPick">${SLOT_LETTERS.map((x,i)=>`<button type="button" data-cmp-pick="${i}" class="${cmpPick[i] && filled[i] ? 'active' : ''}" ${filled[i] ? '' : 'disabled'}><b>${x}</b>${filled[i] ? miniHeads(slots[i]) : '<span class="muted">空白</span>'}</button>`).join('')}</div>
      <div id="supportCompareResult"></div>
    </section>`;
    $('reader').querySelectorAll('[data-cmp-pick]').forEach(b=>b.onclick=()=>{ const i = Number(b.dataset.cmpPick); cmpPick[i] = !cmpPick[i]; renderSupportCompare(); });
    runSupportCompare();
  }
  function runSupportCompare(){
    const slots = getSlots();
    const out = $('supportCompareResult'); if(!out) return;
    const cols = SLOT_LETTERS.map((x,idx)=>({idx,label:'存檔 '+x,set:slots[idx],res:calcPlan(slots[idx])}))
      .filter(c => cmpPick && cmpPick[c.idx] && c.res.picks.length);
    if(!cols.length){ out.innerHTML='<div class="empty">還沒有可比較的存檔。先到「副降神試算」選好降神，按下方的「存入」。</div>'; return; }
    out.innerHTML = `<div class="tableWrap"><table class="compareTable jsCmpTable"><thead><tr><th>能力</th>${cols.map(c=>`<th><b>${E(c.label)}</b>${miniHeads(c.set)}</th>`).join('')}</tr></thead><tbody>
      ${stats().map(st=>{
        const vals = cols.map(c=>Math.ceil(Number(c.res.total[st] || 0)));
        const max = Math.max(...vals);
        return `<tr><td>${E(window.SZO_DISPLAY.label(st))}</td>${cols.map((c,i)=>`<td class="${cols.length>1 && max>0 && vals[i]===max ? 'supportBest' : ''}">${fmt(vals[i])}</td>`).join('')}</tr>`;
      }).join('')}
      <tr><td>成立連結</td>${cols.map(c=>`<td class="jsCmpLinks">${c.res.combos.length ? c.res.combos.map(x=>`<i title="${E(typeof comboText === 'function' ? comboText(x) : '')}">${E(x)}</i>`).join('') : '<span class="muted">無</span>'}</td>`).join('')}</tr>
    </tbody></table></div>
    <div class="muted" style="margin-top:8px">每列最高值以醒目顏色標示；滑鼠移到連結名稱可看加成。</div>`;
  }

  const REC_STAR_KEY = 'szo_jiang_recommend_stars_v1';
  const REC_SLOTS = ['主降神', '副降1', '副降2', '副降3', '副降4'];
  const REC_RATE = [1, 0.1, 0.1, 0.1, 0.1];
  const REC_METRICS = [
    {kind:'physicalStr', title:'物理職業（力）', desc:'依 力量 * 2 + 靈敏 / 2 + 物理防禦 * 0.25 排序', keys:['力量','靈敏','防禦']},
    {kind:'physicalDex', title:'物理職業（敏）', desc:'依 靈敏 * 2 + 力量 / 2 + 物理防禦 * 0.25 排序', keys:['靈敏','力量','防禦']},
    {kind:'spell', title:'術法職業', desc:'依 智慧 + 術法攻擊 + 物理防禦 * 0.25 + 術法防禦 * 0.25 排序', keys:['智慧','術攻','防禦','術防']},
    {kind:'defense', title:'防禦向', desc:'依 物理防禦 + 術法防禦 排序', keys:['防禦','術防']}
  ];

  function recommendStars(){
    const saved = readJson(REC_STAR_KEY, null);
    const fallback = [20,20,20,20,20];
    return Array.from({length:REC_SLOTS.length},(_,i)=>{
      if(i > 0 && (saved?.[i] === null || saved?.[i] === '')) return null;
      return Math.max(1,Math.min(20,Math.floor(Number(saved?.[i] ?? fallback[i]))));
    });
  }
  function saveRecommendStars(stars){ writeJson(REC_STAR_KEY, stars); }
  function readRecommendStars(){
    return Array.from({length:REC_SLOTS.length},(_,i)=>{
      const raw = $('recStar'+i)?.value;
      if(i > 0 && raw === '') return null;
      return Math.max(1,Math.min(20,Math.floor(Number(raw || 1))));
    });
  }
  function recommendStarOptions(sel=20, allowBlank=false){
    const blank = allowBlank ? `<option value="" ${sel === null ? 'selected' : ''}>空白</option>` : '';
    return blank + Array.from({length:20},(_,idx)=>{
      const i = idx + 1;
      return `<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`;
    }).join('');
  }
  const REC_DEF_WEIGHT = 0.25;
  function metricScore(total, kind){
    if(kind === 'physicalStr') return Number(total['力量'] || 0) * 2 + Number(total['靈敏'] || 0) / 2 + Number(total['防禦'] || 0) * REC_DEF_WEIGHT;
    if(kind === 'physicalDex') return Number(total['靈敏'] || 0) * 2 + Number(total['力量'] || 0) / 2 + Number(total['防禦'] || 0) * REC_DEF_WEIGHT;
    if(kind === 'spell') return Number(total['智慧'] || 0) + Number(total['術攻'] || 0) + Number(total['防禦'] || 0) * REC_DEF_WEIGHT + Number(total['術防'] || 0) * REC_DEF_WEIGHT;
    if(kind === 'defense') return Number(total['防禦'] || 0) + Number(total['術防'] || 0);
    return 0;
  }
  function recommendTotal(picks){
    let total = Object.fromEntries(stats().map(s=>[s,0]));
    picks.forEach((p,i)=>{
      total = add(total, scale(getAbility(p.n, p.s), REC_RATE[i] || 0.1));
    });
    const combos = typeof activeCombos === 'function' ? activeCombos(picks.map(p=>p.n)) : [];
    if(typeof comboBonus === 'function') total = add(total, scale(comboBonus(combos), 1));
    return {total, combos};
  }
  function emptyTotal(){
    return Object.fromEntries(stats().map(s=>[s,0]));
  }
  function abilityPart(name, star, rate){
    return scale(getAbility(name, star), rate);
  }
  function comboClusterNames(seedName, allNames){
    const valid = new Set(allNames);
    const cluster = new Set([seedName]);
    const combos = D().comboMembers || {};
    for(let round=0; round<4; round++){
      let changed = false;
      for(const members of Object.values(combos)){
        const group = (members || []).filter(n => valid.has(n));
        if(!group.some(n => cluster.has(n))) continue;
        for(const n of group){
          if(!cluster.has(n)){ cluster.add(n); changed = true; }
        }
      }
      if(!changed) break;
    }
    cluster.delete(seedName);
    return Array.from(cluster);
  }
  function candidateListForMain(mainName, kind, star, allNames){
    const ranked = allNames.map(n=>{
      const a = abilityPart(n, star, 0.1);
      return {n, a, score:metricScore(a, kind)};
    }).sort((a,b)=>b.score-a.score);
    const keep = new Map();
    ranked.slice(0, 28).forEach(c => keep.set(c.n, c));
    comboClusterNames(mainName, allNames).forEach(n => {
      if(!keep.has(n)){
        const a = abilityPart(n, star, 0.1);
        keep.set(n, {n, a, score:metricScore(a, kind)});
      }
    });
    return Array.from(keep.values()).sort((a,b)=>b.score-a.score).slice(0, 72);
  }
  function activeRecommendSupportSlots(stars){
    return [1,2,3,4].filter(i => Number(stars[i] || 0) > 0);
  }
  function buildState(mainName, supportNames, stars, supportSlots){
    const activeSlots = supportSlots || activeRecommendSupportSlots(stars);
    const picks = [{n:mainName, s:stars[0]}].concat(supportNames.map((n,i)=>({n, s:stars[activeSlots[i]] || 1})));
    const res = recommendTotal(picks);
    return {picks, total:res.total, combos:res.combos, score:0, quickScore:0};
  }
  function supportPermutations(names, supportStars){
    if(names.length < 2) return [names];
    const sameStars = new Set((supportStars || [])).size === 1;
    if(sameStars) return [names];
    const out = [];
    const used = Array(names.length).fill(false);
    const cur = [];
    function walk(){
      if(cur.length === names.length){ out.push(cur.slice()); return; }
      for(let i=0;i<names.length;i++){
        if(used[i]) continue;
        used[i] = true; cur.push(names[i]);
        walk();
        cur.pop(); used[i] = false;
      }
    }
    walk();
    return out;
  }
  function comboSeedStatesForMain(mainName, kind, stars, allNames, supportSlots){
    const supportCount = (supportSlots || []).length;
    if(supportCount <= 0) return [];
    const cluster = comboClusterNames(mainName, allNames);
    if(!cluster.length) return [];
    const ranked = cluster.map(n=>{
      const a = abilityPart(n, stars[supportSlots[0]] || 1, 0.1);
      const comboTouch = Object.values(D().comboMembers || {}).filter(m => (m || []).includes(n)).length;
      return {n, score:metricScore(a, kind) + comboTouch * 500};
    }).sort((a,b)=>b.score-a.score).slice(0, 12).map(x=>x.n);
    const fillers=allNames.filter(n=>n!==mainName && !ranked.includes(n)).sort((a,b)=>metricScore(abilityPart(b,stars[supportSlots[0]],0.1),kind)-metricScore(abilityPart(a,stars[supportSlots[0]],0.1),kind));
    const pool = ranked.length >= supportCount ? ranked : ranked.concat(fillers).slice(0, 12);
    const supportStars = supportSlots.map(i => stars[i] || 1);
    const seeds = [];
    function choose(start, picked){
      if(seeds.length >= 120) return;
      if(picked.length === supportCount){
        for(const order of supportPermutations(picked, supportStars)){
          const state = buildState(mainName, order, stars, supportSlots);
          state.score = metricScore(state.total, kind);
          state.quickScore = state.score;
          seeds.push(state);
          if(seeds.length >= 120) break;
        }
        return;
      }
      for(let i=start; i<pool.length; i++) choose(i+1, picked.concat(pool[i]));
    }
    choose(0, []);
    return seeds;
  }
  function completeComboSeeds(mainName,kind,stars,allNames,supportSlots){
    const count=supportSlots.length;
    if(!count)return [];
    const valid=new Set(allNames);
    const groups=Object.values(D().comboMembers || {}).map(m=>m.map(n=>typeof canonicalName==='function' ? canonicalName(n) : n))
      .filter(m=>m.length && m.every(n=>n && valid.has(n)))
      .map(m=>Array.from(new Set(m.filter(n=>n!==mainName))))
      .filter(m=>m.length && m.length<=count);
    // Include complete links among supports too, not just links containing the main.
    const unions=[[]],seen=new Set(['']);
    for(let i=0;i<unions.length;i++){
      for(const group of groups){
        const merged=Array.from(new Set(unions[i].concat(group))).sort();
        if(merged.length>count)continue;
        const key=merged.join('|');
        if(!seen.has(key)){seen.add(key);unions.push(merged);}
      }
    }
    const cache=supportSlots.map(slot=>new Map(allNames.filter(n=>n!==mainName).map(n=>[n,metricScore(abilityPart(n,stars[slot],0.1),kind)])));
    const ranked=cache.map(c=>Array.from(c.keys()).sort((a,b)=>c.get(b)-c.get(a)));
    const seeds=[];
    for(const required of unions){
      let states=[{order:[],remaining:required,score:0}];
      for(let slot=0;slot<count;slot++){
        const next=[];
        for(const state of states){
          const spare=count-slot-state.remaining.length;
          const options=Array.from(new Set(state.remaining.concat(spare>0 ? ranked[slot].filter(n=>!state.order.includes(n)).slice(0,count+3) : [])));
          for(const name of options){
            if(state.order.includes(name))continue;
            next.push({order:state.order.concat(name),remaining:state.remaining.filter(n=>n!==name),score:state.score+cache[slot].get(name)});
          }
        }
        // Keep the best five assignments for each used set; equivalent partial
        // assignments have identical remaining choices and possible link bonuses.
        const buckets=new Map();
        for(const state of next){
          const key=state.order.slice().sort().join('|');
          const bucket=buckets.get(key) || [];bucket.push(state);bucket.sort((a,b)=>b.score-a.score);
          buckets.set(key,bucket.slice(0,5));
        }
        states=Array.from(buckets.values()).flat();
      }
      const assignments=new Set();
      states.sort((a,b)=>b.score-a.score).filter(state=>{
        const key=state.order.map((n,i)=>`${n}:${stars[supportSlots[i]]}`).sort().join('|');
        if(assignments.has(key))return false;
        assignments.add(key);return true;
      }).slice(0,5).forEach(s=>seeds.push(buildState(mainName,s.order,stars,supportSlots)));
    }
    return seeds;
  }
  function topRecommendPlans(kind, stars, fixedMain=''){
    const allNames = names().filter(n => n && D().baseStats && D().baseStats[n]);
    const supportSlots = activeRecommendSupportSlots(stars);
    const beamLimit = 48;
    const bestByMain = [];
    for(const mainName of (fixedMain ? allNames.filter(n=>n===fixedMain) : allNames)){
      const mainAbility = abilityPart(mainName, stars[0], REC_RATE[0]);
      let states = [{picks:[{n:mainName, s:stars[0]}], total:mainAbility, quickScore:metricScore(mainAbility, kind)}];
      for(const slot of supportSlots){
        const slotCandidates = candidateListForMain(mainName, kind, stars[slot], allNames);
        const next = [];
        for(const state of states){
          const used = new Set(state.picks.map(p=>p.n));
          for(const cand of slotCandidates){
            const n = cand.n;
            if(used.has(n)) continue;
            const picks = state.picks.concat({n, s:stars[slot]});
            const total = add(state.total || emptyTotal(), cand.a);
            next.push({picks, total, quickScore:metricScore(total, kind)});
          }
        }
        next.sort((a,b)=>b.quickScore-a.quickScore);
        states = next.slice(0, beamLimit);
      }
      const finalStates = states.concat(fixedMain ? completeComboSeeds(mainName,kind,stars,allNames,supportSlots) : comboSeedStatesForMain(mainName, kind, stars, allNames, supportSlots));
      const ranked = finalStates.map(state=>{
        const res = recommendTotal(state.picks);
        return {...state, total:res.total, combos:res.combos, score:metricScore(res.total, kind)};
      }).sort((a,b)=>(fixedMain ? Number(b.combos.length>0)-Number(a.combos.length>0) : 0) || b.score-a.score);
      const seen = new Set();
      const unique = ranked.filter(plan=>{
        const key = plan.picks.map(p=>`${p.n}:${p.s}`).sort().join('|');
        if(seen.has(key)) return false;
        seen.add(key); return true;
      });
      bestByMain.push(...unique.slice(0,fixedMain ? 5 : 1));
    }
    return bestByMain.sort((a,b)=>(fixedMain ? Number(b.combos.length>0)-Number(a.combos.length>0) : 0) || b.score-a.score).slice(0,5);
  }
  function statLine(total, keys){
    return keys.map(k=>`${E(window.SZO_DISPLAY.label(k))} ${fmt(total[k] || 0)}`).join('　');
  }
  function recommendCompareTable(plans){
    if(!plans || !plans.length) return '';
    const planTitle = (plan, idx) => {
      const picks = plan.picks || [];
      const main = picks[0]?.n || '';
      const supports = picks.slice(1).map(p => p.n).filter(Boolean);
      return `${idx + 1}. ${main}${supports.length ? `(${supports.join('、')})` : ''}`;
    };
    const scoreVals = plans.map(p=>Number(p.score || 0));
    const scoreMax = Math.max(...scoreVals);
    const scoreRow = `<tr><td>推薦分數</td>${scoreVals.map(v=>`<td class="${v===scoreMax?'supportBest':''}">${fmt(v)}</td>`).join('')}</tr>`;
    const statRows = stats().map(st=>{
      const vals = plans.map(p=>Number(p.total?.[st] || 0));
      const max = Math.max(...vals);
      return `<tr><td>${E(window.SZO_DISPLAY.label(st))}</td>${vals.map(v=>`<td class="${max>0 && v===max?'supportBest':''}">${fmt(v)}</td>`).join('')}</tr>`;
    }).join('');
    return `<h3>候補數值比較</h3><div class="tableWrap"><table class="compareTable"><thead><tr><th>能力</th>${plans.map((p,i)=>`<th>${E(planTitle(p,i))}</th>`).join('')}</tr></thead><tbody>${scoreRow}${statRows}</tbody></table></div>`;
  }
  let lastRecPlans = [];
  function recommendCard(metric, plan, idx){
    return `<article class="jsRecCard">
      <div class="jsRecHead"><b>${idx + 1}. ${E(metric.title)}</b><span class="muted">分數 ${fmt(plan.score)}</span><button type="button" data-rec-apply="${idx}">套用到副降神試算</button></div>
      <div class="jsRecPicks">${plan.picks.map((p,i)=>`<div class="jsRecPick ${i===0?'main':''}"><span class="jsCardFace">${headImg(p.n,'')}<span class="jsCardStar">${p.s} 星</span></span><b>${E(p.n)}</b><small>${E(REC_SLOTS[i])}${i===0?'・100%':'・10%'}</small></div>`).join('')}</div>
      <div class="jsRecFoot"><span>${statLine(plan.total, metric.keys)}</span><span>成立連結：${plan.combos?.length ? plan.combos.map(c=>`<i>${E(c)}</i>`).join('') : '無'}</span></div>
    </article>`;
  }
  function renderRecommendResults(){
    const stars = readRecommendStars();
    saveRecommendStars(stars);
    const box = $('jiangRecommendResults');
    if(!box) return;
    const kind = $('recMetric')?.value || 'physicalStr';
    const fixedMain = $('recMain')?.value || '';
    const metric = REC_METRICS.find(m => m.kind === kind) || REC_METRICS[0];
    box.innerHTML = '<div class="notice">正在計算推薦組合...</div>';
    setTimeout(()=>{
      const plans = topRecommendPlans(metric.kind, stars, fixedMain);
      lastRecPlans = plans;
      box.innerHTML = plans.length ? `<h2 class="jsRecTitle">${E(metric.title)}<small>${E(metric.desc)}，列出前 ${plans.length} 個候補</small></h2>
        ${plans.map((p,i)=>recommendCard(metric,p,i)).join('')}
        <details class="jsRecTable"><summary>展開候補數值比較表</summary>${recommendCompareTable(plans)}</details>` : '<div class="empty">沒有可用的降神資料。</div>';
      box.querySelectorAll('[data-rec-apply]').forEach(b=>b.onclick=()=>{
        const plan = lastRecPlans[Number(b.dataset.recApply)]; if(!plan) return;
        setCurrent(plan.picks.map(p=>({n:p.n, s:p.s})));
        activeSlot = 0; window.setJiang('support');
      });
    }, 20);
  }
  function renderRecommend(){
    const reader = $('reader'); if(!reader) return;
    const stars = recommendStars();
    reader.innerHTML = `<section class="card jsPage"><h1>降神、經驗、修練試算</h1>
      ${JS_TABS('recommend')}
      <div class="muted" style="margin-bottom:10px">設定主降神與 4 個副降神的星等，依物理、術法、防禦方向推薦前 5 個組合；副降神以 10% 計入，並含成立連結的加成。</div>
      <div class="jsRecForm">
        <label><span>主降神</span><select id="recMain" data-hero-search><option value="">自動推薦主降神</option>${names().map(n=>`<option value="${E(n)}">${E(n)}</option>`).join('')}</select></label>
        <label><span>推薦方向</span><select id="recMetric">${REC_METRICS.map(m=>`<option value="${E(m.kind)}">${E(m.title)}</option>`).join('')}</select></label>
        ${REC_SLOTS.map((label,i)=>`<label><span>${E(label)}星等</span><select id="recStar${i}">${recommendStarOptions(stars[i], i > 0)}</select></label>`).join('')}
      </div>
      <div class="jsActions"><button id="runJiangRecommend" type="button" class="jsPrimary">產生推薦方案</button></div>
      <div id="jiangRecommendResults"><div class="empty">設定好星等與推薦方向後，按「產生推薦方案」。</div></div>
    </section>`;
    $('runJiangRecommend').onclick = renderRecommendResults;
  }

  window.renderSupportSlotsPage = function(){ renderSupport(); closeMenu(); scrollTop(); };
  window.renderSupportComparePage = function(){ renderSupportCompare(); closeMenu(); scrollTop(); };
  window.renderJiangRecommendPage = function(){ renderRecommend(); closeMenu(); scrollTop(); };
  const oldSetJiang = window.setJiang;
  window.setJiang = function(kind){
    if(kind === 'support'){ window.renderSupportSlotsPage(); return; }
    if(kind === 'recommend'){ window.renderJiangRecommendPage(); return; }
    if(kind === 'supportCompare'){ window.renderSupportComparePage(); return; }
    if(typeof oldSetJiang === 'function') return oldSetJiang(kind);
  };
})();

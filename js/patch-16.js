(function(){
 const $=id=>document.getElementById(id);
 const fmt=n=>{try{return Number(n||0).toLocaleString('zh-Hant')}catch(e){return String(n??'')}};
 const fmtBig=b=>{try{return BigInt(b).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')}catch(e){return String(b??'')}};
 const num=(id,d=0)=>{const v=Number($(id)?.value??d);return Number.isFinite(v)?v:d};
 const expAt=lv=>{try{return BigInt((window.DATA&&DATA.expTable&&DATA.expTable[String(lv)])||0)}catch(e){return 0n}};
 const maxLv=()=>{try{return Math.max(...Object.keys(DATA.expTable||{}).map(Number).filter(Number.isFinite))}catch(e){return 2000}};
 const starCost=(a,b)=>{let t=0;for(let s=Math.max(0,a);s<Math.min(20,b);s++)t+=s+1;return t};
 const auraCost=(a,b)=>{let t=0;for(let lv=Math.max(1,a);lv<Math.max(a,b);lv++)t+=lv;return t};
 const starOpts=sel=>Array.from({length:21},(_,i)=>`<option value="${i}" ${i===sel?'selected':''}>${i} 星</option>`).join('');
 const oldSetJiang=window.setJiang;
 window.setJiang=function(kind){
  if(kind==='starAura'){
   const r=$('reader'); if(!r)return;
   r.innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>星等 / 靈氣計算</h2>
   <div class="calcTabs"><button class="calcTab active" type="button" data-star-tab="star">星等計算</button><button class="calcTab" type="button" data-star-tab="aura">靈氣計算</button></div>
   <div id="starTabNeed"><h3>星等：需要的降神數量</h3><div class="kvGrid">
   <div class="kv"><div class="k">目前星等</div><div class="v"><select id="needCur">${starOpts(0)}</select></div></div>
   <div class="kv"><div class="k">目標星等</div><div class="v"><select id="needTar">${starOpts(20)}</select></div></div>
   <div class="kv"><div class="k">已有降神魂數量</div><div class="v"><input id="needOwned" type="number" value="0"></div></div>
   <div class="kv"><div class="k">降神倍率</div><div class="v"><input id="needRate" type="number" value="1" step="0.1"></div></div>
   </div><div class="quick"><button id="calcNeeds" type="button">計算星等<small>計算升星還需要的降神魂數量</small></button></div><div id="starNeedResult"></div></div>
   <div id="starTabAura" style="display:none"><h3>靈氣：所需靈氣</h3><div class="kvGrid">
   <div class="kv"><div class="k">目前等級</div><div class="v"><input id="auraCur" type="number" value="1"></div></div>
   <div class="kv"><div class="k">目標等級</div><div class="v"><input id="auraTar" type="number" value="20"></div></div>
   </div><div class="quick"><button id="calcStarAura" type="button">計算靈氣<small>計算升級所需靈氣</small></button></div><div id="auraNeedResult"></div></div></section>`;
   if(typeof closeDrawer==='function')closeDrawer(); window.scrollTo({top:0,behavior:'smooth'}); return;
  }
  if(kind==='expPill'){
   const r=$('reader'); if(!r)return;
   r.innerHTML=`<section class="card"><h1>降神、經驗、修練試算</h1><h2>等級 / 經驗丹</h2>
   <div class="calcTabs"><button class="calcTab active" type="button" data-exp-tab="need">等級經驗</button><button class="calcTab" type="button" data-exp-tab="eat">經驗丹升等</button></div>
   <div id="expTabNeed"><h3>等級：需要的經驗值</h3><div class="kvGrid">
   <div class="kv"><div class="k">現在等級</div><div class="v"><input id="expCur" type="number" value="1"></div></div>
   <div class="kv"><div class="k">目標等級</div><div class="v"><input id="expTar" type="number" value="2000"></div></div>
   </div><div class="quick"><button id="calcExpNeed" type="button">計算需要經驗<small>換算乙太、聖鑽、真元顆數</small></button></div><div id="expNeedResult"></div></div>
   <div id="expTabEat" style="display:none"><h3>經驗丹：吃丹可提升到幾等</h3><div class="kvGrid">
   <div class="kv"><div class="k">現在等級</div><div class="v"><input id="eatStartLv" type="number" value="1"></div></div>
   <div class="kv"><div class="k">經驗丹單位（億）</div><div class="v"><input id="eatUnitYi" type="number" value="100"></div></div>
   <div class="kv"><div class="k">經驗丹數量</div><div class="v"><input id="eatCount" type="number" value="1"></div></div>
   </div><div class="quick"><button id="calcEatPill" type="button">計算升等<small>例如單位填 100 代表 100 億</small></button></div><div id="eatPillResult"></div></div></section>`;
   if(typeof closeDrawer==='function')closeDrawer(); window.scrollTo({top:0,behavior:'smooth'}); return;
  }
  if(typeof oldSetJiang==='function')return oldSetJiang(kind);
 };
 window.calcNeeds=function(){const cur=Math.max(0,Math.min(20,Math.floor(num('needCur',0)))),tar=Math.max(0,Math.min(20,Math.floor(num('needTar',20)))),owned=Math.max(0,Math.floor(num('needOwned',0))),rate=Math.max(.0001,num('needRate',1));const raw=tar>cur?starCost(cur,tar):0,after=Math.max(0,raw-owned),need=Math.ceil(after/rate);const b=$('starNeedResult');if(b)b.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">星等區間</div><div class="v">${cur} 星 → ${tar} 星</div></div><div class="kv"><div class="k">原始需求</div><div class="v">${fmt(raw)}</div></div><div class="kv"><div class="k">扣除已有後</div><div class="v">${fmt(after)}</div></div><div class="kv"><div class="k">倍率後還需</div><div class="v">${fmt(need)}</div></div></div>`};
 window.calcStarAura=function(){const cur=Math.max(1,Math.floor(num('auraCur',1))),tar=Math.max(cur,Math.floor(num('auraTar',cur)));const total=auraCost(cur,tar);const b=$('auraNeedResult');if(b)b.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">等級區間</div><div class="v">${cur} → ${tar}</div></div><div class="kv"><div class="k">預估靈氣</div><div class="v">${fmt(total)}</div></div></div>`};
 window.calcExpNeed=function(){const ml=maxLv(),cur=Math.max(1,Math.min(ml,Math.floor(num('expCur',1)))),tar=Math.max(cur,Math.min(ml,Math.floor(num('expTar',ml))));const need=expAt(tar)-expAt(cur),yi=need/100000000n,ether=need/(8000n*100000000n)+(need%(8000n*100000000n)?1n:0n),diamond=need/(3000n*100000000n)+(need%(3000n*100000000n)?1n:0n),zhen=need/(500n*100000000n)+(need%(500n*100000000n)?1n:0n);const b=$('expNeedResult');if(b)b.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">等級區間</div><div class="v">${cur} → ${tar}</div></div><div class="kv"><div class="k">需要經驗</div><div class="v">${fmtBig(need)}</div></div><div class="kv"><div class="k">約幾億</div><div class="v">${fmtBig(yi)} 億</div></div><div class="kv"><div class="k">乙太 8000億</div><div class="v">${fmtBig(ether)} 顆</div></div><div class="kv"><div class="k">鑽石 3000億</div><div class="v">${fmtBig(diamond)} 顆</div></div><div class="kv"><div class="k">真元 500億</div><div class="v">${fmtBig(zhen)} 顆</div></div></div>`};
 window.calcEatPill=function(){const ml=maxLv(),start=Math.max(1,Math.min(ml,Math.floor(num('eatStartLv',1))));const gain=BigInt(Math.max(0,Math.floor(num('eatUnitYi',100))))*100000000n*BigInt(Math.max(0,Math.floor(num('eatCount',1))));const total=expAt(start)+gain;let lv=start;for(let i=start;i<=ml;i++){if(expAt(i)<=total)lv=i;else break}const remain=lv<ml?expAt(lv+1)-total:0n;const b=$('eatPillResult');if(b)b.innerHTML=`<div class="kvGrid" style="margin-top:12px"><div class="kv"><div class="k">吃丹經驗</div><div class="v">${fmtBig(gain)}</div></div><div class="kv"><div class="k">可到等級</div><div class="v">${lv}</div></div><div class="kv"><div class="k">下一級還差</div><div class="v">${fmtBig(remain)}</div></div></div>`};
 document.addEventListener('click',function(e){const st=e.target.closest('[data-star-tab]');if(st){e.preventDefault();e.stopPropagation();document.querySelectorAll('[data-star-tab]').forEach(b=>b.classList.remove('active'));st.classList.add('active');const a=$('starTabNeed'),b=$('starTabAura');if(a)a.style.display=st.dataset.starTab==='star'?'block':'none';if(b)b.style.display=st.dataset.starTab==='aura'?'block':'none';return}const et=e.target.closest('[data-exp-tab]');if(et){e.preventDefault();e.stopPropagation();document.querySelectorAll('[data-exp-tab]').forEach(b=>b.classList.remove('active'));et.classList.add('active');const a=$('expTabNeed'),b=$('expTabEat');if(a)a.style.display=et.dataset.expTab==='need'?'block':'none';if(b)b.style.display=et.dataset.expTab==='eat'?'block':'none';return}if(e.target&&['calcNeeds','calcStarAura','calcExpNeed','calcEatPill'].includes(e.target.id)){e.preventDefault();e.stopPropagation();window[e.target.id]();return}},true);
})();

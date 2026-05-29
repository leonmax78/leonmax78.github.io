// V227: pure jiangshen calculation helpers.
// Page rendering stays in app-core.js for now; formulas and shared constants live here.

function compactWan(n){
 n=Math.max(0,Math.round(Number(n)||0));
 if(n>=10000){
  let v=n/10000;
  return (Math.round(v*10)/10).toString().replace(/\.0$/,'')+'萬';
 }
 return String(n);
}

function breakSuggestText(def){
 const d=Number(def)||0;
 if(!d)return '';
 const r=64893/87946;
 const s=d/(2+r/2),x=s*r;
 const ar=38612/60583;
 const ax=d/(2+ar/2),as=ax*ar;
 return compactWan(s)+'力 / '+compactWan(x)+'敏；暗器約 '+compactWan(as)+'力 / '+compactWan(ax)+'敏';
}

const STATS=DATA.stats;
const DISPLAY_NAMES=DATA.displayNames;
const EXP_ITEMS={
 '乙太 8000億':8000n*100000000n,
 '鑽石 3000億':3000n*100000000n,
 '真元 500億':500n*100000000n
};

function canonicalName(n){
 n=String(n??'').trim();
 if(!n||n==='空格')return null;
 if(DATA.aliases[n])return DATA.aliases[n];
 if(DATA.baseStats[n])return n;
 return null;
}

function ability(n,star){
 const c=canonicalName(n);
 if(!c)throw new Error('找不到降神：'+n);
 const base=DATA.baseStats[c],out={};
 for(const st of STATS)out[st]=Number(base[st]||0)*Number(DATA.starMultipliers[st][star]||1);
 return out;
}

function scaleAbility(src,rate=1){
 const out={};
 for(const st of STATS)out[st]=Number(src[st]||0)*rate;
 return out;
}

function activeCombos(names){
 const set=new Set(names.map(canonicalName).filter(Boolean)),res=[];
 for(const [combo,members] of Object.entries(DATA.comboMembers)){
  const need=members.map(canonicalName).filter(Boolean);
  if(need.length&&need.every(x=>set.has(x)))res.push(combo);
 }
 return res;
}

function comboBonus(combos){
 const total=Object.fromEntries(STATS.map(s=>[s,0]));
 for(const c of combos){
  const b=DATA.comboBonuses[c]||{};
  for(const st of STATS)total[st]+=Number(b[st]||0);
 }
 return total;
}

function comboText(c){
 const b=DATA.comboBonuses[c]||{},parts=[];
 for(const st of STATS){
  if(b[st])parts.push(`${st}+${fmt(b[st])}`);
 }
 return parts.join('、')||'無';
}

window.SZO_JIANGSHEN_CALC={
 compactWan,
 breakSuggestText,
 STATS,
 DISPLAY_NAMES,
 EXP_ITEMS,
 canonicalName,
 ability,
 scaleAbility,
 activeCombos,
 comboBonus,
 comboText
};

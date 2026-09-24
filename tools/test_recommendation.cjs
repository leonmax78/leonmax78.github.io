const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({window:{},document:{querySelectorAll:()=>[],getElementById:()=>({})},MutationObserver:class{observe(){}},setTimeout});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const name of ['base-data','combo-data','star-multipliers-data'])vm.runInContext(read(`js/data/jiangshen/${name}.js`),ctx);
vm.runInContext('const DATA=window.SZO_JIANGSHEN_DATA_PARTS;',ctx);
vm.runInContext(read('js/calc/jiangshen-calc.js'),ctx);
vm.runInContext(read('js/features/jiangshen/support-slots-compare.js').replace('  const oldSetJiang =', '  window.testRec={topRecommendPlans,recommendTotal,metricScore};\n  const oldSetJiang ='),ctx);
const results=vm.runInContext(`(()=>{
 const api=window.testRec;
 const a=['孟祈','鐵心蘭','燕南天','魔黃','楊鐵'].map((n,i)=>({n,s:i?10:20}));
 const b=['孟祈','江小魚','燕南天','花無缺','楊鐵'].map((n,i)=>({n,s:i?10:20}));
 const before=api.recommendTotal(a),after=api.recommendTotal(b);
 const full=api.topRecommendPlans('physicalStr',[20,10,10,10,10],'孟祈');
 const original=DATA.displayNames;
 DATA.displayNames=['孟祈','鐵心蘭','燕南天','魔黃','楊鐵','江小魚','花無缺','雪兒','無雙'];
 const checks=[];
 for(const stars of [[20,10,10,10,10],[12,1,5,10,20],[20,10,null,15,null]]){
  for(const kind of ['physicalStr','physicalDex','spell','defense']){
   const slots=stars.slice(1).filter(s=>s!==null),plans=[];
   function walk(picks){
    if(picks.length===slots.length+1){const result=api.recommendTotal(picks);plans.push({...result,picks,score:api.metricScore(result.total,kind)});return;}
    for(const n of DATA.displayNames){if(!picks.some(p=>p.n===n))walk(picks.concat({n,s:slots[picks.length-1]}));}
   }
   walk([{n:'孟祈',s:stars[0]}]);
   plans.sort((a,b)=>Number(b.combos.length>0)-Number(a.combos.length>0)||b.score-a.score);
   const seen=new Set();
   const expected=plans.filter(p=>{const key=p.picks.map(x=>x.n+':'+x.s).sort().join('|');if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
   const actual=api.topRecommendPlans(kind,stars,'孟祈');
   checks.push({kind,stars,expected:expected.map(p=>p.score),actual:actual.map(p=>p.score)});
  }
 }
 DATA.displayNames=original;
 return {before,after,full,checks};
})()`,ctx);
assert.equal(results.before.total['血量'],154380);
assert.equal(results.after.total['血量'],171053);
assert.equal(results.after.total['力量'],12005);
assert.equal(results.after.total['防禦'],24797);
assert(results.full[0].score>=36190.75);
assert(results.full[0].combos.includes('如親似故'));
for(const c of results.checks)assert.deepStrictEqual(Array.from(c.actual),Array.from(c.expected),JSON.stringify(c));
console.log('PASS screenshot totals, support-only links, top-five exhaustive oracle for 12 metric/star cases');

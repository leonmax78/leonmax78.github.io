const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/compound.json'),'utf8'));
const items=JSON.parse(fs.readFileSync(path.join(root,'data/items.json'),'utf8'));
const steps=new Map(rows.filter(r=>!r.Item).map(r=>[r.ID,r]));
const byId={},seen=new Set();
for(const recipe of rows.filter(r=>r.Item)){
 const signature=JSON.stringify(Object.fromEntries(Object.entries(recipe).filter(([key])=>key!=='ID').sort(([a],[b])=>a.localeCompare(b))));
 if(seen.has(signature))continue;
 seen.add(signature);
 const flow={id:recipe.ID,name:recipe.Name,input:recipe.Input||null,output:recipe.Output||null,count:recipe.Count?Number(recipe.Count):null,steps:[]};
 for(const key of Object.keys(recipe).filter(k=>/^Step\d+$/.test(k)).sort((a,b)=>Number(a.slice(4))-Number(b.slice(4)))){
  const source=steps.get(recipe[key]);assert(source,'Missing step '+recipe[key]);
  const materials=Object.keys(source).filter(k=>/^InputItem\d+$/.test(k)).sort((a,b)=>Number(a.slice(9))-Number(b.slice(9))).map(k=>{
   const qty=Number(source['InputNum'+k.slice(9)]);assert(Number.isFinite(qty)&&qty>0,'Invalid quantity '+source.ID);
   return {id:source[k],qty};
  });
  flow.steps.push({slot:Number(key.slice(4)),id:source.ID,materials});
 }
 (byId[recipe.Item]??=[]).push(flow);
}
for(const item of items.filter(i=>i.Type==='PRESCRIPTION'))assert(byId[item.ID],'Missing recipe '+item.ID);
fs.writeFileSync(path.join(root,'data/recipe-flows.js'),'window.SZO_RECIPE_FLOWS='+JSON.stringify(byId)+';\n');
console.log('Indexed '+Object.keys(byId).length+' recipe items with '+Object.values(byId).flat().length+' flows.');

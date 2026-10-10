const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
const items=read('items'),magic=new Map(read('magic').map(x=>[x.ID,x])),status=new Map(read('status').map(x=>[x.ID,x]));
const fields={All:'全屬性',Str:'力量',Dex:'靈敏',Con:'體魄',Int:'智慧',HP:'最大生命',MP:'最大精力',ExtraDef:'物理防禦',MagicDef:'術法防禦',MagicAttack:'術法攻擊',Experience:'經驗值',Drop:'掉寶率'};
const byId={},audit=[],specialById={},experienceById={};
for(const item of items){
 if(!['POTION','MAGIC_FIGURE','TALISMAN','MATERIAL'].includes(item.Type)||!/(經驗丹|真驗丹)$/.test(item.Name||''))continue;
 const match=(item.Help||'').match(/([\d,.億萬\s]+)\s*(?:點|的)經驗/);
 const label=match?.[1].replace(/[\s,]/g,'')||'';
 const parts=Array.from(label.matchAll(/(\d+(?:\.\d+)?)(億|萬)?/g));
 const value=label&&parts.map(p=>p[0]).join('')===label?parts.reduce((sum,p)=>sum+Number(p[1])*({億:1e8,萬:1e4}[p[2]]||1),0):null;
 experienceById[item.ID]={value:value>0?value:null,label:value>0?label:'',source:value>0?'ITEM.Help':'unconfirmed'};
}
for(const item of items){
 const entries=[],spell=magic.get(item.Magic);
 for(const raw of [item,...(spell?.Target==='TARGET_SELF'?[spell]:[])]){
  const removal=String(raw.StatusParam).split(',').includes('EFFECT_REMOVE');
  for(const id of String(raw.ExtraStatus||'').split(/[,;\s]+/)){
   const s=status.get(id);if(!s)continue;
   const key=(removal?'remove:':'give:')+id;
   if(!entries.some(e=>e.key===key))entries.push({key,label:(removal?'解除':'')+s.Name,...(!removal&&s.Group==='28'&&s.Param1!==undefined&&Number.isFinite(Number(s.Param1))?{magicDamageBonus:Number(s.Param1)}:{})});
  }
 }
 if(entries.length)specialById[item.ID]=entries;
}
for(const item of items){
 if(!['POTION','MAGIC_FIGURE','TALISMAN','MATERIAL'].includes(item.Type)||!String(item.Flag).split(',').includes('ITEM_USE'))continue;
 const sources=[{raw:item,source:'ITEM:'+item.ID}];
 const spell=magic.get(item.Magic);
 if(spell?.Target==='TARGET_SELF')sources.push({raw:spell,source:'MAGIC:'+spell.ID});
 const effects=[];
 for(const {raw,source} of sources){
  if(String(raw.StatusParam).split(',').includes('EFFECT_REMOVE'))continue;
  const values=[];
  for(const key of Object.keys(fields).filter(k=>!['All','Experience','Drop'].includes(k))){
   const value=Number(raw[key]),flag=raw[key+'Flag']||'';
   if(!Number.isFinite(value)||value<=0)continue;
   if(['HP','MP'].includes(key)&&['AFFECT_NUMBER','AFFECT_RATIO'].includes(flag)){
    values.push({key:'Restore'+key,value,unit:flag==='AFFECT_RATIO'?'percent':'number',seconds:Number(raw.Time)||0,source});continue;
   }
   if(['HP','MP'].includes(key)&&!['AFFECT_MAX_NUMBER','AFFECT_MAX_RATIO'].includes(flag))continue;
   if(['Con','Str','Int','Dex'].includes(key)&&!['AFFECT_NUMBER','AFFECT_RATIO'].includes(flag))continue;
   values.push({key,value,unit:flag.includes('RATIO')?'percent':'number',seconds:Number(raw.Time)||0,source});
  }
  // All attributes must be present in the same effect; unequal bonuses retain their range.
  const four=['Con','Str','Int','Dex'].map(k=>values.find(e=>e.key===k));
  if(four.every(Boolean)&&new Set(four.map(e=>e.unit)).size===1)values.unshift({...four[0],key:'All',value:Math.min(...four.map(e=>e.value)),max:Math.max(...four.map(e=>e.value))});
  for(const id of String(raw.ExtraStatus||'').split(/[,;\s]+/)){
   const s=status.get(id),key={'25':'Experience','21':'Drop'}[s?.Group],value=Number(s?.Param1);
   if(key&&value>1&&String(raw.StatusParam).split(',').includes('EFFECT_GIVE'))values.push({key,value,unit:'multiplier',seconds:Number(raw.Time)||0,source:source+' / STATUS:'+id});
  }
  for(const effect of values)if(!effects.some(e=>e.key===effect.key&&e.unit===effect.unit&&e.value===effect.value&&e.seconds===effect.seconds))effects.push(effect);
 }
 if(effects.length){byId[item.ID]=effects;audit.push({id:item.ID,name:item.Name,type:item.Type,effects});}
}
fs.writeFileSync(path.join(root,'data/item-buffs.js'),'window.SZO_ITEM_BUFFS='+JSON.stringify({fields,byId,specialById,experienceById})+';\n');
fs.writeFileSync(path.join(root,'reports/item-experience-audit.json'),JSON.stringify(items.filter(i=>experienceById[i.ID]).map(i=>({id:i.ID,name:i.Name,...experienceById[i.ID]})),null,2)+'\n');
fs.writeFileSync(path.join(root,'reports/item-buffs-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(`Indexed ${audit.length} usable buff items.`);

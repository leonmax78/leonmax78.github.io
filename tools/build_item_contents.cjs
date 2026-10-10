const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const items=JSON.parse(fs.readFileSync(path.join(root,'data/items.json'),'utf8'));
const monsters=new Map(JSON.parse(fs.readFileSync(path.join(root,'data/monsters.json'),'utf8')).map(m=>[String(m.ID),m]));
const byId={},unconfirmed=[];
for(const item of items){
 if(item.Type!=='BONUS')continue;
 const source=monsters.get(String(item.Magic));
 if(!source?.DropItem)continue;
 const fields=source.DropItem.split(',').map(s=>s.trim());
 while(fields.at(-1)==='')fields.pop();
 if((fields.length-2)%2!==0||Number(fields[1])!==(fields.length-2)/2){unconfirmed.push(item.ID);continue;}
 const ids=[],weights={};let total=0;
 for(let i=2;i<fields.length;i+=2){
  const weight=Number(fields[i+1]);
  if(!Number.isFinite(weight)||weight<=0)continue;
  total+=weight;
  if(fields[i]!=='0'){
   if(!ids.includes(fields[i]))ids.push(fields[i]);
   weights[fields[i]]=(weights[fields[i]]||0)+weight;
  }
 }
 if(ids.length)byId[item.ID]={sourceId:source.ID,ids,rates:Object.fromEntries(ids.map(id=>[id,weights[id]/total*100]))};
}
fs.writeFileSync(path.join(root,'data/item-contents.js'),'window.SZO_ITEM_CONTENTS='+JSON.stringify(byId)+';\n');
console.log('Indexed contents for '+Object.keys(byId).length+' containers.');
console.log('Unconfirmed count/structure: '+unconfirmed.join(', '));

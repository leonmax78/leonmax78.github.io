const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/data/status-descriptions.js'),'utf8'),context);
const items=JSON.parse(fs.readFileSync(path.join(root,'data/items.json'),'utf8'));
const statuses=JSON.parse(fs.readFileSync(path.join(root,'data/status.json'),'utf8'));
const index=new Map(statuses.map(s=>[s.ID,s])),refs=new Map();
for(const item of items)for(const raw of new Set(String(item.ExtraStatus||'').split(/[,\s;]+/).filter(Boolean))){
 const id=String(Number(raw));if(id==='0')continue;
 if(!refs.has(id))refs.set(id,[]);refs.get(id).push(item);
}
const lines=['# 道具特殊能力盤點','',
 '來源：2026-10-08 STATUS.INI 與目前 ITEM 資料。使用者提供的 STATUS.INI 與網站 raw/STATUS.INI SHA-256 相同。',
 '依 ID 對照，不以同名狀態合併。EFFECT_REMOVE 優先顯示解除狀態。Group / Order 不解讀成機率或持續時間。',
 'Group 6 數值依使用者勇猛截圖校驗；反傷、經驗、掉寶、覺醒倍率依道具原文與參數交叉推導。其他無法核實的單位不推測。',
 'STATUS 143 / 144 與道具原文有 80 / 60 衝突；169 的 Param1=9 不能直接當成 9%，道具原文明寫 10%。',
 '',`共 ${refs.size} 個狀態 ID，${items.filter(i=>i.ExtraStatus&&i.ExtraStatus!=='0').length} 筆道具引用。`,''];
for(const [id,used] of [...refs].sort((a,b)=>Number(a[0])-Number(b[0]))){
 const s=index.get(id);lines.push(`## ${id} ${s?.Name||'未找到'}`,`Group=${s?.Group??'未填'}；Param1=${s?.Param1??'未填'}；Param2=${s?.Param2??'未填'}；${used.length} 筆道具`,'');
 for(const mode of new Set(used.map(i=>i.StatusParam||''))){
  const example=used.find(i=>(i.StatusParam||'')===mode),r=context.window.SZO_STATUS_DESCRIPTIONS.describe(s,example);
  lines.push(`- ${mode||'未填作用方式'} [${r.basis}]：${r.lines.join('；')}`);
 }
 lines.push('',...used.map(i=>`- ${i.ID} ${i.Name}：${i.Help||'無道具說明'}`),'');
}
fs.writeFileSync(path.join(root,'reports/item-status-analysis-20261008.md'),lines.join('\n')+'\n');
const entries=[...refs].sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,used])=>{
 const raw=index.get(id)||{ID:id},draft=context.window.SZO_STATUS_DESCRIPTIONS.describe(raw);
 return {id,name:raw.Name||'未找到',raw,description:draft.lines.join('\n'),basis:draft.basis,items:used.map(i=>({id:i.ID,name:i.Name,mode:i.StatusParam||'',probability:i.StatusProb||'',help:i.Help||''}))};
});
fs.writeFileSync(path.join(root,'planning/status-review.json'),JSON.stringify({schemaVersion:1,sourceVersion:'V577',entries},null,2)+'\n');
console.log(`Audited ${refs.size} statuses; report written.`);

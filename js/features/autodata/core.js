/* Adapted from the user's offline editor V10: Big5 names, paired arrays and
 * prefix/suffix export are retained. No game files are uploaded by this module. */
(function(root){
 'use strict';
 const MAX=251, decoder=new TextDecoder('big5',{fatal:true});
 const rd=(a,p)=>new DataView(a.buffer,a.byteOffset,a.byteLength).getUint32(p,true);
 const wr=(a,p,v)=>new DataView(a.buffer,a.byteOffset,a.byteLength).setUint32(p,v,true);
 const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 let mapping;
 function encode(name){
  if(!mapping){mapping=new Map();for(let i=0;i<128;i++)mapping.set(String.fromCharCode(i),[i]);
   for(let hi=0x81;hi<=0xfe;hi++)for(let lo=0x40;lo<=0xfe;lo++){
    if(lo>0x7e&&lo<0xa1)continue;
    try{const s=decoder.decode(Uint8Array.of(hi,lo));if([...s].length===1&&!mapping.has(s))mapping.set(s,[hi,lo]);}catch(_error){}
   }
  }
  const out=[];for(const c of name){if(!mapping.has(c))throw Error('名稱無法使用 Big5 編碼：'+c);out.push(...mapping.get(c));}
  return Uint8Array.from(out);
 }
 // V10's list decoder, extended to zero entries. Bounds and marker checks are mandatory.
 function parseAt(bytes,start){
  const count=rd(bytes,start);if(count>MAX)throw Error('道具超過 251 筆');
  let pos=start+4;const arr=[];
  for(let i=0;i<count;i++){
   const n=rd(bytes,pos);
   if(n<1||n>512||pos+5+n>bytes.length||bytes[pos+4+n]!==0)throw Error('道具名稱結構異常');
   const raw=bytes.slice(pos+4,pos+4+n),name=decoder.decode(raw);
   if(!name.trim()||/[\u0000-\u001f]/.test(name))throw Error('名稱無法解碼');
   arr.push({name,raw,state:0});pos+=5+n;
  }
  if(pos+9+count*4>bytes.length||rd(bytes,pos)!==19||bytes[pos+4]!==4||rd(bytes,pos+5)!==count)throw Error('物品狀態陣列不符');
  const bridge=bytes.slice(pos,pos+5),statusStart=pos+9;
  arr.forEach((r,i)=>{r.state=rd(bytes,statusStart+i*4);if(![0,1,2].includes(r.state))throw Error('未知處理狀態');});
  return {arr,prefix:bytes.slice(0,start),bridge,suffix:bytes.slice(statusStart+count*4),start};
 }
 function parse(input){
  const bytes=new Uint8Array(input);
  if(bytes.length<1038||bytes.length>2*1024*1024||rd(bytes,0)!==1||bytes[4]!==8||bytes[5]!==8)throw Error('不支援的存檔結構，請選擇角色 _3.data；不會覆寫此檔案');
  // Validate the complete keyed tail, not a name/count pattern somewhere inside an _0 file.
  let p=1038,names=null,states=null;const keys=new Set();
  while(p<bytes.length){
   if(p+5>bytes.length)throw Error('設定欄位不完整');
   const key=rd(bytes,p),type=bytes[p+4];
   if(!key||key>4096||keys.has(key))throw Error('設定欄位重複或未知');keys.add(key);
   if(key===18){if(type!==6)throw Error('物品欄位類型不符');names=p+5;}
   if(key===19){if(type!==4)throw Error('狀態欄位類型不符');states=p+5;}
   p+=5;
   if(type===1)p+=4;
   else if(type===2){if(bytes[p]>1)throw Error('開關欄位格式不符');p++;}
   else if(type===4){const n=rd(bytes,p);if(n>10000)throw Error('設定陣列過長');p+=4+n*4;}
   else if(type===6){const n=rd(bytes,p);if(n>10000)throw Error('設定陣列過長');p+=4;for(let i=0;i<n;i++){const len=rd(bytes,p);if(len>65536||p+5+len>bytes.length||bytes[p+4+len]!==0)throw Error('字串欄位損壞');p+=5+len;}}
   else throw Error('尚未支援的設定欄位類型：'+type);
   if(p>bytes.length)throw Error('檔案已截斷');
  }
  if((names===null)!==(states===null))throw Error('物品清單與狀態欄位不成對');
  let meta;
  if(names!==null)meta=parseAt(bytes,names);
  else{
   // V10 omitted-list variants. Insert ONLY fields 18/19, never synthesize other settings.
   const prefix=new Uint8Array(bytes.length+5);prefix.set(bytes);prefix.set([18,0,0,0,6],bytes.length);
   meta={arr:[],prefix,bridge:Uint8Array.of(19,0,0,0,4),suffix:new Uint8Array(),start:prefix.length,omitted:true};
  }
  meta.source=bytes;meta.original=meta.arr.map(r=>({...r,raw:r.raw.slice()}));return meta;
 }
 function serialize(meta,rows){
  if(rows.length>MAX)throw Error('清單不能超過 251 筆');
  rows=rows.map(r=>{const raw=r.raw?new Uint8Array(r.raw):encode(r.name);if(![0,1,2].includes(r.state)||!raw.length||raw.length>512||decoder.decode(raw)!==r.name)throw Error('道具名稱或處理狀態不正確');return {...r,raw};});
  if(rows.length===meta.original.length&&rows.every((r,i)=>r.state===meta.original[i].state&&equal(r.raw,meta.original[i].raw)))return meta.source.slice();
  const n=meta.prefix.length+4+rows.reduce((s,r)=>s+5+r.raw.length,0)+5+4+rows.length*4+meta.suffix.length;
  const out=new Uint8Array(n);let p=meta.prefix.length;out.set(meta.prefix);wr(out,p,rows.length);p+=4;
  for(const r of rows){wr(out,p,r.raw.length);p+=4;out.set(r.raw,p);p+=r.raw.length;out[p++]=0;}
  out.set(meta.bridge,p);p+=5;wr(out,p,rows.length);p+=4;for(const r of rows){wr(out,p,r.state);p+=4;}out.set(meta.suffix,p);
  const check=parse(out);
  if(!equal(check.prefix,meta.prefix)||!equal(check.suffix,meta.suffix)||check.arr.length!==rows.length)throw Error('輸出驗證失敗');
  return out;
 }
 const ACTIONS=['保存','丟棄','賣出'];
 function csv(rows){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeffItemID,ItemName,Action\r\n'+rows.map(r=>[r.id||'',r.name,ACTIONS[r.state]].map(quote).join(',')).join('\r\n');}
 function parseCSV(text){
  text=text.replace(/^\ufeff/,'');if(text.length>2e6)throw Error('CSV 過大');
  const rows=[];let row=[],value='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;}
   else if(c===','||c==='\r'||c==='\n'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x!==''))rows.push(row);row=[];}}
   else if(c==='"'&&!value&&!closed)quoted=true;
   else{if(closed||c==='"')throw Error('CSV 引號格式不正確');value+=c;}
  }
  if(quoted)throw Error('CSV 引號未結束');if(value||row.length){row.push(value);rows.push(row);}
  if(rows.shift()?.join(',')!=='ItemID,ItemName,Action')throw Error('CSV 標題必須是 ItemID,ItemName,Action');return rows;
 }
 function importCSV(text,byId){
  const valid=[],issues=[],seen=new Set();
  parseCSV(text).forEach((r,i)=>{const item=byId.get(String(Number(r[0]))),state=ACTIONS.indexOf(r[2]);
   if(r.length!==3||!/^\d+$/.test(r[0])||!item||state<0){issues.push(`第 ${i+2} 列：未知 ID 或處理狀態`);return;}
   if(seen.has(item.name)){issues.push(`第 ${i+2} 列：重複道具，已略過`);return;}seen.add(item.name);valid.push({id:item.id,name:item.name,state});
  });return {valid,issues};
 }
 function merge(current,incoming,replace=false,overwrite=false){
  const out=replace?[]:current.map(r=>({...r})),seen=new Map(out.map((r,i)=>[r.name,i]));let duplicate=0;
  for(const r of incoming){if(seen.has(r.name)){duplicate++;if(overwrite)out[seen.get(r.name)].state=r.state;continue;}seen.set(r.name,out.length);out.push({...r});}
  if(out.length>MAX)throw Error(`合併後 ${out.length} 筆，超過 251 筆；未套用任何變更`);return {rows:out,duplicate};
 }
 const api={MAX,parse,serialize,encode,equal,csv,parseCSV,importCSV,merge,ACTIONS};
 root.AutoDataCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

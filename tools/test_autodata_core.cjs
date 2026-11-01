const assert=require('assert'),fs=require('fs'),vm=require('vm');
const C=require('../js/features/autodata/core');
const source=fs.readFileSync(process.argv[2]);
const original=Buffer.from(source),meta=C.parse(source);
assert(C.equal(C.serialize(meta,meta.arr),source));
for(const n of [0,1,47,127,251]){
 const rows=Array.from({length:n},(_,i)=>({name:'測試'+i,state:i%3}));
 const output=C.serialize(meta,rows),parsed=C.parse(output);
 assert.equal(parsed.arr.length,n);assert(C.equal(parsed.prefix,meta.prefix));assert(C.equal(parsed.suffix,meta.suffix));
 assert.deepEqual(parsed.arr.map(r=>r.state),rows.map(r=>r.state));
 assert(C.equal(C.serialize(parsed,parsed.arr),output));
}
assert.throws(()=>C.serialize(meta,Array.from({length:252},()=>({name:'測試',state:0}))));
assert.throws(()=>C.parse(source.subarray(0,source.length-1)));
const bad=Buffer.from(source);bad[4]=0;assert.throws(()=>C.parse(bad));
const corrupt=Buffer.from(source);corrupt.writeUInt32LE(999,meta.start);assert.throws(()=>C.parse(corrupt));
const invalidState=C.serialize(meta,[{name:'測試',state:0}]);invalidState.writeUInt32LE?.(3,0);
assert.throws(()=>C.serialize(meta,[{name:'測試',state:3}]));
assert.throws(()=>C.serialize(meta,[{name:'測試',raw:Uint8Array.of(65),state:0}]));
// The historical omitted-list variants preserve every byte without inventing settings.
for(const prefix of [source.subarray(0,1038),Buffer.concat([source.subarray(0,1038),Buffer.from([11,0,0,0,1,70,0,0,0])])]){
 const m=C.parse(prefix);assert(C.equal(C.serialize(m,[]),prefix));
 const out=C.serialize(m,[{name:'靈木',state:1}]);assert(C.equal(out.subarray(0,prefix.length),prefix));assert.equal(C.parse(out).arr.length,1);
}
const rows=[{id:'1',name:'引號"、逗號,\n換行',state:2}];assert.equal(C.parseCSV(C.csv(rows))[0][1],rows[0].name);
assert.throws(()=>C.parseCSV('ItemID,ItemName,Action\n1,"bad,保存'));
const byId=new Map([['1',{id:'1',name:'靈木'}]]);
const imported=C.importCSV('\ufeffItemID,ItemName,Action\r\n1,忽略這個名稱,保存\r\n1,重複,丟棄\r\n999,未知,保存',byId);
assert.equal(imported.valid.length,1);assert.equal(imported.valid[0].name,'靈木');assert.equal(imported.issues.length,2);
assert.equal(C.merge([{name:'靈木',state:0}],[{name:'靈木',state:1}]).rows[0].state,0);
assert.equal(C.merge([{name:'靈木',state:0}],[{name:'靈木',state:1}],false,true).rows[0].state,1);
assert.throws(()=>C.merge(Array.from({length:251},(_,i)=>({name:String(i)})),[{name:'額外'}]));
const window={AutoDataCore:C};vm.runInNewContext(fs.readFileSync(require.resolve('../js/features/autodata/services.js'),'utf8'),{window,TextDecoder,Uint8Array,Map,Set,Error,Date,crypto:require('crypto').webcrypto});
const S=window.AutoDataServices;
function handle(data,fail=false){return {name:'test_3.data',data:Uint8Array.from(data),writes:0,async getFile(){return {arrayBuffer:async()=>this.data.slice().buffer};},async createWritable(){if(fail)throw Error('Denied');let pending;return {write:async b=>{pending=Uint8Array.from(b);},close:async()=>{this.data=pending;this.writes++;},abort:async()=>{}};}};}
(async()=>{
 const output=C.serialize(meta,[{name:'靈木',state:1}]);let h=handle(source),back=handle([]);
 const dir={getFileHandle:async()=>back};await S.backupAndWrite(h,dir,source,output);
 assert(C.equal(back.data,source));assert(C.equal(h.data,output));assert(S.canRestore(output,source));
 await S.backupAndWrite(h,dir,output,source);assert(C.equal(h.data,source));assert(C.equal(back.data,output));
 h=handle(source);await assert.rejects(()=>S.backupAndWrite(h,{getFileHandle:async()=>handle([],true)},source,output));assert.equal(h.writes,0);
 h=handle(source);h.data[10]^=1;await assert.rejects(()=>S.backupAndWrite(h,dir,source,output));assert.equal(h.writes,0);
 h=handle(source);const changedDir={getFileHandle:async()=>{h.data[10]^=1;return handle([]);}};await assert.rejects(()=>S.backupAndWrite(h,changedDir,source,output));assert.equal(h.writes,0);
 assert(!S.canRestore(h.data,source));
 assert(C.equal(original,fs.readFileSync(process.argv[2])));
 console.log('PASS: byte-identical roundtrip; 0/1/47/127/251; settings preservation; invalid input; CSV; merge; backup/restore/conflicts/failure mocks. Original untouched.');
})().catch(e=>{console.error(e.message);process.exit(1);});

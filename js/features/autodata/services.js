(function(root){
 'use strict';
 const C=root.AutoDataCore;
 let promise;
 const normalize=s=>(root.SZO_LANGUAGE?.toTraditional(String(s))||String(s)).toLowerCase().trim();
 function matches(text,query,fuzzy=true){
  text=normalize(text);query=normalize(query);if(!query||text.includes(query))return true;
  if(!fuzzy)return false;let i=0;for(const c of text)if(c===query[i])i++;return i===query.length;
 }
 async function loadData(){
  if(!promise)promise=(async()=>{
   const read=async name=>{const r=await fetch('data/'+name+'.json?v='+encodeURIComponent(document.body.dataset.version||'dev'),{cache:'force-cache'});if(!r.ok)throw Error('網站道具資料讀取失敗');return r.json();};
   const [raw,monsters,locations,index,stages,reverse]=await Promise.all(['items','monsters','locations','stage_map_index','stage_maps','drop_reverse'].map(read));
   const items=raw.filter(r=>r.ID&&r.Name).map(r=>({id:String(r.ID),name:r.Name,type:r.Type||'',value:r.Value==null||r.Value===''?null:Number(r.Value)}));
   const byId=new Map(items.map(r=>[r.id,r])),byName=new Map();items.forEach(r=>{if(!byName.has(r.name))byName.set(r.name,r);});
   const monsterIds=new Map(monsters.map(r=>[String(r.ID),r]));
   // Same canonical reverse index as item lookup, including approved drop revisions.
   const dropsByMonster=new Map();
   for(const [id,rows] of Object.entries(reverse))for(const row of rows){const key=String(row.monsterId);if(!dropsByMonster.has(key))dropsByMonster.set(key,new Set());if(byId.has(id))dropsByMonster.get(key).add(id);}
   const maps=index.stages.filter(m=>SZO_MAP_CLASS.visible(m.stageId)).flatMap(m=>{
    const stage=stages.stages.find(s=>s.stageId===m.stageId);
    if(stage?.mapCategory==='tower')return stage.areas.map(a=>({...m,key:'tower:'+a.floor,category:'終末之塔',floor:a.floor,stageName:a.floor+'樓',ids:new Set(),unknown:0,monsters:0}));
    return [{...m,key:String(m.stageId),category:'一般地圖',ids:new Set(),unknown:0,monsters:0}];
   }).sort((a,b)=>(!!a.floor-!!b.floor)||(a.floor||a.stageId)-(b.floor||b.stageId));
   for(const m of maps){
    const exact=stages.stages.find(s=>s.stageId===m.stageId);
    const ids=exact?new Set((exact.monsters||[]).filter(r=>!m.floor||r.floor===m.floor).map(r=>String(r.id))):new Set(monsters.filter(r=>String(locations[r.Name]||'').split('、').includes(m.stageName)).map(r=>String(r.ID)));
    m.monsterNames=[...ids].map(id=>monsterIds.get(id)?.Name||id);
    for(const id of ids){const monster=monsterIds.get(id);m.monsters++;
     if(!monster?.DropItem)m.unknown++;
     for(const itemId of dropsByMonster.get(id)||[])m.ids.add(itemId);
    }
   }
   return {items,byId,byName,maps,monsterIds,dropsByMonster};
  })().catch(e=>{promise=null;throw e;});
  return promise;
 }
 const defaults=()=>({version:1,plans:Array.from({length:5},()=>({name:'自訂方案',rows:[]})),discard:[],favorites:[],warn:true});
 async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('szo-autodata-editor',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('無法開啟本機方案儲存空間'));});}
 async function readSettings(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('settings'),r=tx.objectStore('settings').get('config');r.onsuccess=()=>{
  const config=r.result||defaults(),oldNames=['一般練功','副本打寶','材料收集','高價物品保留'];
  // Migrate only the old slot defaults; preserve custom names and all saved rows.
  config.plans.forEach((p,i)=>{if(p.name===oldNames[i])p.name='自訂方案';});resolve(config);
 };r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
 async function saveSettings(config){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(structuredClone(config),'config');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(Error('本機儲存失敗，尚未儲存；請匯出方案備份'));};});}
 const bytes=async handle=>new Uint8Array(await (await handle.getFile()).arrayBuffer());
 async function write(handle,data){const stream=await handle.createWritable();try{await stream.write(data);await stream.close();}catch(e){try{await stream.abort();}catch(_e){}throw e;}}
 async function verifiedWrite(handle,data){await write(handle,data);if(!C.equal(await bytes(handle),data))throw Error('寫入後驗證不符');}
 function backupName(name){return name.replace(/\.data$/i,'')+'_backup_'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'_'+crypto.randomUUID().slice(0,8)+'.data';}
 async function createBackup(handle,directory,expected){
  if(!C.equal(await bytes(handle),expected))throw Error('原檔已被其他程式修改，請重新載入；未覆寫');
  const name=backupName(handle.name),backup=await directory.getFileHandle(name,{create:true});
  await verifiedWrite(backup,expected);
  return name;
 }
 async function listBackups(directory,sourceName){
  const prefix=sourceName.replace(/\.data$/i,'')+'_backup_',rows=[];
  for await(const handle of directory.values()){
   if(handle.kind!=='file'||!handle.name.startsWith(prefix)||!handle.name.endsWith('.data'))continue;
   const file=await handle.getFile();
   rows.push({handle,name:handle.name,time:file.lastModified});
  }
  return rows.sort((a,b)=>b.time-a.time||b.name.localeCompare(a.name));
 }
 async function backupAndWrite(handle,directory,expected,output){
  C.parse(output);
  const name=await createBackup(handle,directory,expected);
  // Recheck AFTER backup: the game may have saved while the backup was being written.
  if(!C.equal(await bytes(handle),expected))throw Error('備份期間原檔有變動；已停止覆寫');
  try{await verifiedWrite(handle,output);}catch(e){throw Error('原檔寫入或驗證失敗，可能已變動。獨立備份：'+name+'。請勿進入遊戲，先還原備份。'+e.message);}
  return name;
 }
 function canRestore(current,backup){
  const a=C.parse(current),b=C.parse(backup);
  // Only restore the item list. Other character settings must be identical.
  return C.equal(a.prefix,b.prefix)&&C.equal(a.suffix,b.suffix);
 }
 root.AutoDataServices={normalize,matches,loadData,defaults,readSettings,saveSettings,bytes,verifiedWrite,createBackup,listBackups,backupAndWrite,canRestore};
})(window);

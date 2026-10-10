(function(){
 const state=window.SZO_ITEM_FILTERS={category:'',family:'',collection:'',profession:'',mode:'',effect:'All',unit:'',special:'',target:''};
 const data=()=>window.SZO_EQUIPMENT_TAXONOMY||{byId:{}};
 const buffs=()=>window.SZO_ITEM_BUFFS||{fields:{},byId:{},specialById:{}};
 const id=it=>String(it.ID||it.id);
 const record=it=>data().byId[id(it)]||{category:'其他道具',class:'',type:it.Type||it.type,tags:[]};
 const equipment=r=>r.category!=='其他道具';
 const isPet=r=>equipment(r)&&r.class.split(',').map(s=>s.trim()).includes('CLASS_PET');
 const categoryMatch=r=>!state.category||(state.category==='寵物裝備'?isPet(r):state.category==='道具'?!equipment(r):state.category==='藥品'?r.type==='POTION':state.category==='符咒'?r.type==='MAGIC_FIGURE':state.category==='配方'?r.type==='PRESCRIPTION':r.category===state.category);
 const tagsMatch=(r,family,collection)=>r.tags.some(t=>(!family||t.family===family)&&(!collection||t.collection===collection));
 const special=it=>buffs().specialById[id(it)]||[];
 function effects(it,ignoreUnit=false){
  const all=buffs().byId[id(it)]||[];
  if(state.mode==='buff'&&['Str','Dex','Con','Int'].includes(state.effect)&&all.some(e=>e.key==='All'))return [];
  return all.filter(e=>{
  const key=state.mode==='hp'?'RestoreHP':state.mode==='mp'?'RestoreMP':state.effect;
  return (state.mode!=='buff'||!e.key.startsWith('Restore'))&&(!key||e.key===key)&&(ignoreUnit||!state.unit||e.unit===state.unit);
 });}
 function matches(it,ignoreUnit=false){
  const r=record(it);
  if(!categoryMatch(r)||state.special&&!special(it).some(s=>s.label===state.special))return false;
  if(state.category==='寵物裝備')return !state.collection||r.category===state.collection;
  if(state.mode){
   if(state.mode==='buff'&&(state.target==='person'&&r.class.includes('CLASS_PET')||state.target==='pet'&&!r.class.includes('CLASS_PET')))return false;
   return state.mode==='remove'?special(it).some(s=>s.key.startsWith('remove:')):effects(it,ignoreUnit).length>0;
  }
  const classes=r.class.split(',').map(s=>s.trim());
  const professionMatch=!state.profession||(state.profession.startsWith('series:')?r.tags.some(t=>t.variant===state.profession.slice(7)&&(!state.family||t.family===state.family)&&(!state.collection||t.collection===state.collection)):state.profession==='CLASS_PET'?classes.includes('CLASS_PET'):state.profession==='unrestricted'?!r.class:!r.class||classes.includes(state.profession));
  return (!state.family&&!state.collection||tagsMatch(r,state.family,state.collection))&&(!state.profession||equipment(r)&&professionMatch);
 }
 function fill(id,values,selected,all){const el=document.getElementById(id);if(!el)return selected;el.replaceChildren(new Option(all,''),...values.map(v=>new Option(v.label||v,v.value||v)));el.value=selected;return el.value;}
 function show(id,visible){const el=document.getElementById(id);if(el)el.closest('.kv').hidden=!visible;}
 function refresh(){
  if(['藥品','符咒'].includes(state.category))state.category='道具';
  const petEquipment=state.category==='寵物裝備';
  const isEquipment=['武器','防具','仙器','特殊飾品'].includes(state.category);
  const consumable=['道具','藥品','符咒'].includes(state.category);
  show('itemKind',state.category==='武器');
  if(state.category!=='武器'){window.v110ItemKind='';const kind=document.getElementById('itemKind');if(kind)kind.value='';}
  if(!isEquipment&&!petEquipment){state.family='';state.collection='';state.profession='';fill('itemFamily',[],'','全部系列');fill('itemCollection',[],'','全部細分類');}
  fill('itemCategory',['武器','防具','仙器','特殊飾品',{value:'寵物裝備',label:'封獸裝備'},'配方',{value:'道具',label:'藥品／道具／符咒'}],state.category,'全部大類');
  const collectionLabel=document.getElementById('itemCollection')?.closest('.kv').querySelector('.k');
  if(collectionLabel)collectionLabel.textContent=petEquipment?'部位':'細分類 / 武匣';
  for(const field of ['itemFamily','itemCollection','itemProfession'])show(field,isEquipment);
  show('itemType',!!state.category&&state.category!=='配方'&&state.category!=='藥品'&&state.category!=='符咒');
  show('itemMode',consumable);show('itemBuffEffect',state.mode==='buff');show('itemBuffUnit',['buff','hp','mp'].includes(state.mode));show('itemBuffTarget',state.mode==='buff');
  if(state.mode!=='buff')state.target='';
  fill('itemMode',[{value:'hp',label:'補血'},{value:'mp',label:'補精'},{value:'buff',label:'增益'},{value:'remove',label:'解除異常'}],state.mode,'全部用途');
  state.effect=fill('itemBuffEffect',Object.entries(buffs().fields).map(([value,label])=>({value,label})),state.effect,'全部增益');
  fill('itemBuffTarget',[{value:'person',label:'人物'},{value:'pet',label:'封獸'}],state.target,'全部使用對象');
  let rows=Object.entries(data().byId).filter(([,r])=>categoryMatch(r));
  const unique=v=>[...new Set(v.filter(Boolean))];
  if(isEquipment){
   const families=unique(rows.flatMap(([,r])=>r.tags.map(t=>t.family))).filter(f=>f!=='寵物裝備');
   const order=['世貿系列','玄宙','旭品','帝星流','煌星流','仙星流','聯動／NFT','無限暗器','六滅系列','聖甲','潮服','特殊系列','九日系列','王狼系列','南遼系列','虛化系列','太極系列','星陣系列','兇星系列','狼牙系列','五蛇系列','五鎖系列','經驗加倍','轉運加倍','五佐天座','聖獸之心','六滅化神','其他／未分類'];
   state.family=fill('itemFamily',families.sort((a,b)=>order.indexOf(a)-order.indexOf(b)),state.family,'全部系列');
   if(!state.family)state.collection='';
   rows=rows.filter(([,r])=>!state.family||tagsMatch(r,state.family,''));
   state.collection=fill('itemCollection',unique(rows.flatMap(([,r])=>r.tags.filter(t=>!state.family||t.family===state.family).map(t=>t.collection))).sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true})*-1),state.collection,'全部細分類');
   rows=rows.filter(([,r])=>!state.collection||tagsMatch(r,state.family,state.collection));
   show('itemCollection',!!state.family&&rows.some(([,r])=>r.tags.some(t=>t.family===state.family&&t.collection)));
  }
  const specials=new Map(rows.flatMap(([key])=>special({ID:key})).map(s=>[s.label,s.label]));
  state.special=fill('itemSpecial',Array.from(specials,([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'zh-Hant')),state.special,'全部特殊效果');
  const variants=unique(rows.flatMap(([,r])=>r.tags.filter(t=>(!state.family||t.family===state.family)&&(!state.collection||t.collection===state.collection)).map(t=>t.variant))).map(label=>({value:'series:'+label,label}));
  const professions=state.collection==='特仕'?[]:[...(state.collection==='職業防具'?[]:[{value:'unrestricted',label:'不限職業'}]),...Object.entries(SZO_DISPLAY.values.Class).filter(([code])=>code!=='CLASS_PET').map(([value,label])=>({value,label}))];
  state.profession=fill('itemProfession',[...professions,...variants],state.profession,state.collection==='特仕'?'全部特仕系列':'全部職業／特仕系列');
  const types=new Set(rows.filter(([key])=>matches({ID:key},true)).map(([,r])=>r.type));
  window.v86ItemType=fill('itemType',Object.entries(ITEM_TYPE_MAP).filter(([code])=>types.has(code)).map(([value,label])=>({value,label})),window.v86ItemType||'','全部種類');
  for(const field of ['itemMin','itemMax','itemSpecial'])show(field,!petEquipment);
  if(petEquipment){
   state.family='';state.profession='';state.special='';
   state.collection=fill('itemCollection',[{value:'武器',label:'武器'},{value:'防具',label:'防具'},{value:'特殊飾品',label:'飾品'}],state.collection,'全部部位');
   show('itemCollection',true);
   window.v86ItemType='';window.v86ItemMin='';window.v86ItemMax='';window.v110ItemKind='';
   for(const field of ['itemFamily','itemProfession','itemType','itemMin','itemMax','itemKind','itemSpecial']){
    show(field,false);const el=document.getElementById(field);if(el)el.value='';
   }
  }
 }
 function refreshUnits(rows){
  const el=document.getElementById('itemBuffUnit');if(!el)return;
  if(!['buff','hp','mp'].includes(state.mode)){state.unit='';el.replaceChildren();return;}
  const available=new Set(rows.flatMap(it=>effects(it,true).map(e=>e.unit)));
  const options=[['number','固定加值'],['percent','百分比'],['multiplier','倍率']].filter(([value])=>available.has(value));
  state.unit=available.has(state.unit)?state.unit:options[0]?.[0]||'';
  el.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
  el.value=state.unit;
 }
 function changed(){for(const [key,field] of Object.entries({family:'itemFamily',collection:'itemCollection',profession:'itemProfession',effect:'itemBuffEffect',unit:'itemBuffUnit',special:'itemSpecial',target:'itemBuffTarget'}))state[key]=document.getElementById(field)?.value||'';refresh();window.searchItems();}
 function categoryChanged(){state.category=document.getElementById('itemCategory').value;for(const key of ['family','collection','profession','mode','unit','special','target'])state[key]='';state.effect='All';window.v86ItemType='';refresh();window.searchItems();}
 function modeChanged(){state.mode=document.getElementById('itemMode').value;state.effect='All';state.unit='';state.target=state.mode==='buff'?'person':'';state.special='';window.v86ItemType='';refresh();window.searchItems();}
 function best(it){return effects(it).slice().sort((a,b)=>a.key.localeCompare(b.key)||a.unit.localeCompare(b.unit)||b.value-a.value)[0];}
 function sort(rows){
  if(!['buff','hp','mp'].includes(state.mode)){
   const types=Object.keys(ITEM_TYPE_MAP);
   const rank=it=>{const type=record(it).type;const index=types.indexOf(type==='HIDDEN_WEAPON2'?'HIDDEN_WEAPON':type);return index<0?types.length:index;};
   return rows.every(it=>equipment(record(it)))?rows.slice().sort((a,b)=>rank(a)-rank(b)||(record(b).order??-1)-(record(a).order??-1)):rows;
  }
  return rows.slice().sort((a,b)=>{const x=best(a),y=best(b);return x.key.localeCompare(y.key)||x.unit.localeCompare(y.unit)||y.value-x.value||y.seconds-x.seconds||Number(b.ID||b.id)-Number(a.ID||a.id);});
 }
 function summary(it){if(!state.mode)return '';if(state.mode==='remove')return special(it).filter(s=>s.key.startsWith('remove:')).map(s=>s.label).join('、');return (record(it).class.includes('CLASS_PET')?'封獸專用；':'')+effects(it).map(e=>`${({...buffs().fields,RestoreHP:'補血',RestoreMP:'補精'})[e.key]} ${e.unit==='multiplier'?'':'+'}${e.value}${e.max&&e.max!==e.value?'-'+e.max:''}${e.unit==='percent'?'%':e.unit==='multiplier'?' 倍':''}${e.seconds?'（'+SZO_DISPLAY.duration(e.seconds)+'）':''}`).join('；');}
 function clear(){Object.keys(state).forEach(k=>state[k]='');state.effect='All';refresh();}
 window.SZO_ITEM_TAXONOMY={matches,refresh,refreshUnits,changed,categoryChanged,modeChanged,sort,summary,clear,active:()=>[state.category,state.special,state.mode].some(Boolean)};
})();

(function(){
 'use strict';
 const data=window.SZO_MAP_TAXONOMY;
 const get=id=>data.stages[String(id)]||{section:'一般地圖',group:'其他地圖'};
 const visible=id=>!get(id).hidden;
 const same=(id,scope)=>{const c=get(id);return !c.hidden&&c.section===scope.section&&c.group===scope.group&&(c.group!=='聯動'||c.series===scope.series);};
 const normalize=scope=>{
  const section=data.sections.includes(scope?.section)?scope.section:'一般地圖';
  const groups=data.groups[section];
  return {section,group:groups.includes(scope?.group)?scope.group:groups[0],series:data.series.includes(scope?.series)?scope.series:data.series[0]};
 };
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const options=(values,current)=>values.map(v=>`<option value="${escape(v)}" ${v===current?'selected':''}>${escape(v)}</option>`).join('');
 function controls(prefix,scope){
  scope=normalize(scope);
  return `<label>地圖分類<select id="${prefix}CategorySelect" aria-label="地圖分類">${options(data.sections,scope.section)}</select></label>`+
   `<label>${scope.section==='一般地圖'?'資料片':'特殊分類'}<select id="${prefix}GroupSelect" aria-label="資料片或特殊分類">${options(data.groups[scope.section],scope.group)}</select></label>`+
   (scope.group==='聯動'?`<label>聯動系列<select id="${prefix}SeriesSelect" aria-label="聯動系列">${options(data.series,scope.series)}</select></label>`:'');
 }
 function change(scope,kind,value){
  scope={...scope};
  if(kind==='Category'){scope.section=value;scope.group='';}
  if(kind==='Group')scope.group=value;
  if(kind==='Series')scope.series=value;
  return normalize(scope);
 }
 window.SZO_MAP_CLASS={get,visible,same,normalize,controls,change};
})();

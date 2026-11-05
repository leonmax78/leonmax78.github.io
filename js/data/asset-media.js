(function(){
  const cache={item:null,monster:null,soul:null};
  function manifest(){return (window.SZO_DATA_BUNDLES&&window.SZO_DATA_BUNDLES.asset_manifest)||window.SZO_ASSET_MANIFEST||{}}
  function base(){
    const raw=(manifest().base||'assets/test-media').replace(/\/$/,'');
    if(raw.startsWith('/')||/^https?:\/\//i.test(raw))return raw;
    const path=String(location&&location.pathname||'');
    const prefix=path==='/test'||path.startsWith('/test/')?'/test/':'/';
    return prefix+raw.replace(/^\//,'');
  }
  function setOf(key){
    if(cache[key])return cache[key];
    const m=manifest();
    const list=key==='item'?m.itemIcons:(key==='monster'?m.monsterPics:m.soulIds);
    cache[key]=new Set(Array.isArray(list)?list.map(String):[]);
    return cache[key];
  }
  function mediaVersion(){
    const v=String(manifest().version||'').trim();
    return v?`?v=${encodeURIComponent(v)}`:'';
  }
  const monsterPortraitOverrides={
    '15714':'monster-portraits/m15714.png',
    // 1105 update: these monsters moved to new colour-table Pics (MONSTER2.OBD "MiscAttrib" variants).
    // Until those recoloured portraits are rendered, show a portrait of the same sprite (colour may differ).
    '18246':'monster-portraits/m6507.png', // 覆甲劍狂：新 Pic 8970（m692）尚無頭像
    '18247':'monster-portraits/m8932.png', // 死誓巫卜：新 Pic 8971（m1004）尚無頭像
    '18248':'monster-portraits/m8934.png', // 瘋盲淵兵：新 Pic 8972（m1006）尚無頭像
    '18250':'monster-portraits/m8844.png', // 歧路石衛：新 Pic 8973（m968）尚無頭像
    '18252':'monster-portraits/m5938.png', // 捨心半獸：新 Pic 8974（m666）尚無頭像
    '18257':'monster-portraits/m8937.png', // 群蛛育母：新 Pic 8976（m1009）尚無頭像
    '18258':'monster-portraits/m8931.png', // 六剋法馬：新 Pic 8977（m1003）尚無頭像
    '18259':'monster-portraits/m5230.png', // 叫喚之手：新 Pic 8978（m230）尚無頭像
    '18260':'monster-portraits/m5154.png', // 吐朽殘花：新 Pic 8979（m154）尚無頭像
    '18261':'monster-portraits/m8936.png', // 淵藪蟹母：新 Pic 8980（m1008）尚無頭像
    '18262':'monster-portraits/m6481.png', // 咒鋼蛛王：新 Pic 8522（m823）尚無頭像
    '18264':'monster-portraits/m6529.png', // 淵澤納迦：新 Pic 8982（m681）尚無頭像
    '18267':'monster-portraits/m8927.png', // 萬屍血膠：新 Pic 8975（m999）尚無頭像
    '18268':'monster-portraits/m5773.png', // 古神凝視：新 Pic 8984（m615）尚無頭像
    '18269':'monster-portraits/m8933.png', // 墮天遺骼：新 Pic 8985（m1005）尚無頭像
    '18270':'monster-portraits/m8932.png', // 獻命司祭：新 Pic 8986（m1004）尚無頭像
    '18273':'monster-portraits/m8762.png', // 縫合鏖魔：新 Pic 8987（m56）尚無頭像
    '18274':'monster-portraits/m6517.png', // 背信邪龍：新 Pic 8988（m702）尚無頭像
  };
  function pad4(v){const n=parseInt(String(v||'').trim(),10);return Number.isFinite(n)?String(n%10000).padStart(4,'0'):''}
  function legacyIconSuffixes(iconId,itemType){
    const n=parseInt(String(iconId||'').trim(),10);
    if(!Number.isFinite(n)||n<20000||n>=21000)return [];
    const tail=n%1000;
    const t=String(itemType||'').toUpperCase();
    const equip=['ARMOR','HELMET','BOOT','BRACER','ORNAMENT'];
    const weapon=['BLADE','SWORD','WHISK','AXE','SHIELD','ROD','SPEAR','STAFF','HAMMER'];
    const material=['MATERIAL','POTION','MAGIC_FIGURE','SUMMON_TOOL','TALISMAN','PRESCRIPTION'];
    const families=equip.includes(t)?[4,5,3]:(weapon.includes(t)?[5,4,3]:(material.includes(t)?[3,4,5]:[4,5,3]));
    return families.map(x=>String(x*1000+tail).padStart(4,'0'));
  }
  function itemIconSrc(item){
    const icon=item&&(item.Icon!==undefined?item.Icon:item.icon);
    const tries=[pad4(icon),...legacyIconSuffixes(icon,item&&(item.Type||item.type))].filter(Boolean);
    const set=setOf('item');
    const suffix=tries.find(x=>set.has(x));
    return suffix?`${base()}/item-icons/i${suffix}.png${mediaVersion()}`:'';
  }
  function monsterPortraitSrc(monster){
    const id=String(monster&&(monster.ID!==undefined?monster.ID:monster.id)||'').trim();
    const beast=id&&(window.SZO_BEASTS||[]).find(row=>String(row.monsterId)===id&&row.portrait);
    if(beast)return beastPortraitSrc(beast.portrait);
    if(id&&monsterPortraitOverrides[id])return `${base()}/${monsterPortraitOverrides[id]}${mediaVersion()}`;
    const pic=String(monster&&(monster.Pic!==undefined?monster.Pic:monster.pic)||'').trim();
    return pic&&setOf('monster').has(pic)?`${base()}/monster-portraits/m${pic}.png${mediaVersion()}`:'';
  }
  function soulPortraitSrc(soul){
    const id=String(soul&&(soul.ID!==undefined?soul.ID:soul.id)||'').trim();
    return id&&setOf('soul').has(id)?`${base()}/soul-portraits/s${id}.png${mediaVersion()}`:'';
  }
  // V662: one URL per beast portrait so list rows and detail views share a single request.
  const BEAST_PORTRAIT_VERSION='528';
  function beastPortraitSrc(path){
    const clean=String(path||'').replace(/^\/+/, '');
    return `${base().replace(/\/assets\/test-media$/, '')}/${clean}?v=${BEAST_PORTRAIT_VERSION}`;
  }
  function img(src,alt,cls){
    if(src&&/^\/?assets\/beast-portraits\/[^?]+$/.test(String(src)))src=beastPortraitSrc(src);
    return src?`<span class="${cls||'assetThumb'}"><img src="${esc(src)}" alt="${esc(alt||'')}" loading="lazy" decoding="async" onerror="this.closest('.assetThumb,.assetHero')?.remove()"></span>`:'';
  }
  window.SZO_ASSET_MEDIA={manifest,itemIconSrc,monsterPortraitSrc,soulPortraitSrc,img};
})();

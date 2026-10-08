// Shared display vocabulary. Never use translated labels as calculation keys.
(function(){
  const fields = {
    ID:'ID',Name:'名稱',Type:'類型',SubType:'子分類',Level:'等級',CLevel:'職等',Kind:'專剋',
    ExtraStatus:'特殊能力',Help:'說明',HP:'血量',MP:'精力',Con:'體魄',Str:'力量',Int:'智慧',Dex:'靈敏',
    Damage:'傷害',DamageMin:'傷害下限',DamageMax:'傷害上限',MagicAttack:'術法攻擊',ExtraDef:'物理防禦',MagicDef:'術法防禦',
    IceAttack:'冰傷',FireAttack:'火傷',LightningAttack:'雷傷',DarkAttack:'冥傷',
    IceProb:'冰傷機率',FireProb:'火傷機率',LightningProb:'雷傷機率',DarkProb:'冥傷機率',
    IceDef:'冰防',FireDef:'火防',LightningDef:'雷防',DarkDef:'冥防',
    ParalysisRes:'抗定身',PosionRes:'抗毒',BlindRes:'抗盲目',SilentRes:'抗禁咒',
    Value:'價值',Attack:'攻速',AttackRange:'攻擊距離',Durabulity:'耐久',Weight:'重量',Class:'職業限制',
    HPFlag:'血量作用方式',MPFlag:'精力作用方式',ConFlag:'體魄作用方式',StrFlag:'力量作用方式',IntFlag:'智慧作用方式',DexFlag:'靈敏作用方式',
    Flag:'道具旗標',Magic:'關聯技能',StatusParam:'狀態作用方式',StatusProb:'狀態機率',Time:'時間參數',ExpireDate:'期限規則',
    Encumbrance:'負重加成',Repletion:'飽食數值',Break:'Break 參數（待確認）',Fill:'Fill 參數（待確認）',Identify:'Identify 參數（待確認）',
    Effect:'效果代碼',MsgID:'訊息索引',Log:'Log 參數（待確認）',Icon:'道具圖示',GIcon:'GIcon 圖示代碼',OIcon:'OIcon 參數',OIcon2:'OIcon2 參數',
    Pic:'圖像編號',DropExp:'經驗值',DropMoney:'掉落金錢',DropItem:'掉落道具'
  };
  const aliases = {
    Max_HP:'HP',Max_MP:'MP',Base_Con:'Con',Base_Str:'Str',Base_Int:'Int',Base_Dex:'Dex',Extra_Def:'ExtraDef',Magic_Def:'MagicDef',
    hp:'HP',mp:'MP',con:'Con',str:'Str',int:'Int',dex:'Dex',damage:'Damage',m_attack:'MagicAttack',def:'ExtraDef',m_def:'MagicDef',
    ice_attack:'IceAttack',fire_attack:'FireAttack',lightning_attack:'LightningAttack',dark_attack:'DarkAttack',
    ice_prob:'IceProb',fire_prob:'FireProb',lightning_prob:'LightningProb',dark_prob:'DarkProb',
    ice_def:'IceDef',fire_def:'FireDef',lightning_def:'LightningDef',dark_def:'DarkDef',
    paralysis_res:'ParalysisRes',poison_res:'PosionRes',blind_res:'BlindRes',silent_res:'SilentRes',
    level:'Level',clevel:'CLevel',attack:'Attack',attack_range:'AttackRange',durability:'Durabulity',weight:'Weight',
    '血量':'HP','精力':'MP','體魄':'Con','力量':'Str','智慧':'Int','靈敏':'Dex','傷害':'Damage',
    '物理防禦':'ExtraDef','術法防禦':'MagicDef','術法攻擊':'MagicAttack',
    '冰防':'IceDef','火防':'FireDef','雷防':'LightningDef','冥防':'DarkDef',
    '抗定身':'ParalysisRes','抗毒':'PosionRes','抗盲目':'BlindRes','抗禁咒':'SilentRes',
    '等級':'Level','職等':'CLevel','攻速':'Attack','耐久':'Durabulity','重量':'Weight',
    '術攻':'MagicAttack','術防':'MagicDef','物防':'ExtraDef','防禦':'ExtraDef','生命':'HP','電防':'LightningDef','暗防':'DarkDef','職等(CL)':'CLevel'
  };
  const values = {Attack:{'1':'最慢','2':'次慢','3':'普通','4':'次快','5':'最快'},CLevel:{'0':'無','1':'一轉','2':'二轉','3':'三轉','4':'四轉','5':'五轉'},Class:{CLASS_SWORDMAN:'劍俠',CLASS_WARRIOR:'勇士',CLASS_ASSASSIN:'術者',CLASS_TAOIST:'道人',CLASS_PRIEST:'僧侶',CLASS_PET:'寵物'}};
  function label(key,fallback){
    const raw=String(key??'');
    return fields[aliases[raw]||raw] || fields[aliases[String(fallback??'')]||String(fallback??'')] || fallback || raw;
  }
  function value(key,raw){
    if(key==='Class')return String(raw??'').split(',').map(code=>code.trim()).filter(Boolean).map(code=>values.Class[code]||code).join('、');
    return values[aliases[key]||key]?.[String(raw)] ?? String(raw??'');
  }
  window.SZO_DISPLAY=Object.freeze({fields:Object.freeze(fields),aliases:Object.freeze(aliases),values,label,value});
})();

// Interpret only supported parameters; IDs, not names, identify status variants.
(function(){
 const notes={
  '12':'將攻擊造成的部分傷害轉為自身血量；吸取比例待確認。',
  '41':'將攻擊造成的部分傷害轉為自身血量；吸取比例待確認。',
  '25':'隱形且可自由行動；攻擊或施法會使隱遁失效。',
  '26':'擴大黑暗環境中的可視範圍。',
  '60':'提高物理攻擊命中率；數值換算待確認。',
  '72':'持續回復血量，並抵抗毒素侵害；回復量待確認。',
  '77':'保護身上裝備，避免耐久受到外力減損。',
  '93':'擊倒怪物時無法獲得經驗值。',
  '94':'擊倒怪物時不會掉落寶物。',
  '106':'血量達六成以上時可抵擋致死傷害；完整觸發限制請參照道具說明。',
  '118':'血量高於 90%，且傷害未高於目前血量 20 倍時，可避免被一擊致死。',
  '120':'有機率完全抵消傷害；觸發機率的參數換算待確認。',
  '124':'每秒回復 100 點血量。',
  '125':'每秒回復 100 點精力。',
  '143':'持續回復血量；STATUS 參數為 1／80，道具說明寫每秒 60 點，實際回復量待確認。',
  '144':'持續回復精力；STATUS 參數為 1／80，道具說明寫每秒 60 點，實際回復量待確認。',
  '163':'血量達 60% 以上時，可消耗精力抵擋並減輕傷害；精力換算比例待確認。',
  '169':'技能回氣時間減少 10%。',
  '173':'從攻擊傷害吸取精力至自身；吸取比例待確認。',
  '174':'避免精力受特定技能影響而持續流失。',
  '175':'避免武器傷害因枷鎖效果而降低。',
  '178':'提高物理攻擊命中率，並免除重度盲目影響；命中數值換算待確認。',
  '188':'除千里傳音外，技能精力消耗降為 50%。',
  '189':'施放技能時有低機率使回氣時間減少 30%；觸發機率待確認。',
  '194':'普通攻擊與大部分技能攻擊有 20% 機率，額外追加 1 次同額傷害。',
  '196':'抵抗暈眩、震退；道具原文另註明 2031 年 7 月起無抗暈效果。',
  '204':'普通攻擊速度提高至「超快」。'
 };
 function describe(status,item={}){
  if(!status)return {lines:['狀態資料未找到，詳細效果待確認。'],basis:'unresolved'};
  const flags=String(item.StatusParam||'').split(',').map(x=>x.trim());
  if(flags.includes('EFFECT_REMOVE'))return {lines:[`解除「${status.Name}」狀態；解除範圍以道具說明為準。`],basis:'item-removal'};
  if(notes[status.ID])return {lines:[notes[status.ID]],basis:'item-help'};
  const number=v=>v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const a=number(status.Param1),b=number(status.Param2),group=String(status.Group),lines=[];
  const signed=n=>(n>0?'+':'')+n+'%';
  if(group==='6'){
   if(a!==null)lines.push(`物理傷害輸出 ${signed(a)}`);
   if(b!==null)lines.push(`承受物理傷害 ${signed(b)}`);
  }else if(group==='30'){
   if(a!==null)lines.push(`將所受物理傷害的 ${a}% 反還攻擊者。`);
   if(b!==null)lines.push(`將所受術法傷害的 ${b}% 反還攻擊者。`);
  }else if(group==='25'&&a!==null)lines.push(`打怪經驗值倍率：${a} 倍；不代表可與其他加成直接相乘。`);
  else if(group==='21'&&a!==null)lines.push(`怪物稀有寶物掉落率倍率：${a} 倍；不代表保證掉落。`);
  else if(group==='44'&&a!==null)lines.push(`四轉人物獲得覺醒值的速度提高為 ${a} 倍。`);
  if(lines.length)return {lines,basis:'parameter-rule'};
  const qualitative={
   '3':'持續回復血量；回復間隔與數值換算待確認。',
   '7':'加快血量回復；回復間隔與數值換算待確認。',
   '4':'持續回復精力；回復間隔與數值換算待確認。',
   '28':'提高術法傷害；部分版本同時增加承受傷害，詳細數值換算待確認。',
   '5':'改變承受的傷害；物理、術法效果及幅度依狀態版本而異，詳細數值換算待確認。',
   '2':'附加中毒狀態；傷害量與作用對象請參照道具說明。'
  };
  return {lines:[qualitative[group]||'詳細作用與參數換算待確認，請參照下方道具說明。'],basis:'pending'};
 }
 window.SZO_STATUS_DESCRIPTIONS={describe};
})();

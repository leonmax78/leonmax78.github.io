(function(){
 const shapes=['','圓弧','三角','四方','五稜','六緯'];
 window.renderAbyssPage=function(){
  const slots=window.SZO_JEWELS.slots;
  const table=(headers,rows)=>`<div class="tableWrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  byId('reader').innerHTML=`<section><h1>深淵資料、神魂寶石</h1><p>27.0.0.1 · 2026/10/29</p>
  <h2>神魂寶石鑲孔</h2><p>五種形狀依序開孔，各最多 6 格。降神總等級 20,000 開滿 30 格；本次最高寶石品級為 6。</p>
  <label for="abyssLevel">降神總等級</label><input id="abyssLevel" type="number" min="0" max="20000" step="100" value="5000" style="max-width:100%;width:200px"><div id="abyssGemTotal" aria-live="polite"></div>
  <details><summary>完整開孔等級</summary>${table(['孔位','形狀','降神總等級'],slots.map(s=>[s.ID,shapes[s.Shape],Number(s.NeedLv).toLocaleString()]))}</details>
  <h2>寶石加工與拆卸</h2><p>京城、璇鶯鎮、龍川府的敖姬提供精製、磨碎、再造。品級 1、2 可精製升級至 2、3；再造可製作品級 1～5 寶石袋。道具詳情已列入材料與數量。</p><p>替換寶石會銷毀原寶石。保留原寶石須消耗 1 個萬能寶石鑿；洞府、大營特殊商人售價 12 億 5 千萬兩。</p>
  <h2>深淵場景</h2><p>從豫鸞南途西北端通路前往。285 級以上可至京城（234,14）找副將程磊承接主線，目前只開放部分流程。</p>${table(['場景','建議等級','主屬性','防禦'],[['低鳴裂口','600～950','1,900','3,000'],['血盆地穴','750～1,100','3,600','6,600'],['腥綻腐沼','900～1,200','4,700','8,800'],['呻吟幽埡','1,100～1,400','8,500','16,000']])}
  <h2>煉製額外保障</h2><p>${esc(window.SZO_REFINING.notice)}第 100 次起仍有失敗風險，失敗會使裝備消失。</p>
  <h2>名聲與銀票</h2><p>好、壞名聲上限提高至 999,999,900，指定商店最高七五折。名聲達 800,000,000 後，名聲券、聖獸真元、創神聖鑽及以太星核不能再增加名聲。</p><p>三城錢莊理事可兌換與拆兌 50、100、250、500、1,000 億兩貴銀票。貴銀票不能直接出售，須拆至一般銀票。</p>
  <h2>絕代聯動</h2><p>三城賞金獵人已開放使用秘笈學習聯動技能。金葉子可換龍虎相鬥圖：免費服 20 片、每角色限 1 本；月費服 10 片、限 2 本。每本可選學九招指定技能之一，稀有技能仍需秘笈。</p><p>江小魚．壹封魂晶可用一百億兩銀票兌換；免費服另可用五十億兩銀票換不可交易的江小魚．壹武魂。2026武魂禮券可向京城百濟煉魂師選換 13 款武魂。</p><p>絕代移花宮主錦囊販售至 2026/12/17 維護前。聯動寶物於該次維護後停止取得，等待未來可能的復刻。</p>
  <h2>虛空大秘境第十三季</h2><p>神魂寶石秘藏袋Ⅵ：月費服 100 枚、免費服 200 枚第13季秘境晶幣。向星群碎道或終末之塔98層的虛空鬼奴兌換。本季預定於 2026/12/17 上午結束。</p>
  <h2>掉落資料確認狀態</h2><p>已同步封包內可確認的寶箱、錦囊機率。公告已調整、但封包未提供新機率的怪物，查詢中標示「改版機率待確認」；公告移除的品項不再列出。八星封獸［白骨精］不受此次掉落調整影響。</p></section>`;
  const refresh=()=>{
   const level=Math.max(0,Math.min(20000,Number(byId('abyssLevel').value)||0));
   const counts=[0,0,0,0,0,0];slots.filter(s=>Number(s.NeedLv)<=level).forEach(s=>counts[Number(s.Shape)]++);
   const stats=[32306,32316,32326,32336,32346].map(id=>Number(window.SZO_JEWELS.gems[id].Base_Int));const total=stats.reduce((s,v,i)=>s+v*counts[i+1],0);
   byId('abyssGemTotal').innerHTML=table(['六星碧綠寶石','孔位','每顆智慧','智慧小計'],stats.map((v,i)=>[shapes[i+1],counts[i+1],'+'+v,'+'+(v*counts[i+1])]))+`<p><strong>共 ${counts.reduce((a,b)=>a+b,0)} 格，全裝六星碧綠寶石：智慧 +${total.toLocaleString()}</strong></p>`;
  };
  byId('abyssLevel').addEventListener('input',refresh);refresh();
 };
})();

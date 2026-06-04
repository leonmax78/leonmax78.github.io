export async function initHome({reader,state}){
 reader.innerHTML=`<div class="card"><h1>${state.config.title||'首頁'}</h1><div class="notice">V101 模組化資料版已啟動。</div><div class="muted">框架：index.html；功能：js/modules/*.js；資料：data/*.json。</div></div>`;
}
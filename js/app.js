import { initHome } from './modules/home.js';
import { initJiangshen } from './modules/jiangshen.js';
import { initMonster } from './modules/monster.js';
import { initItem } from './modules/item.js';
import { initCompound } from './modules/compound.js';
import { initSoul } from './modules/soul.js';
const modules={home:initHome,jiangshen:initJiangshen,monster:initMonster,item:initItem,compound:initCompound,soul:initSoul};
const state={config:{},pages:[],current:'home'};
export async function loadJson(path,fallback){try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return await r.json()}catch(e){console.warn('讀取失敗',path,e);return fallback}}
function closeMenu(){drawer?.classList.remove('open');backdrop?.classList.remove('open')}
function openMenu(){drawer?.classList.add('open');backdrop?.classList.add('open')}
function buildNav(){const nav=document.getElementById('navRoot');nav.innerHTML='';for(const p of state.pages){const b=document.createElement('button');b.type='button';b.className='navBtn major'+(p.id===state.current?' active':'');b.innerHTML=`${p.title} <span>›</span>`;b.onclick=()=>{navigate(p.id);closeMenu()};nav.appendChild(b)}}
export async function navigate(id){const p=state.pages.find(x=>x.id===id)||state.pages[0];state.current=p.id;buildNav();const reader=document.getElementById('reader');reader.innerHTML='<div class="card"><div class="muted">載入中...</div></div>';const fn=modules[p.module];if(!fn){reader.innerHTML=`<div class="card"><h1>${p.title}</h1><div class="empty">尚未建立模組</div></div>`;return}await fn({reader,page:p,state,loadJson,navigate})}
async function main(){state.config=await loadJson('data/config.json',{});state.pages=await loadJson('data/pages.json',[{id:'home',title:'首頁',module:'home'}]);siteTitle.textContent=state.config.title||'神州工具系統';siteMaker.textContent=state.config.maker||'';openMenuBtn?.addEventListener('click',openMenu);closeMenuBtn?.addEventListener('click',closeMenu);backdrop?.addEventListener('click',closeMenu);buildNav();navigate('home')}
main();
// V242: data loading and parsing helpers.
function candidateUrls(name){
  const raw = String(name || '');
  const encoded = encodeURIComponent(raw).replace(/%2F/g, '/');
  const urls = ['./' + raw];
  if(encoded !== raw) urls.push('./' + encoded);
  return [...new Set(urls)];
}

async function fetchTimeout(url, ms = 30000){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try{
    return await fetch(url, { signal: ctrl.signal });
  }finally{
    clearTimeout(timer);
  }
}

async function fetchFirst(names, label){
  const tried = [];
  for(const name of names){
    for(const url of candidateUrls(name)){
      try{
        loadLine(`讀取 ${esc(name)} ...`);
        const res = await fetchTimeout(url);
        tried.push(`${url} HTTP ${res.status}`);
        if(!res.ok) continue;

        const buf = await res.arrayBuffer();
        let text = '';
        try{ text = new TextDecoder('big5').decode(buf); }catch(e){}
        if(!text || text.includes('�')){
          try{ text = new TextDecoder('utf-8').decode(buf); }catch(e){}
        }
        if(text && text.trim()){
          loadLine(`已讀取 ${esc(name)} (${Math.round(buf.byteLength / 1024)} KB)`, 'ok');
          return { name, text, tried };
        }
      }catch(e){
        tried.push(`${url} ${e && e.name === 'AbortError' ? 'timeout' : (e && e.message || e)}`);
      }
    }
  }
  loadLine(`${esc(label)} 資料讀取失敗`, 'bad');
  return { missing: true, tried };
}

function parseIni(text){
  const data = [];
  let cur = null;
  function push(){
    if(cur && Object.keys(cur).length) data.push(cur);
    cur = null;
  }
  for(const raw of String(text || '').replace(/^\ufeff/, '').split(/\r?\n/)){
    const line = String(raw || '').trim();
    if(!line || line.startsWith('//') || line.startsWith(';')) continue;
    if(line.startsWith('[') && line.endsWith(']')){
      push();
      cur = {};
      continue;
    }
    const p = line.indexOf('=');
    if(p < 0) continue;
    const k = line.slice(0, p).trim();
    const v = line.slice(p + 1).trim();
    if(/^ID$/i.test(k) && cur && (cur.ID !== undefined || cur.Id !== undefined || cur.id !== undefined)) push();
    if(!cur) cur = {};
    cur[k] = v;
  }
  push();
  return data.filter(x => x && (x.ID !== undefined || x.Name !== undefined));
}

function parseCSVLine(line){
  const out = [];
  let val = '';
  let q = false;
  for(let i = 0; i < line.length; i++){
    const c = line[i];
    const n = line[i + 1];
    if(q){
      if(c === '"' && n === '"'){
        val += '"';
        i++;
      }else if(c === '"') q = false;
      else val += c;
    }else{
      if(c === '"') q = true;
      else if(c === ','){
        out.push(val);
        val = '';
      }else val += c;
    }
  }
  out.push(val);
  return out.map(x => String(x || '').trim());
}

function parseLocations(text){
  const map = {};
  for(const raw of String(text || '').replace(/^\ufeff/, '').split(/\r?\n/)){
    const line = raw.trim();
    if(!line || line.startsWith('//')) continue;
    let p = line.includes(',') ? parseCSVLine(line) : line.split(/\t+/).map(x => x.trim());
    p = p.filter(Boolean);
    if(p.length < 2) continue;
    const name = p[0];
    const loc = p.slice(1).join('、');
    if(!name || name === '怪物名稱' || name.toLowerCase() === 'name') continue;
    if(map[name] && !map[name].includes(loc)) map[name] += '、' + loc;
    else map[name] = loc;
  }
  return map;
}

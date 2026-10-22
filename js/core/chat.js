(function(){
  const launcher=document.createElement('button');
  launcher.type='button';launcher.className='szoChatLauncher';launcher.id='szoChatLauncher';
  launcher.setAttribute('aria-controls','szoChatPanel');launcher.setAttribute('aria-expanded','false');
  launcher.innerHTML='<span>即時聊天室</span><small>未連線</small>';
  const panel=document.createElement('section');
  panel.id='szoChatPanel';panel.className='szoChatPanel';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','即時聊天室');
  panel.innerHTML=`<header class="szoChatHeader"><h2>四海聊天室</h2><button type="button" data-chat-close>關閉</button></header>
    <div class="szoChatStatus" role="status" aria-live="polite">未連線</div>
    <p class="szoChatPrivacy">公開留言，暱稱未驗證。請勿張貼帳密、個資或交易付款資訊。</p>
    <ol class="szoChatMessages" aria-label="聊天訊息" data-empty="尚未連線"></ol>
    <div class="szoChatJoin"><div class="szoChatCaptcha" translate="no"></div><button type="button" data-chat-connect disabled>進入聊天室</button></div>
    <form class="szoChatComposer"><label>暱稱<input name="nickname" aria-label="暱稱" maxlength="20" autocomplete="nickname" required></label>
    <textarea name="message" aria-label="訊息" placeholder="寫下訊息…" maxlength="300" required disabled></textarea>
    <div class="szoChatSendRow"><small data-chat-length>0 / 300</small><button type="button" data-chat-send disabled>送出</button></div></form>`;
  document.body.append(launcher,panel);
  const $=selector=>panel.querySelector(selector);
  const status=$('.szoChatStatus'),log=$('.szoChatMessages'),join=$('[data-chat-connect]');
  const form=$('form'),nickname=form.elements.nickname,message=form.elements.message,send=$('[data-chat-send]');
  const rows=new Map();
  let config=null,client=null,channel=null,generation=0,connecting=false,connected=false,sending=false;
  let widget=null,captchaToken='',userId='',pending=null,cleanupTimer=null,captchaWaiting=false;
  const scripts=new Map();
  try{nickname.value=localStorage.getItem('szo.chat.nickname')||'';}catch(_error){}
  function say(text){status.textContent=text;}
  function fitViewport(){
    const viewport=window.visualViewport;
    if(!viewport)return;
    panel.style.setProperty('--chat-viewport-height',Math.max(160,viewport.height-24)+'px');
    panel.style.setProperty('--chat-viewport-bottom',Math.max(8,innerHeight-viewport.height-viewport.offsetTop+8)+'px');
    panel.classList.toggle('chatCompact',viewport.height<520);
  }
  window.visualViewport?.addEventListener('resize',fitViewport);
  window.visualViewport?.addEventListener('scroll',fitViewport);
  function controls(){message.disabled=!connected;send.disabled=!connected||sending;join.disabled=connecting||captchaWaiting||!config?.enabled;join.hidden=connected;}
  function offline(text){connected=false;launcher.querySelector('small').textContent='未連線';say(text);controls();}
  async function boundedFetch(url,options={}){
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
    const upstream=options.signal,relay=()=>abort.abort();
    upstream?.addEventListener('abort',relay,{once:true});
    if(upstream?.aborted)abort.abort();
    try{return await fetch(url,{...options,signal:abort.signal});}
    finally{clearTimeout(timer);upstream?.removeEventListener('abort',relay);}
  }
  function script(src){
    if(scripts.has(src))return scripts.get(src);
    const promise=new Promise((resolve,reject)=>{
      const node=document.createElement('script');node.src=src;node.async=true;
      const timer=setTimeout(()=>{node.remove();scripts.delete(src);reject(new Error('script_timeout'));},15000);
      node.onload=()=>{clearTimeout(timer);resolve();};
      node.onerror=()=>{clearTimeout(timer);node.remove();scripts.delete(src);reject(new Error('script_error'));};
      document.head.append(node);
    });
    scripts.set(src,promise);return promise;
  }
  function render(){
    const atBottom=log.scrollHeight-log.clientHeight-log.scrollTop<70;
    const cutoff=Date.now()-86400000;
    for(const [id,row] of rows)if(Date.parse(row.created_at)<cutoff)rows.delete(id);
    const ordered=[...rows.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
    while(ordered.length>200)rows.delete(ordered.shift().id);
    const fragment=document.createDocumentFragment();
    for(const row of ordered){
      const li=document.createElement('li');li.className='szoChatMessage';li.dataset.removed=String(!!row.is_removed);
      const header=document.createElement('header'),name=document.createElement('strong'),time=document.createElement('time'),body=document.createElement('p');
      name.setAttribute('translate','no');body.setAttribute('translate','no');
      name.textContent=String(row.nickname||'訪客')+' · '+String(row.user_id||'').slice(0,6);
      time.dateTime=row.created_at;time.textContent=new Date(row.created_at).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
      body.textContent=row.is_removed?'訊息已由站長移除':String(row.body||'');
      header.append(name,time);li.append(header,body);fragment.append(li);
    }
    log.replaceChildren(fragment);
    if(atBottom)log.scrollTop=log.scrollHeight;
  }
  function merge(row){
    if(!row?.id||!row.created_at)return;
    const old=rows.get(row.id);
    if(!old||String(row.updated_at||row.created_at)>=String(old.updated_at||old.created_at))rows.set(row.id,row);
  }
  function presence(active){
    if(!connected||channel!==active)return;
    const count=Object.keys(active.presenceState()).length;
    launcher.querySelector('small').textContent='在線 '+count;
    say('聊天室在線 '+count+' 人');
  }
  async function history(active,token){
    const result=await client.from('szo_chat_messages').select('id,user_id,nickname,body,created_at,updated_at,is_removed').gte('created_at',new Date(Date.now()-86400000).toISOString()).order('created_at',{ascending:false}).limit(100);
    if(token!==generation||channel!==active)return false;
    if(result.error)throw result.error;
    (result.data||[]).forEach(merge);render();return true;
  }
  async function closeConnection(){
    generation++;connecting=false;connected=false;sending=false;captchaWaiting=false;
    const old=channel;channel=null;
    clearInterval(cleanupTimer);cleanupTimer=null;
    if(widget!==null&&window.turnstile){window.turnstile.remove(widget);widget=null;captchaToken='';}
    client?.auth.stopAutoRefresh();
    offline('未連線');
    if(old){try{await client.removeChannel(old);}catch(_error){/* Already disconnected. */}}
  }
  async function prepare(){
    const token=generation;
    say('讀取聊天室設定…');join.disabled=true;
    try{
      const response=await boundedFetch('data/chat-config.json',{cache:'no-store'});
      if(!response.ok)throw new Error('config_error');
      const value=await response.json();
      if(token!==generation||panel.hidden)return;
      if(client&&config&&(config.url!==value.url||config.publishableKey!==value.publishableKey)){
        client.auth.stopAutoRefresh();client=null;rows.clear();render();
      }
      config=value;
      if(!config.enabled){offline('聊天室準備中，尚未開放連線。');log.dataset.empty='尚未開放';return;}
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url)||!config.publishableKey)throw new Error('config_error');
      say('尚未連線');controls();log.dataset.empty='尚未連線';
    }catch(_error){if(token===generation){config=null;offline('聊天室設定暫時無法讀取，請稍後重試。');join.disabled=false;}}
  }
  async function connect(){
    if(connecting||connected)return;
    if(!config){await prepare();return;}
    if(!config.enabled)return;
    const token=++generation;
    connecting=true;controls();say('連線中…');
    try{
      await script('js/vendor/supabase/supabase-2.118.0.js');
      if(token!==generation)return;
      if(!client)client=window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'szo-chat-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:boundedFetch}});
      client.auth.startAutoRefresh();
      const existing=await client.auth.getSession();
      if(existing.error)throw existing.error;
      if(token!==generation)return;
      let session=existing.data.session;
      if(!session&&config.turnstileSiteKey&&!captchaToken){
        await script('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
        if(token!==generation)return;
        captchaWaiting=true;
        if(widget===null)widget=window.turnstile.render($('.szoChatCaptcha'),{sitekey:config.turnstileSiteKey,theme:'auto',size:'flexible',callback:value=>{captchaToken=value;captchaWaiting=false;controls();say('驗證成功，請按「進入聊天室」。');},'expired-callback':()=>{captchaToken='';captchaWaiting=false;controls();say('驗證已過期，請重新驗證。');},'error-callback':code=>{captchaToken='';captchaWaiting=false;controls();say('人機驗證失敗（'+String(code).replace(/[^0-9]/g,'').slice(0,8)+'），請關閉聊天室後重試。');},'timeout-callback':()=>{captchaToken='';captchaWaiting=false;controls();say('人機驗證逾時，請關閉聊天室後重試。');}});
        else window.turnstile.reset(widget);
        say('請完成人機驗證，再按「進入聊天室」。');return;
      }
      if(!session){
        const result=await client.auth.signInAnonymously(captchaToken?{options:{captchaToken}}:{});
        if(token!==generation)return;
        if(result.error)throw result.error;
        session=result.data.session;
        if(widget!==null){window.turnstile.remove(widget);widget=null;captchaToken='';}
      }
      if(token!==generation)return;
      userId=session.user.id;
      await client.realtime.setAuth(session.access_token);
      if(token!==generation)return;
      const active=client.channel('szo-lobby',{config:{private:true,presence:{key:userId}}});channel=active;
      active.on('presence',{event:'sync'},()=>presence(active));
      active.on('postgres_changes',{event:'*',schema:'public',table:'szo_chat_messages'},event=>{
        if(token!==generation)return;
        if(event.eventType==='DELETE')rows.delete(event.old.id);else merge(event.new);
        render();
      });
      active.subscribe(async state=>{
        if(token!==generation)return;
        if(state==='SUBSCRIBED'){
          try{
            if(!await history(active,token))return;
            const tracked=await active.track({joined_at:new Date().toISOString()});
            if(token!==generation)return;
            if(tracked!=='ok')throw new Error('presence_error');
            connected=true;controls();log.dataset.empty='目前沒有留言';presence(active);
            clearInterval(cleanupTimer);cleanupTimer=setInterval(render,60000);
          }catch(_error){if(token===generation)offline('聊天室同步失敗，請重新連線。');}
        }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){
          offline('連線中斷，正在嘗試恢復。');
        }
      });
    }catch(error){
      if(token===generation){
        if(widget!==null&&window.turnstile){window.turnstile.remove(widget);widget=null;captchaToken='';}
        captchaWaiting=false;
        const code=String(error.code||error.name||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
        const detail=String(error.message||'');
        const failures={over_request_rate_limit:'連線太頻繁，請稍後再試。',over_request_rate_limit_anonymous:'匿名登入次數過多，請稍後再試。',anonymous_provider_disabled:'網站尚未開啟匿名登入。',captcha_failed:'人機驗證未通過，請重新驗證；若持續失敗，請站長確認 Turnstile 金鑰設定。'};
        let explanation=failures[code]||'無法連線，請重試並將此錯誤代碼提供給站長。';
        if(/sitekey-secret-mismatch|invalid-input-secret/.test(detail))explanation='網站的人機驗證金鑰不相符，請站長確認 Supabase 的 Secret Key 與網站 Site Key 屬於同一組。';
        offline(explanation+'（'+code+'）');
      }
    }finally{if(token===generation){connecting=false;controls();}}
  }
  join.addEventListener('click',async()=>{
    if(channel)await closeConnection();
    await connect();
  });
  launcher.addEventListener('click',()=>{
    panel.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');
    fitViewport();
    $('[data-chat-close]').focus();prepare();
  });
  function close(){panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');closeConnection();launcher.focus();}
  $('[data-chat-close]').addEventListener('click',close);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
  message.addEventListener('input',()=>{$('[data-chat-length]').textContent=Array.from(message.value).length+' / 300';});
  async function sendMessage(event){
    event.preventDefault();if(!connected||sending)return;
    const body=message.value.trim(),name=nickname.value.trim();
    if(!name||Array.from(name).length>20||!body||Array.from(body).length>300){say('請填寫暱稱與訊息（最多 300 字）。');return;}
    const token=generation;
    if(!pending||pending.body!==body||pending.name!==name)pending={id:crypto.randomUUID(),body,name};
    const attempt=pending;
    sending=true;controls();
    try{
      const result=await client.rpc('szo_send_chat',{p_id:attempt.id,p_nickname:name,p_body:body});
      if(token!==generation)return;
      if(result.error)throw result.error;
      merge(Array.isArray(result.data)?result.data[0]:result.data);render();
      if(message.value.trim()===body)message.value='';
      $('[data-chat-length]').textContent=Array.from(message.value).length+' / 300';
      pending=null;try{localStorage.setItem('szo.chat.nickname',name);}catch(_error){}
      presence(channel);message.focus();
    }catch(error){
      if(token!==generation)return;
      const known={CHAT_RATE_LIMIT:'發言太快，請隔 3 秒再送出。',CHAT_DAILY_LIMIT:'今日發言已達上限。',CHAT_BANNED:'此訪客已被限制發言。',CHAT_INVALID:'暱稱或訊息格式不符。'};
      say(known[error.message]||'送出結果尚未確認，可再按送出重試；不會重複刊登。');
    }finally{if(token===generation){sending=false;controls();}}
  }
  form.addEventListener('submit',sendMessage);
  send.addEventListener('click',sendMessage);
  window.addEventListener('offline',()=>{if(!panel.hidden)offline('網路已離線，訊息尚未送出。');});
  window.addEventListener('pagehide',()=>{closeConnection();});
})();

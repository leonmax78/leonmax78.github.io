const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {PGlite}=require(path.resolve(__dirname,'../../../research/web-vendors/pglite/package/dist/index.cjs'));
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema realtime;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function realtime.topic() returns text language sql as $$select current_setting('realtime.topic',true)$$;
   create table realtime.messages(extension text); alter table realtime.messages enable row level security;
   grant usage on schema auth,realtime to authenticated,anon;
   grant select,insert on realtime.messages to authenticated;
   create publication supabase_realtime;
   insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
  const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/chat.sql'),'utf8');
  await db.exec(sql);await db.exec(sql);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);`);
  const call=(id,body='測試')=>db.query('select (public.szo_send_chat($1,$2,$3)).*',[id,'玩家',body]);
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',second='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  assert.equal((await call(id)).rows[0].user_id,'11111111-1111-4111-8111-111111111111');
  assert.equal((await call(id)).rows[0].id,id);
  await assert.rejects(call(second),/CHAT_RATE_LIMIT/);
  await assert.rejects(db.exec(`insert into public.szo_chat_messages(id,user_id,nickname,body) values(gen_random_uuid(),'22222222-2222-4222-8222-222222222222','偽造','x')`),/permission denied/);
  await assert.rejects(db.exec(`update public.szo_chat_messages set body='edit'`),/permission denied/);
  await assert.rejects(call(second,'x'.repeat(301)),/CHAT_INVALID/);
  await db.exec(`reset role; update public.szo_chat_messages set created_at=now()-interval '4 seconds'; set role authenticated;`);
  await call(second);
  await db.exec(`reset role; update public.szo_chat_messages set is_removed=true where id='${id}'; set role authenticated;`);
  assert.equal((await db.query('select body from public.szo_chat_messages where id=$1',[id])).rows[0].body,'');
  await db.exec(`reset role; insert into public.szo_chat_bans(user_id) values('11111111-1111-4111-8111-111111111111'); set role authenticated;`);
  await assert.rejects(call('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),/CHAT_BANNED/);
  await db.exec(`reset role; update public.szo_chat_messages set created_at=now()-interval '2 days'; set role authenticated;`);
  assert.equal((await db.query('select * from public.szo_chat_messages')).rows.length,0);
  await db.exec(`reset role; set role anon;`);
  await assert.rejects(call(second),/permission denied/);
  await assert.rejects(db.query('select * from public.szo_chat_messages'),/permission denied/);
  console.log('PASS: SQL migration twice; RLS, server identity, cooldown, retry deduplication, validation, moderation, bans, history cutoff, anonymous denial.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

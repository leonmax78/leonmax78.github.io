-- 聊天室保留 14 天（2026-11-14）
-- 在 Supabase Dashboard → SQL Editor 貼上全部後按 Run。可重複執行。
-- 1) 讀取權限：原本只開放最近 24 小時，改為 14 天
drop policy if exists szo_chat_read on public.szo_chat_messages;
create policy szo_chat_read on public.szo_chat_messages for select to authenticated
  using (created_at >= now() - interval '14 days');

-- 2) 自動清除：原本刪除 7 天前的訊息，改為 14 天前
select cron.unschedule('szo-chat-retention')
  where exists (select 1 from cron.job where jobname = 'szo-chat-retention');
select cron.schedule(
  'szo-chat-retention',
  '17 * * * *',
  $$delete from public.szo_chat_messages where created_at < now() - interval '14 days'$$
);

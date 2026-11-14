-- Enable the Supabase Cron (pg_cron) integration in the Dashboard first.
-- Keep 14 days of chat history; users can read all of it (see chat-14-days.sql).
select cron.schedule(
  'szo-chat-retention',
  '17 * * * *',
  $$delete from public.szo_chat_messages where created_at < now() - interval '14 days'$$
);

-- Enable the Supabase Cron (pg_cron) integration in the Dashboard first.
-- Keep at most seven days of chat history. Users can read only the last 24 hours.
select cron.schedule(
  'szo-chat-retention',
  '17 * * * *',
  $$delete from public.szo_chat_messages where created_at < now() - interval '7 days'$$
);

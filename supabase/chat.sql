-- Run once in the SQL Editor of a dedicated Supabase project.
begin;

create table if not exists public.szo_chat_messages (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  body text not null check (char_length(body) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_removed boolean not null default false
);
create index if not exists szo_chat_recent on public.szo_chat_messages(created_at desc);
create index if not exists szo_chat_user_recent on public.szo_chat_messages(user_id,created_at desc);

create table if not exists public.szo_chat_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.szo_chat_messages enable row level security;
alter table public.szo_chat_bans enable row level security;
revoke all on public.szo_chat_messages from anon, authenticated;
revoke all on public.szo_chat_bans from anon, authenticated;
grant select on public.szo_chat_messages to authenticated;
drop policy if exists szo_chat_read on public.szo_chat_messages;
create policy szo_chat_read on public.szo_chat_messages for select to authenticated
  using (created_at >= now() - interval '24 hours');

-- All writes go through this function. Browser-side restrictions are not security.
create or replace function public.szo_send_chat(p_id uuid, p_nickname text, p_body text)
returns public.szo_chat_messages
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result public.szo_chat_messages;
  clean_name text := btrim(p_nickname);
  clean_body text := btrim(p_body);
begin
  if uid is null then raise exception 'CHAT_AUTH_REQUIRED'; end if;
  if p_id is null or clean_name is null or clean_body is null
     or char_length(clean_name) not between 1 and 20
     or char_length(clean_body) not between 1 and 300
     or clean_name ~ '[[:cntrl:]]'
  then raise exception 'CHAT_INVALID'; end if;
  -- Serialize requests from the same identity, including requests from two tabs.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'CHAT_BANNED'; end if;
  select * into result from public.szo_chat_messages where id = p_id and user_id = uid;
  if found then return result; end if;
  if exists(select 1 from public.szo_chat_messages where user_id = uid and created_at > clock_timestamp() - interval '3 seconds')
  then raise exception 'CHAT_RATE_LIMIT'; end if;
  if (select count(*) from public.szo_chat_messages where user_id = uid and created_at > clock_timestamp() - interval '24 hours') >= 200
  then raise exception 'CHAT_DAILY_LIMIT'; end if;
  insert into public.szo_chat_messages(id,user_id,nickname,body,created_at,updated_at)
    values(p_id,uid,clean_name,clean_body,clock_timestamp(),clock_timestamp()) returning * into result;
  return result;
end;
$$;
revoke all on function public.szo_send_chat(uuid,text,text) from public, anon;
grant execute on function public.szo_send_chat(uuid,text,text) to authenticated;

-- Soft removal is broadcast as an UPDATE; the original text is erased.
create or replace function public.szo_chat_moderation()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if new.is_removed then new.body := ''; end if;
  return new;
end;
$$;
revoke all on function public.szo_chat_moderation() from public, anon, authenticated;
drop trigger if exists szo_chat_moderation on public.szo_chat_messages;
create trigger szo_chat_moderation before update on public.szo_chat_messages
  for each row execute function public.szo_chat_moderation();

-- The realtime schema already has RLS enabled. Do not ALTER its tables.
drop policy if exists szo_chat_presence_read on realtime.messages;
create policy szo_chat_presence_read on realtime.messages for select to authenticated
  using ((select realtime.topic()) = 'szo-lobby' and extension = 'presence');
drop policy if exists szo_chat_presence_write on realtime.messages;
create policy szo_chat_presence_write on realtime.messages for insert to authenticated
  with check ((select realtime.topic()) = 'szo-lobby' and extension = 'presence');

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='szo_chat_messages') then
    alter publication supabase_realtime add table public.szo_chat_messages;
  end if;
end;
$$;
commit;

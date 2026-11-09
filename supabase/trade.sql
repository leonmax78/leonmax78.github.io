-- 玩家交易版。請在聊天室所用的同一個 Supabase 專案 SQL Editor 執行一次。
-- 需要先執行過 supabase/chat.sql（共用 szo_chat_bans 停權名單與匿名登入設定）。
-- 貼文不會自動下架：由發文者在同一瀏覽器標記成交或刪除，或由站長在後台處理。
-- 每篇最多 3 張圖片，存放在公開的 Storage bucket「trade-images」，路徑為「使用者ID/檔名」。
begin;

create table if not exists public.szo_trade_posts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sell','buy')),
  title text not null check (char_length(title) between 1 and 40),
  price text not null check (char_length(price) between 1 and 40),
  contact text not null check (char_length(contact) between 1 and 30),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_removed boolean not null default false,
  images text[] not null default '{}' check (cardinality(images) <= 3)
);
alter table public.szo_trade_posts add column if not exists images text[] not null default '{}';
create index if not exists szo_trade_recent on public.szo_trade_posts(created_at desc) where not is_removed;
create index if not exists szo_trade_user_recent on public.szo_trade_posts(user_id, created_at desc);

alter table public.szo_trade_posts enable row level security;
revoke all on public.szo_trade_posts from anon, authenticated;
-- 瀏覽不需要登入；只看得到未刪除的貼文。
grant select on public.szo_trade_posts to anon, authenticated;
drop policy if exists szo_trade_read on public.szo_trade_posts;
create policy szo_trade_read on public.szo_trade_posts for select to anon, authenticated
  using (not is_removed);

-- 所有寫入都必須透過以下函式。瀏覽器端的檢查不算安全措施。
drop function if exists public.szo_create_trade_post(uuid,text,text,text,text,text);
create or replace function public.szo_create_trade_post(
  p_id uuid, p_kind text, p_title text, p_price text, p_contact text, p_note text, p_images text[])
returns public.szo_trade_posts
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result public.szo_trade_posts;
  clean_title text := btrim(p_title);
  clean_price text := btrim(p_price);
  clean_contact text := btrim(p_contact);
  clean_note text := btrim(coalesce(p_note, ''));
  clean_images text[] := coalesce(p_images, '{}');
  image_path text;
begin
  if uid is null then raise exception 'TRADE_AUTH_REQUIRED'; end if;
  if p_id is null or p_kind is null or p_kind not in ('sell','buy')
     or clean_title is null or char_length(clean_title) not between 1 and 40
     or clean_price is null or char_length(clean_price) not between 1 and 40
     or clean_contact is null or char_length(clean_contact) not between 1 and 30
     or char_length(clean_note) > 300
     or clean_title ~ '[[:cntrl:]]' or clean_price ~ '[[:cntrl:]]' or clean_contact ~ '[[:cntrl:]]'
  then raise exception 'TRADE_INVALID'; end if;
  -- 圖片只能是自己資料夾下、由網站產生格式的檔名。
  if cardinality(clean_images) > 3 then raise exception 'TRADE_INVALID'; end if;
  foreach image_path in array clean_images loop
    if image_path !~ ('^' || uid::text || '/[0-9a-f-]{36}-[0-9]\.(webp|jpg)$') then raise exception 'TRADE_INVALID'; end if;
  end loop;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('trade:' || uid::text, 0));
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'TRADE_BANNED'; end if;
  -- 重送同一筆（網路逾時重試）時直接回傳，不重複刊登。
  select * into result from public.szo_trade_posts where id = p_id and user_id = uid;
  if found then return result; end if;
  if exists(select 1 from public.szo_trade_posts where user_id = uid and created_at > clock_timestamp() - interval '60 seconds')
  then raise exception 'TRADE_RATE_LIMIT'; end if;
  if (select count(*) from public.szo_trade_posts where user_id = uid and created_at > clock_timestamp() - interval '24 hours') >= 10
  then raise exception 'TRADE_DAILY_LIMIT'; end if;
  insert into public.szo_trade_posts(id, user_id, kind, title, price, contact, note, images, created_at, updated_at)
    values(p_id, uid, p_kind, clean_title, clean_price, clean_contact, clean_note, clean_images, clock_timestamp(), clock_timestamp())
    returning * into result;
  return result;
end;
$$;
revoke all on function public.szo_create_trade_post(uuid,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.szo_create_trade_post(uuid,text,text,text,text,text,text[]) to authenticated;

-- 發文者本人：標記已成交 / 重新上架。
create or replace function public.szo_set_trade_post_status(p_id uuid, p_status text)
returns public.szo_trade_posts
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result public.szo_trade_posts;
begin
  if uid is null then raise exception 'TRADE_AUTH_REQUIRED'; end if;
  if p_status is null or p_status not in ('open','done') then raise exception 'TRADE_INVALID'; end if;
  update public.szo_trade_posts set status = p_status, updated_at = clock_timestamp()
    where id = p_id and user_id = uid and not is_removed
    returning * into result;
  if not found then raise exception 'TRADE_NOT_OWNER'; end if;
  return result;
end;
$$;
revoke all on function public.szo_set_trade_post_status(uuid,text) from public, anon;
grant execute on function public.szo_set_trade_post_status(uuid,text) to authenticated;

-- 發文者本人：刪除（隱藏）貼文。站長可在 Table Editor 將 is_removed 設為 true，或直接刪除該列。
create or replace function public.szo_remove_trade_post(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'TRADE_AUTH_REQUIRED'; end if;
  update public.szo_trade_posts set is_removed = true, updated_at = clock_timestamp()
    where id = p_id and user_id = uid and not is_removed;
  if not found then raise exception 'TRADE_NOT_OWNER'; end if;
end;
$$;
revoke all on function public.szo_remove_trade_post(uuid) from public, anon;
grant execute on function public.szo_remove_trade_post(uuid) to authenticated;

-- 圖片 Storage：公開讀取（看圖不用登入）；單檔上限 1 MB，只接受 webp / jpeg。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('trade-images', 'trade-images', true, 1048576, array['image/webp','image/jpeg'])
  on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp','image/jpeg'];

-- 只能上傳到自己的資料夾；被停權者不能上傳。
drop policy if exists szo_trade_images_insert on storage.objects;
create policy szo_trade_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists(select 1 from public.szo_chat_bans b where b.user_id = (select auth.uid()))
  );
-- 重新送出同一張圖時允許覆蓋自己的檔案。
drop policy if exists szo_trade_images_update on storage.objects;
create policy szo_trade_images_update on storage.objects for update to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists szo_trade_images_select_own on storage.objects;
create policy szo_trade_images_select_own on storage.objects for select to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- 刪除貼文時，發文者可刪除自己的圖片。站長可在 Storage 頁面直接刪除任何圖片。
drop policy if exists szo_trade_images_delete on storage.objects;
create policy szo_trade_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

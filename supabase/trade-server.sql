-- 玩家交易區：新增「伺服器」欄位（北斗、文昌、祿存）。請在 SQL Editor 執行一次。
-- 舊版函式（沒有伺服器參數）保留，網站更新前後都能正常刊登。
begin;

-- 伺服器欄位（北斗、文昌、祿存）。舊貼文沒有伺服器，顯示時略過。
alter table public.szo_trade_posts add column if not exists server text;
alter table public.szo_trade_posts drop constraint if exists szo_trade_posts_server_check;
alter table public.szo_trade_posts add constraint szo_trade_posts_server_check
  check (server is null or server in ('北斗','文昌','祿存'));

-- 刊登（含伺服器）。
create or replace function public.szo_create_trade_post(
  p_id uuid, p_kind text, p_server text, p_title text, p_price text, p_contact text, p_note text, p_images text[])
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
     or p_server is null or p_server not in ('北斗','文昌','祿存')
     or clean_title is null or char_length(clean_title) not between 1 and 40
     or clean_price is null or char_length(clean_price) not between 1 and 40
     or clean_contact is null or char_length(clean_contact) not between 1 and 30
     or char_length(clean_note) > 300
     or clean_title ~ '[[:cntrl:]]' or clean_price ~ '[[:cntrl:]]' or clean_contact ~ '[[:cntrl:]]'
  then raise exception 'TRADE_INVALID'; end if;
  if cardinality(clean_images) > 3 then raise exception 'TRADE_INVALID'; end if;
  foreach image_path in array clean_images loop
    if image_path !~ ('^' || uid::text || '/[0-9a-f-]{36}-[0-9]\.(webp|jpg)$') then raise exception 'TRADE_INVALID'; end if;
  end loop;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('trade:' || uid::text, 0));
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'TRADE_BANNED'; end if;
  select * into result from public.szo_trade_posts where id = p_id and user_id = uid;
  if found then return result; end if;
  if exists(select 1 from public.szo_trade_posts where user_id = uid and created_at > clock_timestamp() - interval '60 seconds')
  then raise exception 'TRADE_RATE_LIMIT'; end if;
  if (select count(*) from public.szo_trade_posts where user_id = uid and created_at > clock_timestamp() - interval '24 hours') >= 10
  then raise exception 'TRADE_DAILY_LIMIT'; end if;
  insert into public.szo_trade_posts(id, user_id, kind, server, title, price, contact, note, images, created_at, updated_at)
    values(p_id, uid, p_kind, p_server, clean_title, clean_price, clean_contact, clean_note, clean_images, clock_timestamp(), clock_timestamp())
    returning * into result;
  return result;
end;
$$;
revoke all on function public.szo_create_trade_post(uuid,text,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.szo_create_trade_post(uuid,text,text,text,text,text,text,text[]) to authenticated;

-- 編輯（含伺服器）。
create or replace function public.szo_update_trade_post(
  p_id uuid, p_kind text, p_server text, p_title text, p_price text, p_contact text, p_note text, p_images text[])
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
     or p_server is null or p_server not in ('北斗','文昌','祿存')
     or clean_title is null or char_length(clean_title) not between 1 and 40
     or clean_price is null or char_length(clean_price) not between 1 and 40
     or clean_contact is null or char_length(clean_contact) not between 1 and 30
     or char_length(clean_note) > 300
     or clean_title ~ '[[:cntrl:]]' or clean_price ~ '[[:cntrl:]]' or clean_contact ~ '[[:cntrl:]]'
  then raise exception 'TRADE_INVALID'; end if;
  if cardinality(clean_images) > 3 then raise exception 'TRADE_INVALID'; end if;
  foreach image_path in array clean_images loop
    if image_path !~ ('^' || uid::text || '/[0-9a-f-]{36}-[0-9]\.(webp|jpg)$') then raise exception 'TRADE_INVALID'; end if;
  end loop;
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'TRADE_BANNED'; end if;
  update public.szo_trade_posts
    set kind = p_kind, server = p_server, title = clean_title, price = clean_price, contact = clean_contact,
        note = clean_note, images = clean_images, updated_at = clock_timestamp(), edited_at = clock_timestamp()
    where id = p_id and user_id = uid and not is_removed
    returning * into result;
  if not found then raise exception 'TRADE_NOT_OWNER'; end if;
  return result;
end;
$$;
revoke all on function public.szo_update_trade_post(uuid,text,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.szo_update_trade_post(uuid,text,text,text,text,text,text,text[]) to authenticated;


commit;

notify pgrst, 'reload schema';

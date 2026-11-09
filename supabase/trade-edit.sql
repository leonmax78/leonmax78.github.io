-- 玩家交易區：新增「編輯貼文」功能。已執行過 trade.sql 的專案，只要在 SQL Editor 執行這個檔案一次。
begin;

alter table public.szo_trade_posts add column if not exists edited_at timestamptz;

-- 發文者本人：編輯貼文內容（類型、標題、價格、飛鴿 ID、說明、圖片）。
create or replace function public.szo_update_trade_post(
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
  if cardinality(clean_images) > 3 then raise exception 'TRADE_INVALID'; end if;
  foreach image_path in array clean_images loop
    if image_path !~ ('^' || uid::text || '/[0-9a-f-]{36}-[0-9]\.(webp|jpg)$') then raise exception 'TRADE_INVALID'; end if;
  end loop;
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'TRADE_BANNED'; end if;
  update public.szo_trade_posts
    set kind = p_kind, title = clean_title, price = clean_price, contact = clean_contact,
        note = clean_note, images = clean_images, updated_at = clock_timestamp(), edited_at = clock_timestamp()
    where id = p_id and user_id = uid and not is_removed
    returning * into result;
  if not found then raise exception 'TRADE_NOT_OWNER'; end if;
  return result;
end;
$$;
revoke all on function public.szo_update_trade_post(uuid,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.szo_update_trade_post(uuid,text,text,text,text,text,text[]) to authenticated;

commit;

-- 讓 API 立即讀到新欄位與新函式。
notify pgrst, 'reload schema';

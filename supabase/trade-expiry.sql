-- 玩家交易區：貼文 14 天後自動下架，發文者可手動延長。請在 SQL Editor 執行一次。
-- 現有貼文會從執行這份 SQL 的時間起算 14 天。
begin;

-- 貼文最多顯示 14 天；發文者可隨時按「延長」重新計算 14 天。
-- 過期貼文只有發文者本人看得到（可延長或刪除），其他人看不到。
alter table public.szo_trade_posts add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

drop policy if exists szo_trade_read on public.szo_trade_posts;
create policy szo_trade_read on public.szo_trade_posts for select to anon, authenticated
  using (not is_removed and (expires_at > now() or user_id = (select auth.uid())));

-- 發文者本人：延長 14 天（從現在起算）。
create or replace function public.szo_extend_trade_post(p_id uuid)
returns public.szo_trade_posts
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result public.szo_trade_posts;
begin
  if uid is null then raise exception 'TRADE_AUTH_REQUIRED'; end if;
  if exists(select 1 from public.szo_chat_bans b where b.user_id = uid)
  then raise exception 'TRADE_BANNED'; end if;
  update public.szo_trade_posts
    set expires_at = clock_timestamp() + interval '14 days', updated_at = clock_timestamp()
    where id = p_id and user_id = uid and not is_removed
    returning * into result;
  if not found then raise exception 'TRADE_NOT_OWNER'; end if;
  return result;
end;
$$;
revoke all on function public.szo_extend_trade_post(uuid) from public, anon;
grant execute on function public.szo_extend_trade_post(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';

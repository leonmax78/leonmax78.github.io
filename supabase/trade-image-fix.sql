-- 修正：交易區圖片上傳失敗（上傳規則讀不到停權名單）。請在 SQL Editor 執行一次。
begin;

-- 停權名單對一般使用者不開放讀取，所以由這個函式代為檢查。
create or replace function public.szo_trade_upload_allowed()
returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and not exists(select 1 from public.szo_chat_bans b where b.user_id = auth.uid());
$$;
revoke all on function public.szo_trade_upload_allowed() from public, anon;
grant execute on function public.szo_trade_upload_allowed() to authenticated;

-- 只能上傳到自己的資料夾；被停權者不能上傳。
drop policy if exists szo_trade_images_insert on storage.objects;
create policy szo_trade_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.szo_trade_upload_allowed())
  );

commit;

-- 修正：交易區圖片上傳失敗（permission denied for table szo_chat_bans）。請在 SQL Editor 執行一次。
-- 上傳規則不再查停權名單；被停權者仍無法刊登（刊登函式會擋），只是圖片傳得上去但不會出現在任何貼文。
begin;

drop policy if exists szo_trade_images_insert on storage.objects;
create policy szo_trade_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop function if exists public.szo_trade_upload_allowed();

commit;

-- 讓 API 立即讀到新欄位（edited_at）。
notify pgrst, 'reload schema';

-- 執行後下方應列出 4 條 szo_trade_images_* 規則，且沒有任何一條提到 szo_chat_bans。
select policyname, cmd, coalesce(qual, '') || ' ' || coalesce(with_check, '') as rule
from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

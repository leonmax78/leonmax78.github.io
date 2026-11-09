# 玩家交易區：Supabase 設定

交易區與四海聊天室共用同一個 Supabase 專案、匿名登入、Turnstile 人機驗證與停權名單（`szo_chat_bans`）。
網站設定沿用 `data/chat-config.json`，不需要另外新增金鑰。

## 建立資料表（只需執行一次）

1. 開啟聊天室所用的 Supabase 專案 → 左側 **SQL Editor** → **New query**。
2. 貼上本專案 `supabase/trade.sql` 的全部內容並執行，確認沒有錯誤。
3. 會建立：
   - `szo_trade_posts` 資料表（RLS：任何人可讀未刪除的貼文；不開放直接寫入）
   - `szo_create_trade_post`：刊登（1 分鐘 1 篇、24 小時 10 篇、檢查停權名單、重送不重複刊登）
   - `szo_update_trade_post`：發文者本人編輯內容與圖片（貼文會顯示「已編輯」）
   - `szo_set_trade_post_status`：發文者本人標記已成交／重新上架
   - `szo_remove_trade_post`：發文者本人刪除
   - Storage bucket `trade-images`：公開讀取，單檔 1 MB，只接受 webp／jpeg；只能上傳到自己的資料夾（被停權者無法刊登）

## 已建立過交易區的專案

只要在 SQL Editor 執行 `supabase/trade-edit.sql` 一次，即可開啟「編輯貼文」功能。

## 規則

- 欄位：類型（販賣／收購）、標題（40 字）、價格（40 字）、飛鴿 ID（30 字）、補充說明（選填，300 字）、圖片（選填，最多 3 張）。
- 圖片在瀏覽器先壓縮為最長邊 1280px 的 WebP（不支援時 JPEG），可選檔或 Ctrl+V 貼上截圖。發文者刪除貼文時圖片一併刪除。
- 瀏覽不需登入；刊登前需通過人機驗證，取得與聊天室相同的匿名身分。
- **不會自動下架。** 發文者只能在同一個瀏覽器編輯或管理自己的貼文（清除瀏覽器資料後就無法再管理舊貼文）。

## 站長管理

- **刪除貼文**：Table Editor → `szo_trade_posts` → 將該列 `is_removed` 改為 `true`（隱藏，保留紀錄），或直接刪除該列。
- **刪除圖片**：Storage → `trade-images` → 依 `user_id` 資料夾找到檔案刪除（貼文中的 `images` 欄位列出檔名）。若要整篇處理，建議先把貼文 `is_removed` 設為 `true`，再刪除圖片。
- **用量**：Dashboard → Usage 查看 Storage 空間與流量；免費方案有上限，接近上限時可清除舊圖片。
- **停權**：把該貼文的 `user_id` 加入 `szo_chat_bans`（聊天室與交易區同時停權）。
- **調整頻率限制**：修改 `supabase/trade.sql` 中 `60 seconds` 與 `>= 10`，重新執行函式定義即可。

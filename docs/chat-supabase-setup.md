# 四海聊天室：Supabase 設定

目前設定為 `enabled: false`，不會建立連線、產生假訊息或顯示假的在線人數。
先建立免費專案，設定完成並用兩個獨立瀏覽器測試後再開放。

## 費用（2026-10-22 查核）

- Free：US$0／月、200 個同時連線、每月 200 萬次 Realtime 訊息、500 MB 資料庫。
- 廣播與 Presence 也消耗即時額度，不是「200 萬則留言」。多人接收同一則訊息會增加用量。
- 免費專案閒置一週可能暫停；額度不是無上限，請查看 Dashboard 的 Usage。
- Pro 為 US$25／月起，另有使用量計費；不需要為了測試主動升級。
- 免費方案不保證所有地區的連線品質，尤其請實測大陸玩家的網路。

來源：[價格](https://supabase.com/pricing)、[Realtime 計價](https://supabase.com/docs/guides/realtime/pricing)。

## 1. 建立專案

1. 開啟 https://supabase.com/dashboard ，可以使用 GitHub 登入。
2. 建立 Free 組織，確認畫面顯示 Free，不選 Pro、不啟用付費附加服務。
3. New project：名稱可填 `sihai-chat`，區域選靠近主要玩家的亞洲區域。
4. 自訂資料庫密碼並保存在自己的密碼管理器。不要把資料庫密碼傳給別人或貼在網站。
5. 等待專案初始化完成。

## 2. 建立資料表與權限

1. 專案左側 SQL Editor → New query。
2. 執行本專案的 `supabase/chat.sql` 全部內容。
3. 確認沒有錯誤。它會建立訊息表、停權表、RLS、發言函式及 Realtime 訂閱。
4. 不要另開公開 INSERT／UPDATE／DELETE 權限。瀏覽器只能透過受限制的函式發言。

## 3. 啟用匿名登入與防機器人

1. Authentication 設定中啟用 **Anonymous Sign-Ins**。這不是把資料庫開放給 `anon` 角色；登入後仍會取得受限的 `authenticated` 身分。
2. URL Configuration 的 Site URL 設為 `https://leonmax78.github.io`。
3. 公開上線前建議啟用 Cloudflare Turnstile，避免機器人大量建立匿名帳號。
4. 在 Cloudflare Turnstile 建立網站，允許 `leonmax78.github.io`，取得 Site key 與 Secret key。
5. **Secret key 只填在 Supabase Authentication → Bot and Abuse Protection → CAPTCHA → Turnstile**。不要放在 GitHub。
6. Site key 是公開值，可填入下面的 `turnstileSiteKey`。先做私人測試時可以留空，但公開前應完成 CAPTCHA。
7. Supabase Realtime Settings 可關閉 Allow public access；聊天室已使用 private channel。

來源：[匿名登入](https://supabase.com/docs/guides/auth/auth-anonymous)、[CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)、[Realtime 權限](https://supabase.com/docs/guides/realtime/authorization)。

## 4. 填寫網站設定

從專案的 Connect 或 Project Settings／API 找到：

- Project URL：例如 `https://xxxxxxxx.supabase.co`
- **Publishable key**（`sb_publishable_...`），舊專案可使用 `anon` public key。
- 絕對不要使用 `service_role`、`sb_secret_...`、JWT secret、資料庫密碼。

修改 `data/chat-config.json`：

```json
{
  "enabled": true,
  "url": "https://你的專案代號.supabase.co",
  "publishableKey": "你的公開金鑰",
  "turnstileSiteKey": "你的Turnstile公開SiteKey"
}
```

若由我協助設定，只需要提供 **Project URL、Publishable key、Turnstile Site key**。
公開金鑰不是管理權限，真正的權限由 SQL／RLS 保護。

## 5. 自動清理與站長管理

在 Supabase Integrations 啟用 **Cron / pg_cron**，再執行 `supabase/chat-retention.sql`。
每小時清除七天前的訊息；網站只顯示最近 24 小時、最近 100 則，連線中的清單最多保留 200 則。
確認 Cron 工作成功，否則舊資料會持續占空間。

在 Table Editor 的 `szo_chat_messages` 可以管理訊息：

- 將 `is_removed` 設成 `true`：清除內容，已連線玩家也會看到「已由站長移除」。
- 複製該則留言的 `user_id`，新增到 `szo_chat_bans`：禁止該匿名身分繼續發言。
- 停權不能阻止對方清除瀏覽器資料重建身分，不等同遊戲帳號封鎖。
- 每個身分 3 秒一則、24 小時最多 200 則，由伺服器強制執行。
- 本版沒有管理員網頁登入；管理操作只在 Supabase Dashboard 進行。
- 匿名 Auth 使用者也會累積。定期檢查 Auth Usage，依 Supabase 匿名登入文件清理長期不用的身分；刪除使用者會一起刪除其留言與停權紀錄，勿隨意大量刪除。

## 6. 開放前驗收

1. 用一般視窗與無痕視窗（或手機）各進入一次：兩邊應即時互見訊息。
2. 同一個瀏覽器多分頁可能共用匿名身分，在線人數以 Presence 身分估算，不是全站瀏覽人數。
3. 關閉聊天室會離開連線，尚未開啟聊天室的訪客不會被計入。
4. 快速連按送出應被限制；斷網時不可假裝送出成功，重新連線後應補讀紀錄。
5. 送出 `<img src=x onerror=alert(1)>` 應只顯示文字，不執行程式。
6. 移除一則留言、封鎖一個測試身分，確認兩端更新與禁止發言。
7. 手機鍵盤開啟時確認輸入框與送出按鈕可見。
8. 確認 Dashboard Usage、Cron，以及 CAPTCHA；完成後才正式通知玩家使用。

## 暫停聊天室

將 `enabled` 改回 `false` 並上傳。新開啟的聊天室會停止登入；既有連線不會立刻被網站設定踢除。
如需緊急停止所有發言，在 SQL Editor 執行：

```sql
revoke execute on function public.szo_send_chat(uuid,text,text) from authenticated;
```

恢復前確認問題已排除，再授予同一個函式的 execute 權限。

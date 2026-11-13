# 兌換查詢資料

1. 解出遊戲 SETTING（`tools/npc_shop_dialogs.py` 的 `extract_install`），設定 `SZO_SETTING=<解出的 SETTING 資料夾>`。
2. `python3 tools/exchange/build_ex.py ex_rows.json` — 兌換視窗（EXCHANGE.INI，對話動作 109 開啟）＋ 對話兌換（交出 37 → 獲得）。
3. `python3 tools/exchange/ex_xlsx.py ex_rows.json 兌換清單.xlsx [上一版確認表.xlsx]` — 產生確認表，沿用上一版的保留／類別／資料片／備註。
4. `python3 tools/exchange/export_ex.py ex_rows.json <站長確認後的表.xlsx> data/exchanges.json` — 只輸出保留 ✓ 的列。

`map_group.json` 是由 `data/map-taxonomy.js` 匯出的地圖 → 資料片對照。

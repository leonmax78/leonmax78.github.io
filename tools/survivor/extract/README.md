# 神州倖存者素材轉出工具

這些腳本把遊戲原始檔轉成 `games/sv/` 底下的素材，需要本機有遊戲的 pak／拆包資料與 szo_tool（路徑寫在 `lib.py`、`maplib.py`、`rendermap.py` 開頭，換環境要改）。

- `chars.py`：一轉男女職業（data2 `shape/char1n/p1`～`pa`）的待機、走路、施法動畫 → `char_*.webp`、`char.json`
- `fx.py`：36 個技能的特效圖 → `fx/*.webp`、`fx.json`（之後另外做了去黑邊處理）
- `rendermap.py`：用地面磚（.mpc＋圖磚）加上地圖物件（DATA5 `shape/stage`）畫出 1:1 地圖，再裁中央 4096×3072、切成 512px 圖塊 → `map/<stageId>/`
- 音樂 `music/ad.ogg`（三張霹靂地圖在 STAGE.INI 指定的曲子）與技能音效（sound.pak 的 `magi_000NN`／`magiceffect_NNN`）→ `snd/`

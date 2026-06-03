# 武冠收錄資料更新流程

## 順序原則

- `data/collectbook_sources.json` 不用名稱排序。
- 武防、法器、配方照「收納清單 Excel」前三張工作表的列順序輸出。
- 武防分類照 Excel 後方分類分頁判斷，例如劍、刀、盾、帽子。
- 封獸照「封獸捕捉位置」工作表列順序輸出。
- 官方如果把新武冠資料補在最後面，重跑產生器後，新資料會自然留在最後面，不會打亂既有順序。

## 更新步驟

1. 把新的 `COLLECTBOOKITEM.INI`、`ITEM.INI`、`MONSTER_C.INI` 放到 `Desktop\0525\SETTING`。
2. 把新的武冠收納 Excel 和商店購買 Excel 放到桌面。
3. 雙擊專案根目錄的 `build_collectbook_sources.bat`。
4. 開啟離線版網站，進入「武冠收錄資料」確認新資料。

## 產生器

主要工具是：

```bat
build_collectbook_sources.bat
```

實際執行：

```bat
tools\build_collectbook_sources.py
```

如果檔名改很多，也可以手動指定來源：

```bat
python tools\build_collectbook_sources.py --collect-workbook "C:\path\collect.xlsx" --shop-workbook "C:\path\shop.xlsx" --setting-dir "C:\path\SETTING"
```

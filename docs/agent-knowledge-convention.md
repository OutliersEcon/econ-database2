# Agent knowledge convention（代理知識檔慣例）

靈感：將短知識檔 **與程式模組放在一起**，避免所有說明堆在根目錄 `docs/`，導致代理每次全庫搜尋。人讀的長文仍可留在 `docs/`；代理交接用 `*.kb.md`。

## 命名

| 模式 | 用途 |
| --- | --- |
| `js/<module>.kb.md` | 對應 `js/<module>.js`（或緊密模組簇的代表檔） |
| `apps-script/Code.kb.md` | 對應 `Code.gs` |
| `apps-script/AGENTS.md` | 目錄級入口 |
| 根 `AGENTS.md` | **全庫地圖 only**（約 80–120 行） |

不要把百科寫進根 `AGENTS.md`。

## 每個 `.kb.md` 建議章節

1. **流程** — mermaid 或簡短步驟  
2. **架構取捨／決策** — 表格：選項／選擇／原因  
3. **修改史（決策型）** — 只記「為何改方向」，不是 git log  
4. **待辦**  
5. **文字版 E2E 測試描述** — 幾句話讓代理可照著手動驗  

目標：**可掃讀**，通常 &lt;200 行。不確定就寫「待核實」，勿臆造。

## 何時更新

- **改了模組行為或契約** → 同一 PR 更新其 `.kb.md`  
- **新模組** → 新增 `.kb.md` 並掛到根 [`AGENTS.md`](../AGENTS.md)  
- **只修 typo／純重構且決策不變** → 可不動；若對流程有影響仍要改  
- **Docs-only** → 不 bump `APP_VERSION`

每個新 chat 視為新交接：先讀 `AGENTS.md` → 再讀相關 `.kb.md`。

## Progressive disclosure

```
AGENTS.md（地圖）
  → *.kb.md（模組決策）
    → docs/*.md（長文 SOP／審查）
      → 原始碼
```

既有長文（**連結，勿整份複製**）：

- [`classification-proposals.md`](classification-proposals.md)
- [`filter-system-map.md`](filter-system-map.md)
- [`architecture-review-2026-10-09.md`](architecture-review-2026-10-09.md)

## 非目標

- 不取代 `README.md` 的人類說明  
- 不寫入或複製 `econ-database-data` 的機密／題目內容  
- 不在知識檔放 token、hash、真實使用者名稱

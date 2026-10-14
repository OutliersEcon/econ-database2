# filters.kb.md — 題目篩選

> 程式：`js/filters.js`（UI／狀態）；常數 `js/constants.js`；套用 `js/storage-filters.js`；特徵邏輯 `js/question-fields.js`  
> 長文地圖：[`docs/filter-system-map.md`](../docs/filter-system-map.md)

## 流程

```mermaid
flowchart TD
  UI[題目篩選 UI<br/>triStateFilters / search / ranges]
  Gather[gatherFilterState / filterQuestions]
  Apply[IndexedDBStorage.applyFilters]
  List[renderQuestions]

  UI --> Gather --> Apply --> List
  Adv[advancedFilter / idSetFilter] --> Apply
  Stats[統計 tab 另份 statsFilterState] --> Apply
```

- 特徵 checkbox 來自 `FEATURE_ITEMS`  
- Admin 另開「空白／缺漏」來自 `ADMIN_BLANK_FEATURE_ITEMS`（`accessRights.admin`）  
- `partPerformance` UI 標籤為 **考生表現**（keys 仍是 `partPerformance`）

## 架構取捨／決策

| 選項 | 選擇 | 原因 |
| --- | --- | --- |
| 「有分題」放特徵 | **是**（`FEATURE_ITEMS` 含「有分題」） | 常見正向篩選 |
| 「沒有分題」放特徵 | **否** | 特徵列只保留「有分題」；「沒有／尚未輸入」走 `partsStatus` 語意與 admin「尚未輸入分題」 |
| 空白／缺漏放特徵內 | **否** | 獨立 admin dropdown，避免一般使用者誤用資料品質篩選 |
| 「分題表現」命名 | UI → **考生表現**；keys 不變 | PR #76；避免改 storage／進階篩選 field id |
| 特徵多選邏輯 | 跨 key **AND** | 同時勾互斥特徵會得到空集（見 filter-system-map） |

### 常數對照（`js/constants.js`）

**`FEATURE_ITEMS`：** 有內嵌圖、跨課題、跨章節、**有分題**、已刪除、Out syl  

**`ADMIN_BLANK_FEATURE_ITEMS`：** 尚未輸入分題、未輸入考生表現、題目／答案／評卷報告空白、缺內嵌圖／缺原題圖片／缺答案原圖、課程分類空白、章節空白  

**`PART_PERFORMANCE_ITEMS`：** 優異、優良、良好、令人滿意、尚可、欠佳  

## 修改史（決策型）

| 方向 | 說明 |
| --- | --- |
| 特徵精簡 | 拿掉特徵內的「沒有分題」類項，改靠 partsStatus／admin blank |
| Admin blank 獨立 | 「空白／缺漏」不 merge 進特徵 |
| 考生表現改名 | UI 文案；`partPerformance` key 維持 |
| 統計與題目共用引擎 | 同一 `applyFilters`；統計自有 tri-state 副本 |

## 待辦

- [ ] `questionFeatureOn` 與 ConditionMatch fallback 雙實作漂移風險（見 architecture-review）  
- [ ] 其餘模組（stats-filters）尚未有專屬 `.kb.md`

## 文字版 E2E 測試描述

1. 非 admin：可見特徵「有分題」等；**不應**見「空白／缺漏」整組（或等價 admin-only 區）。  
2. Admin：開「空白／缺漏」→「尚未輸入分題」／「未輸入考生表現」可篩出對應列。  
3. 勾「有分題」→ 列表僅 `partsStatus===filled`（或等價 `questionFeatureOn`）之題。  
4. 考生表現區標籤顯示「考生表現」；進階篩選／存檔後 key 仍為 performance 相關欄位。  
5. 統計 tab 跳回題目：tri-state 應帶上對應特徵／表現篩選。

# apps-script/AGENTS.md

Apps Script 後端（本目錄）知識入口。

| 檔案 | 說明 |
| --- | --- |
| [`Code.kb.md`](Code.kb.md) | 分類／分題 staging、approve、deploy／clasp 要點 |
| [`README.md`](README.md) | 完整部署、角色 hash、action 地圖、安全模型 |
| `Code.gs` | **執行真相來源**（改完需 redeploy 才生效） |
| `appsscript.json` | UrlFetch 白名單等 |

前端對應：[`../AGENTS.md`](../AGENTS.md)、[`../js/report-issue.kb.md`](../js/report-issue.kb.md)、[`../docs/classification-proposals.md`](../docs/classification-proposals.md)。

**硬規則：** 分類寫入只經 `submitClassificationProposal` → 人審 `approveClassificationProposal`；禁止旁路改 bank。

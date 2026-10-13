# 分類提案 staging (concepts / stemPatterns)

**Canonical write path:** 分類專員 → Apps Script `submitClassificationProposal` (staging) → admin **回饋／回報 → 分類審批**. Do **not** write `concepts` / `stemPatterns` into `database.json` from Python batch scripts or other bypasses. Retired Python entry points: [`../archive/classification-python/`](../archive/classification-python/).

## Staging path

`shared/data/classification-proposals.json` in **econ-database-data**

```json
{
  "schemaVersion": 1,
  "updatedAt": "",
  "proposals": []
}
```

## Intake (preferred): Apps Script

`POST` action `submitClassificationProposal` (`admin` or `githubSync`).

- Upserts **one pending row per `questionId`**.
- Never writes `database.json`.
- When `proposals.length >= 200` and the submit would add a **new** `questionId`, response is:

```json
{ "ok": false, "paused": true, "pendingCount": 200, "pauseThreshold": 200, "error": "paused" }
```

Replacing an existing pending `questionId` is allowed while paused.

### Single proposal body

| Field | Notes |
| --- | --- |
| `questionId` | required |
| `fields` | `["concepts"]` and/or `["stemPatterns"]` (inferred from `proposedValues` if omitted) |
| `currentValues` | optional snapshot `{ concepts?: string[], stemPatterns?: string[] }` |
| `proposedValues` | required for targeted fields (arrays; empty array clears) |
| `reason` | optional string |
| `confidence` | `高` / `中` / `低` / empty |
| `createdBy` | optional agent name (defaults to username) |

Batch: `{ "proposals": [ … ] }` (cap 200 per call).

### Alternate: file PR (staging file only)

Append objects to `proposals[]` with the same fields plus `id`, `createdAt`, `status:"pending"`. Prefer the API so the pause gate is enforced. **Never** PR direct edits to `database.json` / shards for classification.

## Human review

Admin → **回饋／回報 → 分類審批**:

- **通過** → `approveClassificationProposal` writes only listed fields on the bank question, then removes the staging row.
- Overwrite confirm when a targeted field is already non-empty **or** `reviewedByAI === 'Y'` (`confirmOverwrite: true`).
- **拒絕** → drop staging row only.
- Banner when pending ≥ 200.

## Redeploy

After merging app changes that touch `apps-script/Code.gs`, paste into the bound Apps Script project and **Manage deployments → Edit → New version** (keep the same `/exec` URL).

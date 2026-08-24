# Migration 歷史的已知失真

**最後查證：2026-08-24**（建立 `ucmarket_staging` 時，backend 首次對空 database 跑 migration）

在**全新的空 database** 上跑這套 migration 會出現五條 `already exists, skipping` WARN。
空庫不該有東西已存在——原因是 `V1__initial_schema.sql` 曾被事後修改，把後續版本的內容
併了回去，另外 `V6` 夾帶了不屬於它的變更。

## 實際情況

| 版本 | 宣稱的變更 | 在空 database 上的實際效果 |
|---|---|---|
| `V2__add_market_image_url` | 加 `markets.image_url` | **完全 no-op**——`V1:84` 已含該欄位 |
| `V6__add_notification_jobs` | 加 notification jobs | notification 兩張表確實由它建立，但它的**前兩行**還加了 `markets.submission_version`，與檔名無關 |
| `V8__add_market_submission_version` | 加 `markets.submission_version` | **完全 no-op**——內容與 `V6` 前兩行逐字相同，`V6` 先跑 |
| `V11__add_user_oauth_accounts` | 加 oauth 表、放寬 `password_hash` | **完全 no-op**——`V1:49,230,231` 已建表與兩個索引，`V1:18` 的 `password_hash` 本來就沒有 `NOT NULL` |

三者都靠 `ADD COLUMN IF NOT EXISTS` ／ `CREATE TABLE IF NOT EXISTS` 才只 skip 不報錯。

## 影響

- **既有環境不受影響**：production 的 `flyway_schema_history` 早已記錄 V1～V13 全部套用完畢，不會重跑。
- **新環境建得起來**：`ucmarket_staging` 於 2026-08-24 從空庫一次跑到 v13 成功。
- **真正的代價是誤導**：讀 migration 歷史會以為 `image_url` 是 V2 才加的、`user_oauth_accounts`
  是 V11 才建的。實際上兩者都在 V1。

## 為什麼不修正這些檔案

Flyway 會對已套用的 migration 做 checksum 驗證。**改動 V1～V13 任何一個檔案，都會讓既有
環境（production）在下次啟動時驗證失敗**。所以這裡只記錄失真，不動檔案。

## 新增 migration 時

- 只 append 新版本，**永遠不要回頭改已套用的檔案**。
- 一個檔案只做它檔名說的那件事（`V6` 是反例）。
- 若日後要重整，正確做法是在一個明確的 baseline 點重建 `V1`，並同步處理所有既有環境的
  `flyway_schema_history`，而不是就地修改。

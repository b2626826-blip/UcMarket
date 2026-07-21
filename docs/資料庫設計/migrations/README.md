# 歷史 migration 說明

本資料夾保存舊資料庫修補腳本，不是正式 migration 來源。正式資料庫由 `backend/src/main/resources/db/migration/` 的 Flyway `V1` 至 `V13` 依序建立與演進；上層 `../ucmarket-ddl.sql` 目前只反映舊版 V1～V5，不能取代 Flyway migration 鏈。

| 歷史檔案 | 舊版 DDL 的對應結果 |
| --- | --- |
| `add-code-columns.sql` | 五組 code sequence、欄位與唯一約束 |
| `add-market-image-url.sql` | `markets.image_url` |
| `add-market-metadata.sql` | `markets.metadata` |
| `add-oauth-support.sql` | `users.password_hash` 可為 NULL、`user_oauth_accounts` 與索引 |
| `drop-wallet-transaction-user-market-columns.sql` | `wallet_transactions` 僅保留 `wallet_id` 與 reference 欄位模型 |
| `sync-current-db-to-ddl.sql` | `positions.option_id`、`market_price_history`、索引與目前 schema 清理結果 |

`fix-admin-password.sql` 是針對既有測試管理員資料的單次資料修復，不是資料表結構變更，因此不應放入 DDL。

## 使用規則

- 不要對新資料庫或已被 Flyway 管理的資料庫執行本資料夾的歷史 SQL。
- 不要在本資料夾新增未來 migration。
- 未來 schema 變更一律新增至 `backend/src/main/resources/db/migration/V<版本>__<說明>.sql`；下一版從 `V14` 開始。
- 新增 Flyway migration 後同步更新 ERD、API 與架構文件。只有在能完整重建所有 migration 最終結果時，才更新 `../ucmarket-ddl.sql` 並重新宣告它為 current snapshot。

# UcMarket Flyway Migration 操作手冊

## 目的

UcMarket 使用 Flyway 管理 PostgreSQL 的資料庫結構變更。應用程式啟動時會自動檢查尚未套用的 migration，依版本順序執行，並記錄在 `flyway_schema_history`。

JPA 設定為 `spring.jpa.hibernate.ddl-auto=none`，因此新增或修改 Entity **不會**自動修改正式資料庫；資料庫結構變更必須透過 Flyway migration 完成。

## 目前結構

```text
backend/
├─ src/main/resources/
│  ├─ application.properties
│  └─ db/migration/
│     ├─ V1__initial_schema.sql
│     ├─ V2__add_market_image_url.sql
│     ├─ V3__add_market_metadata.sql
│     ├─ V4__add_weather_system_user.sql
│     ├─ V5__add_market_price_history_option_price.sql
│     ├─ V6__add_notification_jobs.sql
│     ├─ V7__add_trade_idempotency_key.sql
│     ├─ V8__add_market_submission_version.sql
│     ├─ V9__add_memo_to_wallet_transactions.sql
│     ├─ V10__add_market_review_checks.sql
│     ├─ V11__add_user_oauth_accounts.sql
│     ├─ V12__add_market_resolution_evidence.sql
│     └─ V13__password_reset_tokens.sql
└─ pom.xml

docs/資料庫設計/
└─ ucmarket-ddl.sql
```

- `V1__initial_schema.sql`：新空白 PostgreSQL 資料庫的初始結構。
- `V2`：補上市場圖片欄位。
- `V3`：補上市場 metadata，供天氣等系統市場保存結構化條件。
- `V4`：建立天氣自動化使用的系統使用者。
- `V5`：補上價格歷史的 `option_price` 欄位。
- `V6`：建立通知 outbox／attempts，並確保 `markets.submission_version` 存在。
- `V7`：新增交易冪等鍵。
- `V8`：再次以 `IF NOT EXISTS` 確保 `submission_version`，供不同既有資料庫升級路徑收斂。
- `V9`：新增錢包流水備註欄位。
- `V10`：建立規則式市場預審結果。
- `V11`：修復 OAuth schema 漂移並確保 OAuth 帳號表存在。
- `V12`：建立時事市場結算證據表。
- `V13`：建立密碼重設 token 表。
- `ucmarket-ddl.sql`：舊版 V1～V5 的閱讀快照，目前未包含 V6～V13；正式 schema 一律以 Flyway migration 鏈為準。
- `flyway_schema_history`：Flyway 在目標資料庫建立的版本紀錄表，不要手動修改。

## 日常新增 migration

每次需要改資料庫，新增一個 SQL 檔案到：

```text
backend/src/main/resources/db/migration/
```

檔名格式：

```text
V<版本>__<英文說明>.sql
```

例如，新增 `markets.source_note` 欄位：

```text
V2__add_market_source_note.sql
```

```sql
ALTER TABLE markets
    ADD COLUMN source_note TEXT;
```

下一次變更使用遞增版本，例如 `V3__add_market_status_index.sql`。

### 撰寫規則

1. 一個邏輯變更使用一個 migration 檔案。
2. 不要修改已經在任一環境套用過的 migration，包括 `V1`。
3. 修正已部署的 schema 時，建立新的 migration，而不是回頭修改舊檔。
4. Flyway 會確保同一 migration 只執行一次；一般不需要為避免重跑而加入 `IF NOT EXISTS`。
5. 同步更新 `docs/資料庫設計/ucmarket-er-diagram.md` 與相關 API／架構文件；若要維護 `ucmarket-ddl.sql`，必須完整重建為 V1～最新版本的結果，不能只補片段。
6. SQL 以 PostgreSQL 為目標；可使用 PostgreSQL 的型別與語法，但必須先在 PostgreSQL 驗證。

## 執行 migration

### 新的空白資料庫

不用設定 baseline。正常啟動後，Flyway 會依序執行 `V1`、`V2`、後續所有 migration：

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### 已有既有 schema 的資料庫（只限第一次）

前提是既有資料庫的結構已經與 `V1__initial_schema.sql` 相符。

1. 先備份資料庫。
2. 僅在第一次啟動前設定 baseline 環境變數。
3. 啟動應用程式，讓 Flyway 建立 `flyway_schema_history` 並標記為 V1。
4. 停止應用程式並移除環境變數。

```powershell
cd backend
$env:FLYWAY_BASELINE_ON_MIGRATE = 'true'
.\mvnw.cmd spring-boot:run
```

成功後移除該環境變數：

```powershell
Remove-Item Env:FLYWAY_BASELINE_ON_MIGRATE -ErrorAction SilentlyContinue
```

> 不要長期保留 `FLYWAY_BASELINE_ON_MIGRATE=true`。它只用於既有資料庫首次納管；之後保留預設值 `false`。

## 部署與驗證流程

1. 新增 migration SQL。
2. 更新 ERD、API 與架構文件；若本次同時維護 canonical DDL，確認它已完整反映所有 migration。
3. 在可丟棄的 PostgreSQL 資料庫啟動應用程式，確認 migration 能套用。
4. 檢查應用程式啟動日誌中的 Flyway 成功訊息。
5. 查詢 `flyway_schema_history`，確認新版本的 `success` 為 `true`。
6. 將 migration 與受影響的 schema／API 文件一起提交。

檢查 migration 歷程的 SQL：

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

## 測試注意事項

目前單元與 H2 測試 profile 設定為：

```properties
spring.flyway.enabled=false
```

原因是初始 schema 使用 PostgreSQL 專用功能，例如 `pgcrypto`、`JSONB` 與 partial index。H2 測試通過不代表 migration 一定能在 PostgreSQL 執行；涉及 migration 的變更應額外在 PostgreSQL 測試資料庫驗證。

執行既有後端測試：

```powershell
cd backend
.\mvnw.cmd test
```

若本機已設定 `SPRING_DATASOURCE_*` 且它與 H2 測試設定衝突，可僅在該 PowerShell 行程中先清除：

```powershell
Remove-Item Env:SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
Remove-Item Env:SPRING_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
Remove-Item Env:SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
.\mvnw.cmd test
```

## 常見問題

### `Found non-empty schema but no schema history table`

代表目標資料庫已有資料表，但尚未被 Flyway 納管。確認它與 V1 相符、完成備份後，依照「已有既有 schema 的資料庫」章節只執行一次 baseline。

### `Validate failed: Migration checksum mismatch`

代表已執行過的 migration 檔案被修改。不要直接改歷史檔案；還原該檔案原內容，並以新的版本檔案完成後續修正。

### Migration 啟動失敗

先保留錯誤訊息並確認 PostgreSQL 的實際 schema。不要直接刪除 `flyway_schema_history` 或盲目執行 repair；先判斷 SQL 是否已部分套用，再建立正確的後續 migration 或依團隊流程處理。

## 上線前檢查表

- [ ] migration 檔名版本正確且未重複。
- [ ] 沒有修改舊 migration。
- [ ] 已在 PostgreSQL 測試資料庫驗證。
- [ ] `flyway_schema_history` 顯示成功。
- [ ] ERD 與受影響 API／架構文件已同步。
- [ ] 若提交 `ucmarket-ddl.sql`，內容已完整反映 V1～最新版本。
- [ ] 正式環境沒有設定 `FLYWAY_BASELINE_ON_MIGRATE=true`。

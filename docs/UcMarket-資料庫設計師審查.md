# UcMarket 資料庫設計師獨立審查

審查日期：2026-07-12
審查角色：資料庫設計師（獨立於既有審查作者）
審查基準：既有報告 `docs/UcMarket-前後端與資料庫完整審查.md`「四、資料庫審查」章節 + 目前工作樹（分支 `eagle`）
審查方法：靜態比對 `database/`（僅 `.gitkeep`，實際 DDL 位於 `docs/資料庫設計/`）、`docs/資料庫設計/ucmarket-ddl.sql`、`docs/資料庫設計/migrations/*.sql`、`docs/資料庫設計/seed/mock.sql`、`backend/src/test/resources/{application.properties,data.sql}`，與 `backend/src/main/java/com/ucmarket/{entity,repository,service}` 全量原始碼；未重新執行 `mvnw test`（既有報告同日已跑過 216 tests all green，程式碼自該次驗證後未變更）。

---

## 一、與既有報告「四、資料庫審查」逐條比對

### [P1] Position entity、production DDL 與 H2 測試 schema 的唯一性契約不同 —— **仍存在**

複查證據與既有報告一致，且逐行核對後仍完全吻合：

- `backend/src/main/java/com/ucmarket/entity/Position.java:18-24` 仍宣告完整 `@UniqueConstraint(columnNames = {"user_id","market_id"})`。
- `docs/資料庫設計/ucmarket-ddl.sql:230-232` 仍只有 partial unique index：`CREATE UNIQUE INDEX uk_positions_user_market_binary ON positions (user_id, market_id) WHERE option_id IS NULL`。
- `backend/src/main/java/com/ucmarket/repository/PositionRepository.java:54,93` 的 native upsert `ON CONFLICT (user_id, market_id) WHERE option_id IS NULL` 明確依賴這個 partial index 當 conflict target。
- `backend/src/test/resources/data.sql:18` 仍需要手動 `ALTER TABLE positions ADD COLUMN IF NOT EXISTS option_id UUID;` 來補 Hibernate（依 entity 建表，entity 沒有 `option_id` 欄位）建出的 H2 schema，證明 H2 測試 schema 仍不等於 production DDL。

結論不變：只要 production 真的插入兩筆 `option_id IS NULL` 的衝突資料，H2（完整 unique constraint）與 PostgreSQL（partial unique index）的拒絕/接受行為仍會不一致。

### [P2] production schema 沒有應用程式層 migration runner —— **仍存在**

- `backend/src/main/resources/application.properties:8` 仍是 `spring.jpa.hibernate.ddl-auto=none`。
- `backend/pom.xml` 內搜尋 `flyway`/`liquibase` 無任何結果，確認未引入 migration 工具依賴。
- `docs/資料庫設計/migrations/` 下 6 個 `.sql`（含 `sync-current-db-to-ddl.sql`、`add-oauth-support.sql`、`add-code-columns.sql`、`add-market-image-url.sql`、`drop-wallet-transaction-user-market-columns.sql`、`fix-admin-password.sql`）仍是純文字檔，沒有版本表、沒有 checksum、沒有執行順序保證，需要人工依檔名判斷順序套用。
- 新佐證（見下方 N2）：H2 測試 schema 與正式 DDL 目前已經因為缺乏統一 migration 流程而在 `market_price_history.option_price` 欄位上產生了實際分歧，而不只是理論風險。

### 「資料庫已確認一致的部分」複查結果

| 既有報告條目 | 複查結論 |
|---|---|
| Canonical DDL 已含 users/sessions/OAuth/wallets/markets/reviews/trades/positions/wallet_transactions/admin_logs，且與 entity 對齊 | **仍成立**。逐一比對全部 11 個 entity 與 DDL 資料表，欄位型別、nullable、預設值均一致（見下方「二、新發現」之外的健康部分不重複列出）。 |
| `wallet_transactions.idempotency_key` partial unique index 符合防重設計 | **仍成立**。`ucmarket-ddl.sql:225-227` 與 `WalletTransactionRepository.findByIdempotencyKey` (`WalletTransactionRepository.java:18`)、`WalletService.credit/debit` 的 verify-on-hit 邏輯一致。 |
| `PositionRepository` conflict target 與 DDL partial index 文字一致 | **仍成立**，文字逐字相同。 |
| `resolved_by`/`approved_by`/`image_url`/code 欄位與 entity/DTO 對齊 | **仍成立**，`Market.java` 對應欄位存在且型別相符。 |
| 排行榜 native SQL 在 H2 PostgreSQL mode 下可通過測試 | **無法確認**（本次未重新執行 `mvnw test`）。因程式碼自既有報告驗證後未變動，推定仍可通過，但建議仍以實跑結果為準，不應只憑本次靜態審查背書。 |

---

## 二、新發現問題（既有報告未涵蓋）

### [P2] N1 — Market 列表查詢缺少 `(category, status)` 複合索引

**證據**

- `backend/src/main/java/com/ucmarket/controller/MarketController.java:74-80`：`GET /api/markets` 依 `category` + `status` 篩選並用 `Sort.by("createdAt").descending()` 排序，這是所有市場分類頁（天氣／運動／政治／金融／時事）共用的主要列表入口。
- `backend/src/main/java/com/ucmarket/repository/CurrentAffairsMarketRepository.java:27,37,47,58`：4 條 query 全部寫死 `m.category = 'CURRENT_AFFAIRS' AND m.status = :status`。
- `docs/資料庫設計/ucmarket-ddl.sql:238-240`：`markets` 只有 `idx_markets_creator_id`、`idx_markets_status`、`idx_markets_close_at` 三個單欄索引，沒有涵蓋 `category` 的索引，更沒有 `(category, status)` 或 `(category, status, created_at)` 複合索引。

**影響**

目前市場筆數少，PostgreSQL planner 大機率選擇 Seq Scan 也不會慢；但這是全站流量最高的讀路徑（每個分類頁、每次分頁都會打這個查詢），資料量成長後會是第一個變慢的查詢。

**建議**

新增 `CREATE INDEX idx_markets_category_status_created ON markets (category, status, created_at DESC);`，可同時滿足 `findByCategory`、`findByCategoryAndStatus` 與 `CurrentAffairsMarketRepository` 的過濾＋排序需求。

### [P2] N2 — H2 測試 schema 的 `market_price_history` 多了正式 DDL 已刪除的 `option_price` 欄位

**證據**

- `backend/src/test/resources/data.sql:7-16` 手動 `CREATE TABLE market_price_history`，欄位包含 `option_price NUMERIC(18, 4)`。
- `docs/資料庫設計/ucmarket-ddl.sql:178-191` 的正式 `market_price_history` 定義**沒有** `option_price` 欄位。
- `docs/資料庫設計/migrations/sync-current-db-to-ddl.sql:60`：`ALTER TABLE market_price_history DROP COLUMN IF EXISTS option_price;` —— 證明 `option_price` 是一個已經被正式決定移除的舊欄位，但沒有人回頭同步更新 H2 測試 schema。
- 全專案搜尋 `option_price`，只剩這兩個檔案還提到它，production Java 程式碼完全不使用。

**影響**

這是「P2 沒有 migration runner」問題的具體後果，不是假設性風險：測試環境與正式環境的 schema 已經實際上分岔。目前該欄位無資料寫入、無查詢引用，暫不影響測試正確性，但每多一次手動修改 DDL 而忘記同步測試 schema，兩邊契約就會再遠一步。

**建議**

從 `backend/src/test/resources/data.sql` 移除 `option_price` 欄位定義，讓 H2 手刻 schema 與正式 DDL 逐欄一致；長期仍建議用同一份 migration 腳本同時產生正式與測試 schema，而不是兩份手寫 DDL 各自維護。

### [P3] N3 — 全表時間欄位使用 `TIMESTAMP`（無時區）＋ `LocalDateTime`，應用層未設定明確時區

**證據**

- `docs/資料庫設計/ucmarket-ddl.sql` 所有時間欄位（`created_at`、`updated_at`、`close_at`、`resolved_at`、`recorded_at`……）都是 `TIMESTAMP`（即 PostgreSQL 的 `timestamp without time zone`），沒有一個用 `TIMESTAMPTZ`。
- 對應全部 11 個 entity 一致使用 `LocalDateTime`（例如 `Market.java:56-91`、`Position.java:54-63`）。
- `backend/src/main/resources/application.properties`、`backend/src/test/resources/application.properties` 均未設定 `spring.jpa.properties.hibernate.jdbc.time_zone` 或 `user.timezone`，時區完全隱性依賴 JVM 與 DB 主機的預設時區一致。

**影響**

單機 Demo（同一台機器跑 App 和 DB）下不會出現問題。但只要 App 與 DB 分別部署在不同時區主機、或其中一台開了 DST，`close_at <= now()` 這類比較（`MarketService.autoCloseExpiredMarkets`、`findMarket()`）就會產生數小時級的誤差，會放大既有報告 P1「closeAt 已過但排程尚未關閉」那個時間窗口問題。

**建議**

Demo 現況可不用馬上改；若要往多機／多區域部署邁進，建議統一約定 DB 與應用皆用 UTC（`TIMESTAMPTZ` + 顯式設定 `hibernate.jdbc.time_zone=UTC`），一次性遷移比之後追 bug 便宜。

### [P3] N4 — `wallet_transactions.type` 沒有索引，排行榜三條 native query 對整表做等值過濾

**證據**

- `backend/src/main/java/com/ucmarket/repository/RankingRepository.java:22`（`findRankingSnapshot`）與 `:157`（`findProfitRankings`）都執行 `WHERE wt.type = 'RESOLUTION_PAYOUT'`，且無 `LIMIT`，需要彙總全表配對 `wallets`。
- `docs/資料庫設計/ucmarket-ddl.sql:251-252` 的 `wallet_transactions` 索引只有 `idx_wallet_transactions_wallet_created (wallet_id, created_at DESC)` 與 `idx_wallet_transactions_reference`，沒有涵蓋 `type` 的索引。

**影響**

排行榜是會被頻繁打開的公開頁面，且此查詢邏輯完全依賴整表掃描。目前資料量小無感，隨交易量成長會是資料庫審查中最先浮現的效能瓶頸之一。

**建議**

視實際查詢頻率評估是否加 `CREATE INDEX idx_wallet_transactions_type ON wallet_transactions (type);` 或部分索引 `WHERE type = 'RESOLUTION_PAYOUT'`；若排行榜改走既有報告建議的「直接從 markets pool 推導價格」＋固定排程快取，這個索引優先度會下降。

### [P3] N5 — `users.role` / `users.status` 沒有索引，Admin 全表過濾

**證據**

- `backend/src/main/java/com/ucmarket/repository/UserRepository.java:18-19`：`findByRole`、`findByStatus`。
- `backend/src/main/java/com/ucmarket/controller/AdminUserController.java:37,43,47` 呼叫這兩個方法做後台使用者列表篩選。
- DDL 沒有 `idx_users_role` / `idx_users_status`。

**影響**

僅限後台管理員頁面使用，使用頻率與資料量都低，短期無實際影響，列為前瞻性建議。

**建議**

若後台使用者數上升到需要分頁/篩選效能的規模，再補索引；目前不建議為了這個而動 schema。

### [P3] N6 — `PositionService.sellPosition` 是死碼，且與現行 DB 設計不相容（僅回報，不處理）

**證據**

- `backend/src/main/java/com/ucmarket/service/PositionService.java:106-138` 定義了 `sellPosition()`，直接扣減 `yesShares`/`noShares`，但沒有寫入 `trades` 或 `wallet_transactions`。
- 全專案搜尋不到任何 controller 呼叫它（`TradeController` 只有 `POST /api/trades` 對應 `TradeService.placeTrade`，沒有 sell 端點）。
- `docs/資料庫設計/ucmarket-ddl.sql:148`：`CONSTRAINT ck_trades_action CHECK (action IN ('BUY'))` 目前只允許 `BUY`。

**影響**

現況：純粹是未接線的死碼，不影響任何已上線路徑，依守則只回報不處理。若日後真的要接上「賣出」功能，除了接 controller/wallet credit/trade record 之外，還必須連動修改 `ck_trades_action` 這個 CHECK 約束，否則第一筆 SELL trade 寫入就會被 DB 拒絕。

---

## 三、交易一致性設計檢查（餘額扣款／持倉更新的約束保護）

本次順便確認既有報告未特別點名、但屬於「資料庫審查」範圍的正向設計，供之後修改時避免誤動：

- `wallets` 有 `ck_wallets_balance CHECK (balance >= 0)` 與 `ck_wallets_locked_balance CHECK (locked_balance >= 0)`（`ucmarket-ddl.sql:75-76`），即使應用層邏輯出錯，DB 層仍會擋下負餘額寫入。`Wallet.applyDebit()`（`Wallet.java:81-89`）在應用層也先擋一次，是雙層防護。
- `WalletRepository.findByUserIdForUpdate`（悲觀鎖）＋ `WalletTransactionRepository.findByIdempotencyKey`（query-first 防重）＋ `wallet_transactions` 的 partial unique index，三者共同確保同一 `idemKey` 不會重複入帳/扣款，且同一使用者的並發 credit/debit 會被鎖序列化（`WalletService.java:47-101`）。
- `MarketRepository.findByIdForUpdate` 對市場做悲觀鎖後才 `market.buy()`／`resolve()`／`cancel()`，避免同一市場的併發交易造成 pool 更新遺失（`TradeService.java:38`、`ResolutionService.java:40`）。
- `positions` 的 `ck_positions_yes_shares/no_shares/yes_cost/no_cost CHECK (>= 0)` 防止 upsert 邏輯把持倉寫成負值。
- 唯一的資料庫層缺口：closeAt 過期後仍可交易的窗口（既有報告已列 P1）目前完全靠應用層 `if (market.getStatus() != MarketStatus.ACTIVE)` 檢查，`trades`/`positions` 沒有任何 DB trigger 或約束能在 `close_at` 已過時擋下 insert。這與既有報告的結論一致，這裡只是從「資料庫可以再加一道防線」的角度重申，不重複計入本報告的問題計數。

---

## 四、金額與型別精度複查

- 所有金額欄位（`balance`、`amount`、`yes_cost`、`no_cost`、`yes_pool`、`no_pool`、`balance_after`）皆為 `NUMERIC(18, 2)`，entity 對應 `BigDecimal` + `precision=18, scale=2`，沒有任何 `FLOAT`/`DOUBLE` 誤用。
- 股數/價格欄位（`price`、`shares`、`yes_shares`、`no_shares`）為 `NUMERIC(18, 4)`，符合需要更高精度的除法運算（`TradeService.java:50`、`ResolutionService.java:73-79` 皆用 `RoundingMode.HALF_UP` 到 8 位小數再落地存 4 位）。
- `WalletService.toCents()`（`WalletService.java:139-144`）在入口統一 `setScale(2, RoundingMode.DOWN)`，確保 wallet 相關數字不會在 DB 與應用層之間出現精度漂移。

此區塊沒有發現新問題。

---

## 五、問題總數統計

| 嚴重度 | 數量 | 條目 |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0（既有 1 條，本次確認**仍存在**，不重複計入新計數） | Position 唯一性契約不一致（沿用既有報告編號） |
| P2 | 3 | 既有「migration runner 缺失」（仍存在，沿用既有編號）＋ 新發現 N1（market 缺複合索引）＋ N2（H2 schema 多餘 `option_price` 欄位） |
| P3 | 4 | N3（時區）、N4（wallet_transactions.type 缺索引）、N5（users.role/status 缺索引）、N6（sellPosition 死碼與 CHECK 約束不相容，僅回報） |

新發現問題合計：6 件（N1–N6，P2 × 2、P3 × 4）。既有報告兩條資料庫問題經複查全部**仍存在**，無一件「已修復」。

## 六、前五個最嚴重問題摘要

1. **[P1，沿用既有編號，仍存在]** Position 唯一性契約三方不一致（entity 完整 unique vs. DDL partial index vs. H2 手動補丁）—— `backend/src/main/java/com/ucmarket/entity/Position.java:18-24`、`docs/資料庫設計/ucmarket-ddl.sql:230-232`。
2. **[P2，沿用既有編號，仍存在]** production schema 無 migration runner，`ddl-auto=none` 且無 Flyway/Liquibase —— `backend/src/main/resources/application.properties:8`。
3. **[P2，新發現 N1]** `markets` 缺 `(category, status)` 複合索引，是全站最熱的讀路徑 —— `backend/src/main/java/com/ucmarket/controller/MarketController.java:74-80`、`docs/資料庫設計/ucmarket-ddl.sql:238-240`。
4. **[P2，新發現 N2]** H2 測試 schema 的 `market_price_history` 仍保留正式 DDL 已刪除的 `option_price` 欄位，schema 已實際分岔 —— `backend/src/test/resources/data.sql:7-16` vs `docs/資料庫設計/migrations/sync-current-db-to-ddl.sql:60`。
5. **[P3，新發現 N3]** 全表 `TIMESTAMP`（無時區）＋ `LocalDateTime`，未設定應用層時區，會放大既有 closeAt 競態視窗 —— `docs/資料庫設計/ucmarket-ddl.sql`（全表）、`backend/src/main/java/com/ucmarket/service/MarketService.java:150-171`。

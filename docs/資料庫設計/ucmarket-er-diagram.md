# UcMarket 目前 ER 圖

本文件依 `backend/src/main/resources/db/migration/` 的 Flyway `V1`～`V13` 整理。正式 schema 以 migration 鏈為準；`ucmarket-ddl.sql` 尚未納入 V6～V13，只能當舊版閱讀快照。

## 範圍決策

- 目前正式 schema 共 16 張表，只支援二元 Yes／No 市場與 BUY 交易。
- 一位使用者在同一 binary 市場只有一筆 `positions`，由 partial unique index 保證。
- 排行榜由 `RankingRepository` 即時計算，不建立 ranking table 或 view。
- 通知可靠性由 `notification_jobs` 與 `notification_job_attempts` 保存；n8n 不直連資料庫。
- `notification_jobs.recipient_user_id`／`market_id` 是邏輯關聯欄位，目前 migration 沒有建立資料庫 FK；ERD 以虛線表示。
- `market_review_checks` 保存每次送審的確定性規則結果；`market_reviews` 只保存人工審核。
- `market_resolution_evidence` 以 `(market_id, source_url)` 冪等保存時事市場結算證據。
- `market_options`、`notifications`、`user_portfolio_snapshots` 仍屬未來規劃，不在正式 schema。

## Mermaid ERD

```mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : owns
    USERS ||--o{ USER_OAUTH_ACCOUNTS : links
    USERS ||--o{ PASSWORD_RESET_TOKENS : requests
    USERS ||--|| WALLETS : owns
    USERS ||--o{ MARKETS : creates
    USERS ||--o{ MARKET_REVIEWS : reviews
    USERS ||--o{ TRADES : places
    USERS ||--o{ POSITIONS : holds
    USERS ||--o{ ADMIN_LOGS : performs
    USERS ||..o{ NOTIFICATION_JOBS : receives

    WALLETS ||--o{ WALLET_TRANSACTIONS : records
    MARKETS ||--o{ MARKET_REVIEWS : has
    MARKETS ||--o{ MARKET_REVIEW_CHECKS : prechecks
    MARKETS ||--o{ MARKET_RESOLUTION_EVIDENCE : evidences
    MARKETS ||--o{ TRADES : receives
    MARKETS ||--o{ POSITIONS : aggregates
    MARKETS ||--o{ MARKET_PRICE_HISTORY : prices
    MARKETS ||..o{ NOTIFICATION_JOBS : notifies
    NOTIFICATION_JOBS ||--o{ NOTIFICATION_JOB_ATTEMPTS : attempts

    USERS {
        uuid id PK
        varchar code UK
        varchar username UK
        varchar email UK
        varchar password_hash "nullable for OAuth"
        varchar role
        varchar status
    }

    USER_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar refresh_token_hash UK
        timestamp expires_at
        timestamp revoked_at
    }

    USER_OAUTH_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        varchar provider
        varchar provider_uid
        varchar email
    }

    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamp expires_at
        timestamp used_at
    }

    WALLETS {
        uuid id PK
        uuid user_id FK,UK
        numeric balance
        numeric locked_balance
        int version
    }

    MARKETS {
        uuid id PK
        varchar code UK
        uuid creator_id FK
        varchar title
        varchar category
        varchar market_type
        timestamp close_at
        varchar status
        varchar result
        int submission_version
        jsonb metadata
        numeric yes_pool
        numeric no_pool
    }

    MARKET_REVIEWS {
        uuid id PK
        uuid market_id FK
        uuid reviewer_id FK
        varchar status
        text comment
    }

    MARKET_REVIEW_CHECKS {
        uuid id PK
        uuid market_id FK
        int submission_version
        varchar rule_code
        int rule_version
        varchar status
        text reason
    }

    MARKET_RESOLUTION_EVIDENCE {
        uuid id PK
        uuid market_id FK
        varchar source_url
        varchar source_title
        timestamptz published_at
        timestamptz fetched_at
    }

    TRADES {
        uuid id PK
        uuid user_id FK
        uuid market_id FK
        varchar side
        varchar action "BUY"
        numeric amount
        numeric price
        numeric shares
        varchar idempotency_key UK
    }

    POSITIONS {
        uuid id PK
        uuid user_id FK
        uuid market_id FK
        uuid option_id "currently null"
        numeric yes_shares
        numeric no_shares
        numeric yes_cost
        numeric no_cost
        varchar status
    }

    MARKET_PRICE_HISTORY {
        uuid id PK
        uuid market_id FK
        uuid option_id "currently null"
        numeric yes_price
        numeric no_price
        numeric option_price
        numeric trade_volume
        timestamp recorded_at
    }

    WALLET_TRANSACTIONS {
        uuid id PK
        uuid wallet_id FK
        varchar type
        numeric amount
        numeric balance_after
        varchar reference_type
        uuid reference_id
        varchar idempotency_key UK
        varchar memo
    }

    ADMIN_LOGS {
        uuid id PK
        uuid admin_user_id FK
        varchar action
        varchar target_type
        uuid target_id
        jsonb metadata
    }

    NOTIFICATION_JOBS {
        uuid id PK
        varchar event_type
        uuid recipient_user_id
        uuid market_id
        jsonb payload
        varchar status
        int attempt_count
        varchar idempotency_key UK
    }

    NOTIFICATION_JOB_ATTEMPTS {
        uuid id PK
        uuid job_id FK
        int attempt_no
        varchar status
        varchar error_message
        timestamp started_at
        timestamp finished_at
    }
```

## Schema 維護

- 新資料庫：由應用程式啟動時的 Flyway 依序套用 V1～V13；不要直接執行歷史修補腳本。
- 舊資料庫首次納管：先備份，再依 Flyway 操作手冊確認 baseline 或升級路徑。
- 修改 entity、native SQL 或 API 時，同步新增 migration、更新本文件與相關測試。
- Hibernate 正式設定為 `ddl-auto=none`，不會自動修正 schema。

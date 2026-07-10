# UcMarket 整合 ER 圖

整理來源：`docs/project-spec.md`、`docs/資料庫設計/ucmarket-ddl.sql`、`docs/資料庫設計/erd/ucmarket-er-diagram.mmd`、`docs/系統設計/技術架構.md`、`backend/src/main/java/com/ucmarket/entity/*`。

## 整併決策

- 不重複建立排行榜資料表；Ranking 由 `users`、`wallets`、`wallet_transactions`、`trades`、`positions`、`markets`、`market_price_history` 計算，DDL 另外提供 view。
- 不建立 `resolution_payouts`；MVP 以 `wallet_transactions.type = RESOLUTION_PAYOUT` 記錄結算派彩。若未來需要逐人派彩明細審計，再新增獨立表。
- `wallet_transactions` 整併錢包需求表與既有 DDL：刪除重複的 `user_id`、`market_id`；使用者由 `wallet_id -> wallets.user_id` 取得，市場或交易來源由 `reference_type` / `reference_id` 追蹤。
- `RESOLVE_PAYOUT` 統一命名為 `RESOLUTION_PAYOUT`。
- `roles` 不獨立成表，先沿用 `users.role` enum-like 欄位，避免和現有使用者設計重複。
- OAuth 帳號與原生帳密共用 `users`：`users.password_hash` 允許 `NULL`，第三方身分放在 `user_oauth_accounts`。
- `user_oauth_accounts` 以 `(provider, provider_uid)` 保證第三方帳號唯一，provider 限制為 `GOOGLE`、`FACEBOOK`、`GITHUB`；刪除使用者時連動刪除綁定，並為 `user_id`、`email` 建立索引。
- `user_portfolio_snapshots`、`notifications`、`admin_logs` 是非交易核心但有文件提到的延伸表，已納入並和主表關聯。

## Mermaid ERD

```mermaid
erDiagram
    USERS ||--|| WALLETS : owns
    USERS ||--o{ USER_SESSIONS : logs_in
    USERS ||--o{ USER_OAUTH_ACCOUNTS : links
    USERS ||--o{ MARKETS : creates
    USERS ||--o{ MARKETS : approves
    USERS ||--o{ MARKETS : resolves
    USERS ||--o{ MARKET_REVIEWS : reviews
    USERS ||--o{ TRADES : places
    USERS ||--o{ POSITIONS : holds
    USERS ||--o{ USER_PORTFOLIO_SNAPSHOTS : snapshots
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ ADMIN_LOGS : performs

    WALLETS ||--o{ WALLET_TRANSACTIONS : records

    MARKETS ||--o{ MARKET_REVIEWS : has_reviews
    MARKETS ||--o{ MARKET_OPTIONS : has_options
    MARKETS ||--o{ TRADES : has_trades
    MARKETS ||--o{ POSITIONS : has_positions
    MARKETS ||--o{ MARKET_PRICE_HISTORY : has_price_history
    MARKETS ||--o{ NOTIFICATIONS : may_reference

    MARKET_OPTIONS |o--o{ TRADES : option_target
    MARKET_OPTIONS |o--o{ POSITIONS : option_position
    MARKET_OPTIONS |o--o{ MARKET_PRICE_HISTORY : option_price

    USERS {
        uuid id PK
        varchar code UK
        varchar username UK
        varchar email UK
        varchar password_hash "nullable for OAuth"
        varchar role "USER / ADMIN"
        varchar status "ACTIVE / BANNED / DISABLED"
        integer reputation
        timestamp last_login_at
        text avatar_url
        text bio
        timestamp created_at
        timestamp updated_at
    }

    USER_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar refresh_token_hash UK
        timestamp expires_at
        timestamp revoked_at
        varchar ip_address
        timestamp created_at
    }

    USER_OAUTH_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        varchar provider "GOOGLE / FACEBOOK / GITHUB"
        varchar provider_uid "UK with provider"
        varchar email
        timestamp created_at
    }

    WALLETS {
        uuid id PK
        uuid user_id FK
        numeric balance
        numeric locked_balance
        integer version
        timestamp created_at
        timestamp updated_at
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
        jsonb metadata
        timestamp created_at
    }

    MARKETS {
        uuid id PK
        varchar code UK
        uuid creator_id FK
        varchar title
        text description
        varchar category
        varchar market_type
        text source_url
        text resolution_rule
        timestamp close_at
        varchar status
        varchar result
        numeric result_value
        numeric yes_pool
        numeric no_pool
        uuid approved_by FK
        timestamp approved_at
        uuid resolved_by FK
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    MARKET_REVIEWS {
        uuid id PK
        varchar code UK
        uuid market_id FK
        uuid reviewer_id FK
        varchar status
        text comment
        timestamp created_at
    }

    MARKET_OPTIONS {
        uuid id PK
        uuid market_id FK
        varchar label
        numeric min_value
        numeric max_value
        numeric pool
        integer sort_order
        boolean is_winning_option
    }

    TRADES {
        uuid id PK
        varchar code UK
        uuid user_id FK
        uuid market_id FK
        uuid option_id FK
        varchar side
        varchar action
        numeric amount
        numeric price
        numeric shares
        timestamp created_at
    }

    POSITIONS {
        uuid id PK
        uuid user_id FK
        uuid market_id FK
        uuid option_id FK
        numeric yes_shares
        numeric no_shares
        numeric yes_cost
        numeric no_cost
        numeric shares
        numeric cost
        varchar status
        timestamp updated_at
    }

    MARKET_PRICE_HISTORY {
        uuid id PK
        uuid market_id FK
        uuid option_id FK
        numeric yes_price
        numeric no_price
        numeric option_price
        numeric trade_volume
        timestamp recorded_at
    }

    USER_PORTFOLIO_SNAPSHOTS {
        uuid id PK
        uuid user_id FK
        numeric wallet_balance
        numeric position_value
        numeric total_asset_value
        numeric realized_profit
        numeric unrealized_profit
        timestamp recorded_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid market_id FK
        varchar type
        varchar title
        text message
        varchar reference_type
        uuid reference_id
        timestamp read_at
        timestamp created_at
    }

    ADMIN_LOGS {
        uuid id PK
        varchar code UK
        uuid admin_user_id FK
        varchar action
        varchar target_type
        uuid target_id
        jsonb metadata
        timestamp created_at
    }
```

## 核心模組對應

| 模組 | 主要資料表 |
| --- | --- |
| 會員 / Auth | `users`, `user_sessions`, `user_oauth_accounts` |
| 市場 | `markets`, `market_options`, `market_reviews`, `market_price_history` |
| 交易 | `trades`, `positions`, `wallets`, `wallet_transactions` |
| Resolution 結算 | `markets`, `positions`, `wallets`, `wallet_transactions`, `users` |
| Ranking 排行榜 | `users`, `wallets`, `wallet_transactions`, `trades`, `positions`, `markets`, `market_price_history` |
| 個人績效 | `users`, `wallets`, `positions`, `trades`, `market_price_history`, `user_portfolio_snapshots` |
| 自動化 / 通知 / 後台稽核 | `notifications`, `admin_logs` |

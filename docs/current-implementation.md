# UcMarket 目前實作基準

更新基準：`eagle` 分支，commit `b09cf20`。本文件描述目前程式碼，不是未來規劃；若與歷史審查、工作計劃或設計稿衝突，以程式碼、測試與本文件為準。

## 執行技術

- 前端：React、Vite、React Router、Zustand、Bootstrap、Chart.js、Firebase Web SDK。
- 後端：Java 21、Spring Boot 3.5、Spring MVC、Spring Security、Spring Data JPA、JWT、Firebase Admin SDK。
- 正式資料庫：PostgreSQL；`spring.jpa.hibernate.ddl-auto=none`，需先套用 `資料庫設計/ucmarket-ddl.sql`。
- 後端測試：H2 PostgreSQL mode，Hibernate `create-drop`；`data.sql` 另建立排行榜查詢需要的 `market_price_history`。

## 已接通的主要能力

- 原生帳密註冊／登入、Firebase OAuth、access/refresh token、個人資料與修改密碼。
- 市場列表、詳情、建立、編輯、送審、審核、退回、拒絕與結算。
- 時事市場分頁 API，以及首頁／時事詳情頁串接。
- BUY 型 Yes/No 交易、錢包扣款、持倉、結算派彩與錢包流水。
- 收益、勝率、資產三種排行榜，以及合併 snapshot API。
- 管理員 dashboard、市場、使用者、交易與 audit log 頁面／API。

尚未實作：SELL、多選項／次數型市場、通知資料表、資產快照資料表、n8n 正式 workflow、OpenAPI/Swagger 與正式價格歷史寫入流程。

## 後端 API 基準

| 模組 | 目前路由 |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `/api/auth/register`、`/login`、`/oauth/firebase`、`/me`、`/logout`、`/refresh`、`/profile`、`/change-password` |
| Markets | `GET/POST /api/markets`、`GET/PUT /api/markets/{id}`、`GET /api/markets/code/{code}`、`POST /api/markets/{id}/submit` |
| Current affairs | `GET /api/current-affairs/markets?status=&sort=&page=&size=` |
| Trades | `POST /api/trades` |
| Positions | `GET /api/positions/me`、`/me/open`、`/market/{marketId}`、`/market/{marketId}/open` |
| Wallet | `GET /api/wallets/me/balance`、`/me/transactions?page=` |
| Rankings | `GET /api/rankings?metric=profit|win-rate|assets`，並保留 `/profit`、`/win-rate`、`/assets` |
| Admin | `/api/admin/dashboard/**`、`/markets/**`、`/users/**`、`/transactions`、`/logs` |

`GET /api/health`、公開市場、時事市場與排行榜可匿名讀取；`/api/admin/**` 需要 ADMIN，其他未列為公開的 API 需要登入。

## 前端路由基準

- 公開：`/`、`/home`、`/markets`、`/markets/:id`、各主題詳情、`/auth/login`、`/auth/register`、`/rankings`。
- `/markets/current-affairs` 目前導向 `/home`；時事列表整合在首頁，詳情為 `/markets/current-affairs/:id`。
- 會員：`/portfolio`、`/wallet`、`/positions`、`/trades`、`/markets/new`。
- 管理員：`/admin/login` 與 `/admin/{dashboard,markets,users,admins,transactions,settings,logs}`。

## 目前資料庫範圍

Canonical DDL 只包含程式碼實際映射或查詢的 11 個表：

`users`、`user_sessions`、`user_oauth_accounts`、`wallets`、`markets`、`market_reviews`、`trades`、`positions`、`market_price_history`、`wallet_transactions`、`admin_logs`。

其中 `market_price_history` 沒有 JPA entity，是 `RankingRepository` 的 native SQL read model。`positions.option_id` 也不是 JPA 欄位，但目前 `PositionRepository` upsert 與 `RankingRepository` 會以 `option_id IS NULL` 識別 binary position，因此 DDL 必須保留此欄與 partial unique index。排行榜不依賴資料庫 view；`RankingRepository` 直接從目前資料表計算。

## 驗證指令

```powershell
cd backend
$env:SPRING_DATASOURCE_URL=$null
$env:SPRING_DATASOURCE_USERNAME=$null
$env:SPRING_DATASOURCE_PASSWORD=$null
.\mvnw.cmd test

cd ..\frontend
npm.cmd run test -- --run
npm.cmd run build
```

需要真後端與測試資料庫時才執行 `npm.cmd run test:int`；該指令會建立拋棄式測試帳號。

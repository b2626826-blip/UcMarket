# UcMarket 目前實作基準

更新基準：`eagle` 分支，commit `95a44e0`（2026-07-14）。本文件描述目前程式碼，不是未來規劃；若與歷史審查、工作計劃或設計稿衝突，以程式碼、測試、Flyway migrations 與本文件為準。

## 執行技術

- 前端：React、Vite、React Router、Zustand、Bootstrap、Chart.js、Firebase Web SDK。
- 後端：Java 21、Spring Boot 3.5、Spring MVC、Spring Security、Spring Data JPA、JWT、Firebase Admin SDK。
- 正式資料庫：PostgreSQL；Hibernate 使用 `ddl-auto=none`，Flyway 啟動時依序套用 `backend/src/main/resources/db/migration/` 的版本化 migration，目前到 `V5`。
- 後端測試：H2 PostgreSQL mode、Hibernate `create-drop`，並停用 Flyway；migration 仍需另在 PostgreSQL 驗證。
- 自動化：目前排程直接由 Spring `@Scheduled` 執行，第一階段不導入 n8n 或訊息佇列。

## 已接通的主要能力

- 原生帳密註冊／登入、Firebase OAuth、access/refresh token、個人資料、頭像／簡介與修改密碼。
- 市場列表、分類查詢、詳情、建立、編輯、送審、審核、退回、拒絕、取消、自動截止與結算。
- 首頁時事市場，以及政治、天氣、運動、時事、金融主題詳情；政治與天氣另有列表頁。
- BUY 型 Yes/No 交易試算與下單、`Idempotency-Key`、錢包扣款、持倉、結算派彩與錢包流水。
- 交易後寫入價格歷史，並每 5 分鐘為 ACTIVE 市場建立價格 snapshot。
- 應用程式啟動時與每日排程自動建立天氣市場；每小時檢查可結算天氣市場，並提供管理員手動觸發入口。
- 收益、勝率、資產三種排行榜，以及合併 snapshot API。
- 管理員 dashboard、市場、使用者、交易與 audit log 頁面／API。

尚未實作：SELL、多選項／次數型市場、通知工作與寄信、資產快照資料表、OpenAPI/Swagger、Docker，以及前端已宣告但後端尚未提供的交易歷史與價格歷史讀取 API。n8n 只保留空目錄，不是目前實作方向。

## 後端 API 基準

| 模組 | 目前路由 |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `/api/auth/register`、`/login`、`/oauth/firebase`、`/me`、`/logout`、`/refresh`、`PUT /profile`、`POST /change-password` |
| Markets | `GET/POST /api/markets`、`GET/PUT /api/markets/{id}`、`GET /api/markets/code/{code}`、`POST /api/markets/{id}/submit`、`/cancel`、`GET /odds`、`POST /trades/quote` |
| Current affairs | `GET /api/current-affairs/markets?status=&sort=&page=&size=` |
| Trades | `POST /api/trades` |
| Positions | `GET /api/positions/me`、`/me/open`、`/market/{marketId}`、`/market/{marketId}/open` |
| Wallet | `GET /api/wallets/me/balance`、`/me/transactions?page=`、`/me/transactions/all` |
| Rankings | `GET /api/rankings?metric=profit|win-rate|assets`，並保留 `/profit`、`/win-rate`、`/assets` |
| Admin | `/api/admin/dashboard/**`、`/markets/**`、`/users/**`、`/transactions`、`/logs` |
| Weather admin | `POST /api/admin/weather/resolve` |

`GET /api/health`、公開市場、時事市場與排行榜可匿名讀取；`/api/admin/**` 需要 ADMIN，其他未列為公開的 API 需要登入。`GET /api/trades` 與 `GET /api/markets/{id}/price-history` 目前只有前端 client 宣告，後端沒有對應 Controller route。

## 前端路由基準

- 公開：`/`、`/home`、`/markets`、`/markets/politics`、`/markets/weather`、各主題詳情、`/auth/login`、`/auth/register`、`/rankings`。
- `/markets/current-affairs` 導向 `/home`；時事列表整合在首頁，詳情為 `/markets/current-affairs/:id`。
- 主題詳情：`/markets/{weather|politics|sports|current-affairs|finance}/:id`。
- 會員：`/portfolio`、`/wallet`、`/positions`、`/trades`、`/markets/new`、`/profile`，皆由 `AuthGuard` 保護。
- 管理員：`/admin/login` 與 `/admin/{dashboard,markets,users,admins,transactions,settings,logs}`；開發模式下 `AdminGuard` 仍允許未登入進入，正式部署前必須關閉此例外。

## 目前資料庫範圍

Canonical DDL 與 Flyway 最終 schema 包含 11 個應用資料表：

`users`、`user_sessions`、`user_oauth_accounts`、`wallets`、`markets`、`market_reviews`、`trades`、`positions`、`market_price_history`、`wallet_transactions`、`admin_logs`。

`market_price_history` 已有 JPA entity、repository 與寫入 service；交易完成時寫入成交後價格，排程也會建立 ACTIVE 市場 snapshot。`positions.option_id` 不是 JPA 欄位，但 `PositionRepository` 與 `RankingRepository` 的 native SQL 會以 `option_id IS NULL` 識別 binary position，因此 DDL 必須保留此欄與 partial unique index。排行榜不依賴資料庫 view，由 `RankingRepository` 直接查詢目前資料表。

Flyway `V1` 建立初始 schema；`V2`、`V3`、`V5` 分別補上市場圖片、metadata 與價格歷史 `option_price`，`V4` 建立天氣系統使用者。閱讀用 `docs/資料庫設計/ucmarket-ddl.sql` 與 ERD 已包含這些欄位。

## 目前自動排程

| 工作 | 頻率 | 實作 |
| --- | --- | --- |
| 關閉逾期 ACTIVE 市場 | 每 60 秒 | `MarketService.autoCloseExpiredMarkets()` |
| 建立 ACTIVE 市場價格 snapshot | 每 5 分鐘 | `PriceHistoryService.snapshotActiveMarkets()` |
| 建立天氣市場 | 應用程式啟動時、每日 12:00 | `WeatherMarketService.onApplicationReady()`／`createDailyWeatherMarkets()` |
| 天氣市場自動結算 | 預設每小時 | `WeatherMarketResolutionService.resolveWeatherMarkets()` |

天氣建立與結算可透過 `CWA_API_KEY`、`WEATHER_MOCK_ENABLED`、`WEATHER_RESOLUTION_ENABLED`、`WEATHER_RESOLUTION_CRON`、`WEATHER_MOCK_OBSERVATION_ENABLED` 調整；正式環境不可依賴預設 mock 設定。

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

涉及 migration 時，還要在可丟棄的 PostgreSQL 資料庫套用 `backend/src/main/resources/db/migration/`，不能只以 H2 測試通過作為證據。需要真後端與測試資料庫時才執行 `npm.cmd run test:int`；該指令會建立拋棄式測試帳號。

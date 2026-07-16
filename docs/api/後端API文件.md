# UcMarket 後端 API 文件

> 來源：`backend/src/main/java/com/ucmarket/controller/` 全部 15 個 Controller（2026-07-14 整理）。
> 認證方式：JWT Bearer Token（`@AuthenticationPrincipal User`），Admin 端點由 SecurityConfig 限制 ADMIN 角色。

## 目錄

- [健康檢查](#健康檢查)
- [認證 Auth](#認證-auth)
- [市場 Markets](#市場-markets)
- [時事市場 Current Affairs](#時事市場-current-affairs)
- [交易 Trades](#交易-trades)
- [持倉 Positions](#持倉-positions)
- [錢包 Wallets](#錢包-wallets)
- [排行榜 Rankings](#排行榜-rankings)
- [管理後台 Admin](#管理後台-admin)
- [開發用 Dev（僅 dev profile）](#開發用-dev僅-dev-profile)

---

## 健康檢查

`HealthController.java`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/health` | 無 | 健康檢查，回傳 `{"status":"ok"}` |

## 認證 Auth

`AuthController.java` — base path `/api/auth`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| POST | `/api/auth/register` | 無 | 註冊新使用者，回傳 201 + `AuthResponse`（含 token）；註冊流程同一交易內建立錢包 |
| POST | `/api/auth/oauth/firebase` | 無 | Firebase OAuth 登入（body: `idToken`, `provider`），回傳 `AuthResponse` |
| POST | `/api/auth/login` | 無 | Email + 密碼登入，回傳 `AuthResponse` |
| GET | `/api/auth/me` | JWT | 取得目前登入者資訊（`UserInfo`），未登入回 401 |
| POST | `/api/auth/logout` | JWT | 登出，body 需帶 `refreshToken` 使其失效，成功回 204 |
| POST | `/api/auth/refresh` | 無 | 用 `refreshToken` 換發新 token，回傳 `AuthResponse` |
| PUT | `/api/auth/profile` | JWT | 更新個人資料（`username`, `avatarUrl`, `bio`） |
| POST | `/api/auth/change-password` | JWT | 修改密碼（`oldPassword`, `newPassword`），成功回 204 |

## 市場 Markets

`MarketController.java` — base path `/api/markets`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/markets` | 無 | 列出 **ACTIVE** 市場（僅回傳 ACTIVE，query: `page`、`size`、`category` 可選），依建立時間新→舊，含成交量 |
| GET | `/api/markets/{id}` | 無 | 依 UUID 取得單一市場詳情（含成交量），找不到回 404 |
| GET | `/api/markets/code/{code}` | 無 | 依市場代碼（code）取得市場詳情 |
| POST | `/api/markets` | JWT | 建立市場（初始狀態 DRAFT），回 201；建立者為登入者 |
| POST | `/api/markets/{id}/submit` | JWT | 將自己的 DRAFT 市場送審（DRAFT → PENDING）；非建立者回 403、非 DRAFT 回 400 |
| PUT | `/api/markets/{id}` | JWT | 編輯自己的 DRAFT 市場（僅 DRAFT 可編輯，欄位皆為部分更新） |
| POST | `/api/markets/{id}/cancel` | JWT | 取消市場（建立者或 ADMIN 可執行），錯誤依情況回 404/403/400 |
| POST | `/api/markets/{id}/trades/getquote` | 無 | 取得交易報價（body: `side`, `amount`），市場非 ACTIVE 回 400 |
| POST | `/api/markets/{id}/trades/quote` | 無 | 同上的別名端點（呼叫相同邏輯） |
| GET | `/api/markets/{id}/odds` | 無 | 取得市場賠率、YES/NO 資金池與總成交量 |

## 時事市場 Current Affairs

`CurrentAffairsMarketController.java` — base path `/api/current-affairs/markets`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/current-affairs/markets` | 無 | 分頁列出時事市場（query: `status` 預設 ACTIVE、`sort`＝`popular`/`latest`/`closing`、`page`、`size` 上限 50），回傳含分頁資訊的 `CurrentAffairsMarketPageResponse` |

## 交易 Trades

`TradeController.java` — base path `/api/trades`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| POST | `/api/trades` | JWT | 下單交易（body: `TradeRequest`），回傳成立的 `Trade` |

## 持倉 Positions

`PositionController.java` — base path `/api/positions`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/positions/me` | JWT | 取得自己的全部持倉 |
| GET | `/api/positions/me/open` | JWT | 取得自己的未結算（open）持倉 |
| GET | `/api/positions/market/{marketId}` | 無 | 取得某市場的全部持倉 |
| GET | `/api/positions/market/{marketId}/open` | 無 | 取得某市場的未結算持倉 |

## 錢包 Wallets

`WalletController.java` — base path `/api/wallets`。錢包建立不開放 HTTP 端點（註冊時自動建立），僅提供查詢；userId 一律取自 JWT，避免 IDOR。

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/wallets/me/balance` | JWT | 查詢自己的錢包餘額 |
| GET | `/api/wallets/me/transactions` | JWT | 分頁查詢自己的錢包交易紀錄（query: `page` 預設 0） |
| GET | `/api/wallets/me/transactions/all` | JWT | 查詢自己的全部錢包交易紀錄 |

## 排行榜 Rankings

`RankingController.java` — base path `/api/rankings`

| 方法 | 路徑 | 認證 | 功用 |
|---|---|---|---|
| GET | `/api/rankings` | 無 | 排行榜快照（query: `metric`＝`profit`/`win-rate`/`assets`，預設 profit），單一查詢回傳同一時間點的所有欄位與排序 |
| GET | `/api/rankings/profit` | 無 | 已實現損益排行（已結算派彩總額 − 已結算持倉成本，高→低） |
| GET | `/api/rankings/win-rate` | 無 | 勝率排行（已結算市場中預測正確比例，高→低） |
| GET | `/api/rankings/assets` | 無 | 總資產排行（錢包餘額 ＋ 未結算持倉市值，高→低） |

## 管理後台 Admin

以下端點皆需 ADMIN 角色（SecurityConfig 統一控管）。

### 儀表板 — `AdminDashboardController.java`（`/api/admin/dashboard`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| GET | `/api/admin/dashboard/stats` | 取得後台儀表板統計數據 |
| GET | `/api/admin/dashboard/reviews` | 取得待審核的市場清單 |

### 市場管理 — `AdminMarketController.java`（`/api/admin/markets`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| GET | `/api/admin/markets` | 取得市場摘要統計 ＋ 全部市場清單（`AdminMarketListResponse`） |
| POST | `/api/admin/markets/{id}/approve` | 核准市場上架 |
| POST | `/api/admin/markets/{id}/reject` | 駁回市場（body: `comment`） |
| POST | `/api/admin/markets/{id}/request-changes` | 要求修改後再送審（body: `comment`） |
| POST | `/api/admin/markets/{id}/resolve` | 結算市場（body: `result`） |
| GET | `/api/admin/markets/{id}/reviews` | 取得該市場的審核紀錄（新→舊） |

### 使用者管理 — `AdminUserController.java`（`/api/admin/users`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| GET | `/api/admin/users` | 列出使用者（query: `role`、`status` 可選過濾） |
| POST | `/api/admin/users/{id}/suspend` | 停權使用者（狀態改為 BANNED） |
| POST | `/api/admin/users/{id}/unsuspend` | 復權使用者（狀態改為 ACTIVE） |

### 交易紀錄 — `AdminTransactionController.java`（`/api/admin/transactions`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| GET | `/api/admin/transactions` | 列出全站交易紀錄（新→舊），並補上使用者代碼與市場代碼 |

### 操作日誌 — `AdminLogController.java`（`/api/admin/logs`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| GET | `/api/admin/logs` | 列出管理員操作日誌（新→舊），並補上管理員與目標對象的代碼 |

### 天氣市場 — `AdminWeatherController.java`（`/api/admin/weather`）

| 方法 | 路徑 | 功用 |
|---|---|---|
| POST | `/api/admin/weather/resolve` | 手動觸發所有符合條件的天氣市場自動結算 |

## 開發用 Dev（僅 dev profile）

`DevWalletController.java` — base path `/api/dev/wallets`，標註 `@Profile("dev")`，**prod 不會註冊此端點**。原始碼註明測試完應整支刪除。

| 方法 | 路徑 | 功用 |
|---|---|---|
| POST | `/api/dev/wallets/credit` | 手動加值錢包（測試用） |
| POST | `/api/dev/wallets/debit` | 手動扣款錢包（測試用） |

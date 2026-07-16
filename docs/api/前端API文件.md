# UcMarket 前端 API 文件

> 來源：`frontend/src/api/` 全部模組 ＋ `frontend/src/pages/public/market-detail-weather/weatherApi.js`（2026-07-14 整理）。

## 共用 HTTP Client — `src/api/client.js`

所有 API 模組共用的 fetch 封裝：

- `BASE_URL`：寫死 `http://localhost:8080`。
- 認證：自動從 `localStorage` 的 `ucmarket_admin_token` 帶上 `Authorization: Bearer <token>`；提供 `setToken(t)` / `getToken()` 管理。
- 提供 `getApi` / `postApi` / `putApi` / `deleteApi` 四個方法，皆帶 `credentials: 'include'`。
- 錯誤處理（`handleResponse`）：
  - `401` / `403` → 清除 token 並導向 `/auth/login`。
  - 其他非 2xx → 丟出帶 `status` 的 Error（訊息取自回應的 `message`/`error`）。
  - `204` → 回傳 `null`。

## 認證 — `src/api/authApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getCurrentUser()` | GET `/api/auth/me` | 取得目前登入者資訊 |
| `login(email, password)` | POST `/api/auth/login` | Email 密碼登入 |
| `register(username, email, password, idempotencyKey)` | POST `/api/auth/register` | 註冊，帶 `Idempotency-Key` header 防重複送出 |
| `logout()` | GET `/api/auth/logout` | 登出（⚠️ 與後端不符，見文末） |
| `updateProfile(profile)` | PUT `/api/auth/profile` | 更新個人資料 |
| `changePassword(oldPassword, newPassword)` | POST `/api/auth/change-password` | 修改密碼 |
| `checkAdminSession()` | GET `/api/auth/me` | 檢查管理員登入狀態（與 `getCurrentUser` 同端點） |

## OAuth — `src/api/oauthApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `firebaseLogin(idToken, provider)` | POST `/api/auth/oauth/firebase` | Firebase OAuth 登入（Google 等第三方） |

## 市場 — `src/api/marketApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getMarkets({page, size})` | GET `/api/markets` | 分頁列出市場（帶 `status=ACTIVE` 參數，後端固定只回 ACTIVE） |
| `getMarketsByCategory(category)` | GET `/api/markets?category=...&size=1000` | 依分類一次抓全部市場 |
| `getMarketDetail(id)` | GET `/api/markets/{id}` | 市場詳情 |
| `getMarketOdds(id)` | GET `/api/markets/{id}/odds` | 市場賠率與資金池 |
| `getTradeQuote(marketId, request)` | POST `/api/markets/{id}/trades/quote` | 交易報價試算 |
| `getMarketPriceHistory(id, from, to)` | GET `/api/markets/{id}/price-history` | 價格歷史（⚠️ 後端無此端點，見文末） |
| `placeTrade(request, idempotencyKey)` | POST `/api/trades` | 下單，帶 `Idempotency-Key` header |
| `createMarket(data)` | POST `/api/markets` | 建立市場（DRAFT） |
| `submitMarket(id)` | POST `/api/markets/{id}/submit` | DRAFT 市場送審 |
| `cancelMarket(id)` | POST `/api/markets/{id}/cancel` | 取消市場 |
| `getCurrentEventMarkets(filters)` | GET `/api/markets?category=...` | 時事市場清單：抓回後在**前端**做關鍵字、篩選器、排序（latest/closing）過濾與正規化（計算 `yesProbability`/`noProbability`） |
| `getPagedCurrentEventMarkets(filters)` | GET `/api/current-affairs/markets` | 時事市場分頁清單（`status`、`sort`、`page`、`size`），由後端分頁排序，回傳後做正規化 |
| `getCurrentEventMarketDetail(id)` | GET `/api/markets/{id}` | 時事市場詳情；分類不符時回 `null` |
| `getAdminMarkets()` | GET `/api/admin/markets` | 後台市場清單與摘要 |
| `approveMarket(id)` | POST `/api/admin/markets/{id}/approve` | 後台核准市場 |
| `rejectMarket(id, comment)` | POST `/api/admin/markets/{id}/reject` | 後台駁回市場 |
| `requestMarketChanges(id, comment)` | POST `/api/admin/markets/{id}/request-changes` | 後台要求修改 |
| `resolveMarket(id, result)` | POST `/api/admin/markets/{id}/resolve` | 後台結算市場 |

## 交易 — `src/api/tradeApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getTrades()` | GET `/api/trades` | 取得交易清單（⚠️ 後端無此端點，見文末） |
| `createTrade(data, idempotencyKey)` | POST `/api/trades` | 下單，帶 `Idempotency-Key` header（與 `marketApi.placeTrade` 重複） |
| `getAdminTransactions()` | GET `/api/admin/transactions` | 後台全站交易紀錄（與 `adminApi` 重複） |

## 持倉 — `src/api/positionApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getPositions()` | GET `/api/positions` | 取得持倉清單（⚠️ 後端實際端點是 `/api/positions/me`，見文末） |
| `getPositionDetail(id)` | GET `/api/positions/{id}` | 持倉詳情（⚠️ 後端無此端點，見文末） |

## 錢包 — `src/api/walletApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getWallet()` | GET `/api/wallets/me/balance` | 查詢自己的錢包餘額 |
| `getWalletTransactions(page)` | GET `/api/wallets/me/transactions?page=` | 分頁查詢錢包交易紀錄 |
| `getAllWalletTransactions()` | GET `/api/wallets/me/transactions/all` | 查詢全部錢包交易紀錄 |

## 排行榜 — `src/api/rankingApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `fetchRankings(type)` | GET `/api/rankings?metric={type}` | 取得排行榜快照（`profit`/`win-rate`/`assets`）；同一 metric 的請求會去重（in-flight cache），回傳前將欄位轉為前端格式（`winRate` ×100、數值轉型等） |

## 管理後台 — `src/api/adminApi.js`

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `getDashboardStats()` | GET `/api/admin/dashboard/stats` | 後台儀表板統計 |
| `getDashboardReviews()` | GET `/api/admin/dashboard/reviews` | 待審核市場清單 |
| `getAdminLogs(params)` | GET `/api/admin/logs` | 管理員操作日誌 |
| `getAdminUsers(params)` | GET `/api/admin/users` | 使用者清單（可帶 `role`/`status` 過濾） |
| `suspendUser(id)` | POST `/api/admin/users/{id}/suspend` | 停權使用者 |
| `unsuspendUser(id)` | POST `/api/admin/users/{id}/unsuspend` | 復權使用者 |
| `getAdminTransactions(params)` | GET `/api/admin/transactions` | 全站交易紀錄 |

## 天氣（外部 API）— `src/pages/public/market-detail-weather/weatherApi.js`

呼叫的是**中央氣象署（CWA）開放資料 API**，不經過 UcMarket 後端。

| 函式 | 呼叫端點 | 功用 |
|---|---|---|
| `fetchCityForecast(city)` | GET `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001` | 取得指定縣市未來天氣預報（最高/最低溫、降雨機率、天氣現象），城市名自動轉為 CWA 正式地名（台→臺）；未設定 `VITE_CWA_API_KEY` 或請求失敗時回退 mock 資料 |

## 其他零散呼叫

- [settings/index.jsx:12](frontend/src/pages/admin/settings/index.jsx:12)：直接 `fetch('/api/health')`（相對路徑、未經 client.js，dev 環境依賴 Vite proxy 或同源部署）。

---

## ⚠️ 前後端不一致清單

整理文件時發現以下前端呼叫與後端實際端點不符，呼叫會得到 404 / 405 / 401：

1. **`authApi.logout()`** 用 **GET** `/api/auth/logout`；後端是 **POST** 且 body 需帶 `refreshToken`。
2. **`positionApi.getPositions()`** 呼叫 `/api/positions`；後端只有 `/api/positions/me`、`/me/open`、`/market/{marketId}`、`/market/{marketId}/open`。
3. **`positionApi.getPositionDetail(id)`** 呼叫 `/api/positions/{id}`；後端無此端點。
4. **`tradeApi.getTrades()`** 用 GET `/api/trades`；後端 `/api/trades` 只有 POST。
5. **`marketApi.getMarketPriceHistory(id)`** 呼叫 `/api/markets/{id}/price-history`；後端無此端點。
6. （次要）`marketApi.getMarkets()` 傳 `status=ACTIVE` query 參數，後端 `GET /api/markets` 並不接受 `status` 參數（固定只回 ACTIVE），參數會被忽略。

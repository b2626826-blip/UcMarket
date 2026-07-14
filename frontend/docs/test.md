# 前端測試說明

> 本文件依目前 `src/test/ApiTest` 整理。單元測試與 build 可本機獨立驗證；integration 需要正在執行的後端，且會寫入拋棄式帳號，不能與純單元測試混為同一驗證結果。

## 概述

- **Runner**：Vitest（共用 `vite.config.js`，`environment: jsdom`）
- **測試位置**：`src/test/ApiTest/`（單元）與 `src/test/ApiTest/integration/`（整合）
- **相依**：`vitest`、`jsdom`（devDependencies）

### 指令

| 指令 | 作用 |
|---|---|
| `npm run test` | 單元測試（整合測試自動略過，不需後端） |
| `npm run test -- --run` | 單元測試跑一次即結束（非 watch） |
| `npm run test:int` | 單元 + 整合測試（需先啟動後端） |

整合測試以環境變數 `RUN_INTEGRATION=1` gate；未設定時自動略過，`npm run test` 不會因後端未啟動而變紅。

---

## 一、前端測試（單元，mock fetch）

以 `vi.stubGlobal('fetch', ...)` mock 全域 `fetch`，驗證各 API 模組的 URL、method、body、query 組裝與回傳解析，**不需後端**。共用工具在 `src/test/ApiTest/_helpers.js`。

| 測試檔 | 覆蓋模組 | 重點 |
|---|---|---|
| `client.test.js` | `api/client.js` | `authHeaders`（有/無 token）、`getApi`/`postApi`/`putApi`/`deleteApi`、`handleResponse`（ok / 401 / 403 / 一般錯誤 / 非 JSON fallback）、`setToken`/`getToken` |
| `marketApi.test.js` | `api/marketApi.js` | query 組裝（category/page/size/status）、`status` 空字串不帶參數、status 過濾、`sort=latest/closing`、keyword 過濾、`getCurrentEventMarketDetail` null 分支、`createMarket`/`rejectMarket` body |
| `rankingApi.test.js` | `api/rankingApi.js` | 三端點合併同一 `userId`、`winRate` 乘 100、排序與 `rank`、有值優先於 null、in-flight 併發去重 |
| `authApi.test.js` | `api/authApi.js` | `login`/`register` body、`getCurrentUser`/`checkAdminSession`/`logout` URL |
| `adminApi.test.js` | `api/adminApi.js` | 有/無 `params` 的 query string、`suspendUser`/`unsuspendUser` POST body null |
| `tradeApi.test.js` | `api/tradeApi.js` | `getTrades`/`createTrade`/`getAdminTransactions` URL 與 body |
| `walletApi.test.js` | `api/walletApi.js` | `getWallet`、分頁與全部錢包流水 |
| `positionApi.test.js` | `api/positionApi.js` | `getPositions`/`getPositionDetail` URL |
| `oauthApi.test.js` | `api/oauthApi.js` | `firebaseLogin` POST body |
| `weatherApi.test.js` | `pages/public/market-detail-weather/weatherApi.js` | 無 API key → mock 資料；有 key 成功 → `parseForecast`；HTTP 失敗 / fetch reject / location 不符 → fallback mock |
| `authInitialization.test.jsx` | `store/authStore.js` / guard 初始化 | token 還原與登入初始化狀態 |
| `homeCurrentEvents.test.js` | 首頁時事資料 | 首頁取得與整理時事市場 |
| `currentEventMarketCard.test.jsx`、`marketCard.test.jsx` | 市場卡片 | 欄位、導頁與顯示規則 |
| `tradePanel.test.jsx` | `components/market/TradePanel.jsx` | quote、下單與錯誤狀態 |
| `rankingsPage.test.jsx` | 排行榜頁 | metric 切換與資料顯示 |
| `userLayoutFooter.test.jsx` | 使用者 layout | Footer 與主要 layout 行為 |

> 天氣預報邏輯只有 `pages/public/market-detail-weather/weatherApi.js` 一份；舊的 `src/api/weatherApi.js` 已移除。

---

## 二、前後端整合測試（打真後端）

實際對 `http://localhost:8080` 發請求，端到端驗證前後端契約。斷言採「不變式」（陣列、status/category、rank 連續）而非固定值，因 DB 資料未知。

### 執行方式

```bash
# 1. 啟動後端（另一個終端機）
cd backend && ./mvnw spring-boot:run

# 2. 跑整合測試
cd frontend && npm run test:int
```

admin 正向測試需憑證，用環境變數帶入（未設定則自動略過）：

```bash
TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:int
```

### 測試檔與範圍

| 測試檔 | 範圍 | 內容 |
|---|---|---|
| `integration/currentAffairs.int.test.js` | 時事市場（公開） | 後端 `?status=ACTIVE` 只回 ACTIVE；`getCurrentEventMarkets` 回 `{ content }` 且皆時事分類 ACTIVE |
| `integration/rankings.int.test.js` | 排行榜（公開） | 三端點回陣列；`fetchRankings` rank 由 1 連續遞增；assets 端點欄位契約（`userId`、`totalAssetValue`） |
| `integration/authed.int.test.js` | 使用者端 authed | 以「註冊拋棄式帳號」取得 token，GET-only：`/api/auth/me`、`/wallets/me/balance`、`/wallets/me/transactions` |
| `integration/admin.int.test.js` | admin | 授權邊界（USER token → 403、無 token → 401/403）；admin 正向（需憑證，gated） |

### 帳號與副作用

- 使用者端 authed 測試每次跑會在 dev DB **註冊一個拋棄式帳號**（唯一 email），僅做 GET、不建立交易。
- 授權邊界測試用原生 `fetch` 直接檢查 HTTP 狀態碼（因 `client.js` 的 `handleResponse` 會把 401/403 吞成 `null`）。

### 已知契約不符（測試中記錄，前端未修）

下列前端 API wrapper 打的是後端不存在／不支援的路由，且**前端零使用（死碼）**。整合測試以「預期 reject 500」精確記錄現況——若後端補上路由或前端修正，測試會翻紅提醒。

| 前端函式 | 打的路由 | 後端實況 |
|---|---|---|
| `positionApi.getPositions()` | `GET /api/positions` | 只有 `/api/positions/me`、`/me/open`、`/market/{id}` |
| `tradeApi.getTrades()` | `GET /api/trades` | `/api/trades` 只有 `@PostMapping`（無列表 GET） |
| `positionApi.getPositionDetail()` | `GET /api/positions/{id}` | 無此路由（未寫測試，連帶記錄） |
| `marketApi.getMarketPriceHistory()` | `GET /api/markets/{id}/price-history` | 前端已宣告，但後端尚無讀取 route |

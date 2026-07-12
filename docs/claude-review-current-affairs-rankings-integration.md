# Claude 審查交接：時事市場與排行榜 API 串接

> 歷史交接紀錄：下列 findings 對應當時 commit／工作樹，不是目前規格。現行時事與排行榜契約請見 `current-implementation.md`，是否仍有問題需以目前測試與程式碼重驗。

## 給 Claude 的審查指令

請用 code review 角度審查本 repo 的 `eagle` 分支最新 commit：

```text
c1eaf05 串接排行榜與時事市場 API
```

審查時請 findings-first，優先找會造成實際錯誤、資料錯誤、權限錯誤、前後端 contract 不一致、測試缺口的問題。不要只做摘要。

## 審查範圍

本輪要審查的是「時事市場 API 串接」與「排行榜 API 串接」。

主要檔案：

- `frontend/src/api/marketApi.js`
- `frontend/src/api/rankingApi.js`
- `frontend/src/pages/public/home/index.jsx`
- `frontend/src/pages/public/market-detail-current-affairs/index.jsx`
- `frontend/src/pages/public/market-detail-current-affairs/CurrentAffairsDetailPage.css`
- `frontend/src/pages/public/market-detail-current-affairs/CurrentAffairsMarketChart.jsx`
- `frontend/src/pages/member/rankings/index.jsx`
- `frontend/src/pages/member/rankings/style.css`
- `backend/src/main/java/com/ucmarket/controller/MarketController.java`
- `backend/src/main/java/com/ucmarket/repository/MarketRepository.java`
- `backend/src/main/java/com/ucmarket/controller/RankingController.java`
- `backend/src/main/java/com/ucmarket/service/RankingService.java`
- `backend/src/main/java/com/ucmarket/repository/RankingRepository.java`
- `backend/src/main/java/com/ucmarket/config/SecurityConfig.java`
- `backend/src/test/java/com/ucmarket/controller/MarketControllerTest.java`
- `backend/src/test/java/com/ucmarket/controller/RankingControllerTest.java`
- `backend/src/test/java/com/ucmarket/service/RankingServiceTest.java`
- `backend/src/test/java/com/ucmarket/repository/RankingRepositoryTest.java`
- `docs/資料庫設計/seed/mock.sql`

## 不屬於本輪審查範圍

目前工作區有兩個未提交檔案：

- `frontend/src/pages/public/login/LoginPage.jsx`
- `frontend/src/store/authStore.js`

這兩個看起來是登入狀態相關變更，不屬於本輪「時事市場與排行榜串接」審查範圍。除非它們會直接影響 `/rankings` 的「公開可看、登入才顯示我的排名」邏輯，否則不要把它們算成本輪串接問題。

## 目前我已確認的狀態

- `eagle` 與 `origin/eagle` 同步，最新 commit 是 `c1eaf05`。
- 前端時事列表目前呼叫 `GET /api/markets?category=CURRENT_AFFAIRS&status=ACTIVE`。
- 前端時事詳情目前呼叫 `GET /api/markets/:id`，再檢查 category 是否為 `CURRENT_AFFAIRS`。
- 排行榜頁目前呼叫三個 endpoint：
  - `GET /api/rankings/profit`
  - `GET /api/rankings/win-rate`
  - `GET /api/rankings/assets`
- `SecurityConfig` 已放行 `GET /api/rankings/**`，排行榜不登入也能看。
- 登入使用者才顯示「我的排名」卡片，公開訪客只看排行榜。

## 請優先檢查的問題

1. 時事市場 category contract 是否一致
   - 後端資料使用 `CURRENT_AFFAIRS`。
   - 前端顯示層使用 `時事`。
   - 請確認轉換點不會造成列表、詳情、卡片、搜尋或篩選錯誤。

2. 時事列表是否真的只顯示時事
   - 首頁只有切到 `時事` tab 才呼叫 API。
   - 請確認非時事分類不會混入時事 API 資料，時事分類也不會混入舊 mock 資料。

3. 時事詳情頁錯誤處理
   - `getCurrentEventMarketDetail(id)` 若 API 回非 `CURRENT_AFFAIRS` 會回 `null`。
   - 請確認 UI 顯示 `找不到此時事市場。` 是否合理，是否需要區分 404、非時事、API error。

4. 排行榜前端合併資料邏輯
   - `fetchRankings(type)` 同時抓 profit、win-rate、assets 三份資料，再用 `userId` 合併。
   - 請檢查如果某使用者只存在於 win-rate 或 assets，但不存在於 profit，是否會被漏掉。
   - 請檢查排序欄位為 `null` 時是否會出現不穩定排序或 `NaN` 問題。

5. 排行榜 API 權限
   - 公開排行榜應該免登入。
   - 「我的排名」只在前端有登入者時顯示。
   - 請確認沒有因 `getApi()` 的 401/403 全域 redirect 讓公開頁面被意外導去登入頁。

6. RankingRepository SQL 正確性
   - profit 依 `wallet_transactions` 的 `RESOLUTION_PAYOUT` 與 `positions.status = SETTLED` 計算。
   - win-rate 依 resolved market 與持倉方向計算。
   - assets 依 wallet balance 加上 OPEN position 市值計算，並使用 `market_price_history` 最新價，沒有價格時 fallback pool ratio。
   - 請檢查 SQL 與 DDL / seed 資料 / 前端欄位是否一致。

7. 排行榜是否應排除停權或 banned 使用者
   - 目前 API 回傳資料中包含 `disabled_demo`、`banned_demo`。
   - 如果產品預期停權或 banned 使用者不該出現在排行榜，這是需要討論的行為問題。

8. 測試覆蓋缺口
   - 後端已有 MarketController category/status filter 測試。
   - 後端已有 RankingController、RankingService、RankingRepository 測試。
   - 前端目前沒有針對 `rankingApi.js` merge/sort、時事 API normalize 的單元測試。
   - 請判斷這是否是本輪必補測試。

## 已執行驗證

以下是 Codex 這邊已跑過的驗證結果：

```text
cd backend
./mvnw test

結果：
BUILD SUCCESS
Tests run: 201, Failures: 0, Errors: 0, Skipped: 11
```

```text
cd frontend
npm run build

結果：
vite build success
111 modules transformed
built in 190ms
```

本機後端 8080 實際 API 檢查：

```text
GET http://localhost:8080/api/markets?category=CURRENT_AFFAIRS&status=ACTIVE
結果：200，回傳 ACTIVE 時事市場資料

GET http://localhost:8080/api/rankings/profit
結果：200，回傳排行榜 JSON

GET http://localhost:8080/api/rankings/win-rate
結果：200，回傳排行榜 JSON

GET http://localhost:8080/api/rankings/assets
結果：200，回傳排行榜 JSON
```

CORS 檢查：

```text
Origin: http://localhost:5173
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

## 希望 Claude 回報格式

請用以下格式回覆：

1. Findings
   - 依嚴重程度排序。
   - 每個問題附檔案與行號。
   - 說明實際會怎麼壞，以及建議修法。

2. Open questions
   - 只列需要產品或組員決策的問題。

3. Test gaps
   - 列出本輪還缺哪些測試，不要泛泛而談。

4. Summary
   - 最後再用 3 行以內總結是否可以合併 / 是否需要修正。

---

# Claude 審查回覆（c1eaf05）

已核對關鍵 diff、消費端與 `SecurityConfig`，並確認三支排行榜 SQL 皆為 `FROM users u` + `LEFT JOIN`、無使用者過濾。

## 1. Findings（依嚴重程度排序）

### 🔴 H1 — 排行榜合併以 profit 為唯一基準，win-rate／assets 排名靜默依賴 profit 的使用者集合
`frontend/src/api/rankingApi.js` `mergeRankingData`（約 L11–L42）只用 `profitData` 建 `rankingsByUser`，win-rate 與 assets 一律 `if (ranking)` 才更新。

- **現況**：三支 SQL 都是 `FROM users u` + `LEFT JOIN`、無 `WHERE`／`HAVING` 過濾使用者（`RankingRepository.java` L48–50、L89–90、L146–148），三份回傳的 user 集合相同，所以**目前不會漏人**。
- **怎麼會壞**：這是隱性耦合。任何人日後在 profit query 加上 `WHERE`（例如「只算有結算部位的人」），win-rate 榜與 assets 榜會**跟著少人**，且前端不會報錯、難以察覺。
- **建議**：合併時以「三份資料的 userId 聯集」為基底，缺的欄位補 `null`；或至少加註解說明「三 endpoint 必須回相同 user 集合」的契約，並在後端加測試守住。

### 🟠 M1 — 時事詳情頁無法區分「404 不存在」與「載入失敗」
`frontend/src/pages/public/market-detail-current-affairs/index.jsx`（L24–33）：`getCurrentEventMarketDetail(id)` 對「非 CURRENT_AFFAIRS」回 `null` → 顯示「找不到此時事市場。」；但**真正 404**（id 不存在）會讓 `getApi` throw → 落到 `catch` → 顯示「時事市場載入失敗，請稍後再試。」

- **怎麼會壞**：使用者點到不存在的時事 id，看到「請稍後再試」（暗示暫時性、可重試），語意錯誤——那其實是永久性的 not found。
- **建議**：`catch` 內判斷 error status，404 → 走「找不到」文案；其餘（5xx／網路）才顯示「請稍後再試」。對應 concern #3。

### 🟠 M2 — `normalizeCurrentEventMarket` 強制覆寫 `volume`／`imageUrl` 為 `null`
`frontend/src/api/marketApi.js`（約 L131–139）無論後端是否回傳 `volume`／`imageUrl`，都寫死 `null`。

- **怎麼會壞**：若後端 Market 有這兩欄，會被丟棄；`CurrentEventMarketCard` 若以 `imageUrl` 當 `<img src>` 會出現空 src／破圖。
- **建議**：改成 fallback（`market.volume ?? null`），或確認卡片元件對 `null` 有處理再保留現狀（若刻意，加 `// ponytail:` 說明）。

### 🟡 L1 — `new URL(market.sourceUrl)` 未防禦，畸形 URL 會讓詳情頁整頁崩潰
`market-detail-current-affairs/index.jsx`（約 L59–60）在 render 期 `new URL(market.sourceUrl)`；若後端存入的 `sourceUrl` 非合法絕對 URL，`new URL` 直接 throw，React 白屏。

- **建議**：`try/catch` 或先驗證再取 hostname，失敗時退回顯示原字串。

### 🟡 L2 — `primaryMarket` 相關子查詢重複三份且逐使用者掃 trades
`RankingRepository.java`（三處 `LIMIT 1` 相關子查詢）對每位使用者跑一次 `trades JOIN markets GROUP BY`，且三支排行榜 query 各複製一份相同子查詢。

- **怎麼會壞**：資料量放大後是 O(users × trades) 的重掃，三個 endpoint 各付一次代價。demo 規模無感，上量後是熱點。
- **建議**：可接受作為現階段實作，但建議標注 `// ponytail:` 註明升級路徑（window function 或預先聚合）。

### 🟡 L3 — 時事列表 size 上限固定、無分頁 UI
`getCurrentEventMarkets()` 預設 `size=20` 且回傳只剩 `{ content }`（移除 `totalPages`／`totalElements`）。兩個消費端（`home/index.jsx` L45、詳情頁 L38）都只解構 `content`，故**移除分頁欄位不造成現有錯誤**；但時事市場一旦超過 20 筆，第 21 筆起永遠不顯示、也無「載入更多」。

- **建議**：現階段可接受，但請確認產品預期時事市場數 < 20；否則補分頁或提高 size。

## 2. Open Questions（需產品／組員決策）

1. **停權／banned 使用者是否該出現在排行榜？**（concern #7 屬實）三支 SQL 完全不過濾使用者狀態，`disabled_demo`、`banned_demo` 會出現在公開榜上。若預期排除，需在 SQL 加 `WHERE u.status = 'ACTIVE'`（或對應欄位）。
2. **時事詳情 404 的文案策略**（見 M1）：是否要區分「不存在」「非時事分類」「系統錯誤」三種訊息？
3. **時事市場預期總數**：是否需要真正分頁，還是 20 筆上限即可（見 L3）？

## 3. Test Gaps（具體缺口）

前端目前**零單元測試**覆蓋本輪核心邏輯，建議至少補：

- `rankingApi.js`
  - `mergeRankingData`：當某 userId 只存在於 win-rate／assets 而不在 profit 時的行為（守住 H1 契約）。
  - `sortRankings`：win-rate 同分時以 `resolvedMarketCount` → `name` 破題的排序；`winRate`／`assets` 為 `null` 時不產生 `NaN`／不穩定排序。
- `marketApi.js`
  - `normalizeCurrentEventMarket`：`totalPool = 0` 時 `yesProbability` fallback 50；`yesProbability + noProbability === 100`。
  - `getCurrentEventMarketDetail`：後端回非 `CURRENT_AFFAIRS` 時回 `null`（在 normalize 之前判斷 raw category）。

後端測試已涵蓋 controller/service/repository 主路徑；建議補一則守住「三支排行榜 endpoint 回傳相同 user 集合」的契約測試（對應 H1）。

## 4. Summary

- 無阻斷性 correctness bug：merge/sort 在現行三支 SQL 下不會漏人也不會 NaN，權限放行正確、公開頁不會被 401 導走。
- 建議合併前處理 **M1（404 文案）** 與確認 **H1 的隱性契約**（加聯集合併或契約測試），其餘為可排入後續的健壯性／效能項。
- 可以合併，但請先補前端 rankingApi/marketApi 單元測試並回應上述 3 個 open questions。

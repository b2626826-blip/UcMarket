# UcMarket 前端架構師審查

審查日期：2026-07-12
審查分支：`eagle`
審查對象：`frontend/`（確認為實際使用的前端專案；根目錄 `src/` 為空目錄，非實際程式碼，不在審查範圍）
比對基準：`docs/UcMarket-前後端與資料庫完整審查.md`

## 一、審查方法

1. 通讀既有審查報告「三、前後端整合審查」與「五、驗證結果 > 前端」，列出所有前端相關結論。
2. 逐一 Read 對應原始檔案，確認行號與內容是否仍與報告描述一致（仍存在／已修復／無法確認）。
3. 額外走查 `frontend/src` 全部 90 個原始檔（api / store / router / pages / components），比對後端 controller（`backend/src/main/java/com/ucmarket/controller/*.java`）的實際路徑與方法，找報告未涵蓋的新問題。
4. 重跑 `npm test -- --run` 與 `npm run build` 驗證目前狀態。

---

## 二、既有報告前端相關結論逐項比對

| # | 既有報告結論 | 狀態 | 佐證 |
|---|---|---|---|
| 1 | [P1] 天氣市場是前端即時合成資料，`id` 非後端 UUID | **仍存在** | `frontend/src/pages/public/market-detail-weather/index.jsx:390-410`（合成 `id: \`${region.id}-${idx}\`` 於第 394 行、`Math.random()` 產生 volume 於第 392 行）、第 428 行仍把路由字串 `id` 傳給 `TradePanel` |
| 2 | [P0] 共用 `TradePanel` 未呼叫交易 API，卻顯示「交易送出成功」 | **仍存在** | `frontend/src/components/market/TradePanel.jsx:37-51`，`handleTrade()` 只做前端檢查後直接 `setBtnState({ text: '交易送出成功', ... })`（第 49 行），全檔沒有 import `createTrade` |
| 3 | [P1] 報價模擬與實際成交更新相反的 pool | **不在本次前端範圍** | 純後端邏輯（`TradeQuoteService` / `TradeService` / `Market.java`），前端未涉入報價與成交的價格計算，未重新查證 |
| 4 | [P1] closeAt 已過但排程尚未關閉時仍可報價與成交 | **不在本次前端範圍** | 同上，純後端 controller/service 邏輯 |
| 5 | [P1] 取消市場退款被記成 RESOLUTION_PAYOUT，污染排行榜 | **不在本次前端範圍** | 純後端 `WalletService.deriveType()` 邏輯，前端排行榜僅呈現後端回傳資料，未重新查證 |
| 6 | [整合缺口] Wallet 只有餘額是真資料，流水與統計仍是假資料 | **仍存在** | `frontend/src/store/walletStore.js:9-17` 只呼叫 `getWallet()`；`frontend/src/pages/member/wallet/index.jsx:59-72` 的 `FLOW_RAW` 仍是常數；第 84-89 行 KPI（本月流入/流出/淨額/交易筆數）仍是固定值；`getWalletTransactions()` 存在於 `walletApi.js:7-9` 但頁面仍未呼叫 |
| 7 | 運動市場使用固定 `SAMPLE_MARKET`，尚未取得後端 UUID | **仍存在** | `frontend/src/pages/public/market-detail-sports/index.jsx:21-30`（`SAMPLE_MARKET` 常數）、第 249 行 `DetailPageTemplate` 呼叫仍以 `market.id ?? id`（`market` 即為該常數）供應 |
| 8 | [P1] Position 前端 API 路徑與後端 controller 完全不一致 | **仍存在** | `frontend/src/api/positionApi.js:3-9` 呼叫 `GET /api/positions`、`GET /api/positions/{id}`；後端 `PositionController.java` 只有 `/api/positions/me`（26 行）、`/api/positions/me/open`（31 行）、`/api/positions/market/{marketId}`（36、41 行），完全沒有 base route 與 `/{id}` |
| 9 | Position 列表頁完全使用固定陣列 | **仍存在** | `frontend/src/pages/member/positions/index.jsx:1-5`，硬編碼 2 筆假持倉，未呼叫任何 API |
| 10 | 政治市場詳情頁未把 `market` 傳進 `TradePanel`，仍受 P0 與報價不一致影響 | **仍存在** | `frontend/src/pages/public/market-detail-politics/index.jsx:52,68`，`DetailPageTemplate` 呼叫只帶 `marketId`，未帶 `market` 屬性；`TradePanel` 因此退回 `FIXED_ODDS`（`TradePanel.jsx:5-8`） |
| 11 | [P1] Assets Ranking 依賴無寫入路徑的 `market_price_history` | **不在本次前端範圍** | 純後端／資料庫議題；前端 `rankingApi.js` 對 `/api/rankings` 的欄位對應與後端 `RankingSnapshotItemResponse` 完全一致，前端本身無誤 |
| 12 | 前端測試：`Test Files: 12 passed, 4 skipped`／`Tests: 55 passed, 14 skipped` | **仍相同** | 本次重跑 `npm test -- --run`：`Test Files 12 passed \| 4 skipped (16)`、`Tests 55 passed \| 14 skipped (69)` |
| 13 | 前端建置：`npm run build` 成功、128 modules transformed | **仍相同** | 本次重跑 `npm run build`：`128 modules transformed`、`✓ built in 547ms` |
| 14 | 測試覆蓋缺口：沒有從 TradePanel 到 wallet/position/resolution/ranking 的前端整合測試 | **仍存在** | 未見任何新增的端到端交易流程測試；`test/ApiTest/integration/` 下仍僅有 GET-only、非交易性質的整合測試 |

**小結**：既有報告列出的前端相關問題（天氣合成市場、TradePanel 假成功、Wallet 假流水、運動市場固定資料、Position API 路徑錯誤、政治市場未傳 market）**全部仍未修復**，程式碼與報告描述逐字相符，未發現任何已修復項目。

---

## 三、本次新發現問題（既有報告未涵蓋）

### [P1] AdminGuard 在 dev 模式下對未登入使用者完全開放後台

**證據**：`frontend/src/router/AdminGuard.jsx:9`

```js
if (import.meta.env.DEV && !user) {
  return children;
}
```

只要以 `vite` dev server 執行（`import.meta.env.DEV === true`），任何未登入使用者都能直接存取 `/admin/*` 全部路由（dashboard、markets、users、admins、transactions、settings、logs），無需登入、無需 ADMIN 角色。程式碼註解本身也承認這是需要「正式部署時註解此行」的手動防線，而非由建置模式自動保證的安全機制。若有人以 dev server 對外提供服務、或 demo 環境誤用開發模式啟動，後台將完全暴露。

### [P1] AuthGuard 與 `checkAuth()` 的非同步時序競爭，導致已登入使用者重新整理受保護頁面會被踢回首頁

**證據**：
- `frontend/src/router/AuthGuard.jsx:4-7`：`user` 直接取自 store 目前值，`user` 為 `null` 時立即 `<Navigate to="/" replace />`。
- `frontend/src/store/authStore.js:6-9`：store 初始值 `user: null`。
- `frontend/src/components/layout/UserLayout.jsx:22-24`：`checkAuth()`（會用 localStorage token 向後端換回使用者）是在 `UserLayout` 的 `useEffect` 中才觸發，屬於非同步且比子層 `AuthGuard` 晚一輪 render。

**影響**：使用者在已登入狀態下重新整理或直接開啟 `/wallet`、`/positions`、`/portfolio`、`/trades`、`/markets/new` 任一受保護頁面，`AuthGuard` 會在 `checkAuth()` 完成前，用尚未還原的 `user === null` 直接導回 `/`。這是每次重新整理都會重現的功能性錯誤，而非邊界情況。

**建議**：`AuthGuard` 應等待一個「auth 是否已初始化」的旗標（例如 store 增加 `initialized` 狀態，在 `checkAuth()` resolve 後才設為 `true`），在初始化完成前顯示 loading，而不是立刻用預設值判斷。

### [P1] `authApi.logout()` 送出 GET，但後端 `/api/auth/logout` 只接受 POST 並要求 body，登出永遠得到 405、伺服器端 refresh token 未被撤銷

**證據**：
- `frontend/src/api/authApi.js:15-17`：`logout()` 呼叫 `getApi('/api/auth/logout')`（GET）。
- `backend/src/main/java/com/ucmarket/controller/AuthController.java:69-76`：`@PostMapping("/logout")`，方法簽章要求 `@Valid @RequestBody LogoutRequest request`（帶 `refreshToken`）。
- `frontend/src/store/authStore.js:69-75`：`logout()` 用 `try { await apiLogout(); } catch { /* ignore */ }` 吞掉錯誤，之後仍清除本地 token 與 `user`。

**影響**：使用者點「登出」後前端看起來正常登出（畫面回到未登入狀態），但實際上每次都是對後端發出方法不符的請求並被 405 拒絕，後端從未執行 `authService.logout()` 撤銷 refresh token。若 refresh token 外洩或裝置遺失，「登出」不會讓舊 token 失效，屬於安全性缺口。

**建議**：`logout()` 改為 `postApi('/api/auth/logout', { refreshToken })`，並讓 `authStore` 保留登入時取得的 refresh token 以供登出時提交。

### [P1] Portfolio／儀表板頁面全部為硬編碼假資產數字，與 Wallet 頁的真實餘額互相矛盾

**證據**：`frontend/src/pages/member/portfolio/index.jsx:39-58`。整頁沒有任何 API 呼叫，`$125,430.00` 可用餘額、`+$12,430` 總收益、`+8.7%` 本月收益率、`$135,200` 總資產、`284` 總交易次數皆為寫死的 JSX 常數；`<canvas id="marketChart">` 沒有任何 Chart.js 初始化程式碼，是永遠空白的畫布。

**影響**：使用者從導覽列點「儀表板」（`UserLayout.jsx:57`）看到的總資產與可用餘額，和點「錢包」看到的（`walletStore` 真實 API 資料）是兩組完全不同、互相矛盾的數字。這比既有報告點名的 Wallet 流水假資料更嚴重，因為它偽裝成「總覽」卻連餘額主要指標都是假的。

**建議**：Portfolio 頁面應改用 `walletStore`／`getWallet()` 取得真實餘額，未實現/已實現盈虧則需等 Position、Trade 相關 API 契約修好後才能串接；串接前應明確標示「示範資料」。

---

### [P2] `api/client.js` 的 `BASE_URL` 寫死 `http://localhost:8080`，且未走任何環境變數

**證據**：`frontend/src/api/client.js:1`：`const BASE_URL = 'http://localhost:8080';`。對照 `frontend/src/config/firebase.js:5-8` 正確使用 `import.meta.env.VITE_FIREBASE_*`，`client.js` 是專案中唯一一處把後端網址寫死在原始碼裡的地方。`vite.config.js:8-13` 的 `/api` proxy 只在 `vite dev` 生效，`vite build` 不會套用。本次重跑 `npm run build` 確認產出的 `dist/assets/index-*.js` 仍會內嵌這個字面值（未做任何環境判斷）。

**影響**：只要不是在開發者本機用 `localhost:8080` 跑後端，打包後的前端所有 API 呼叫都會打向瀏覽器端使用者自己的 `localhost:8080`，而不是實際部署的後端。這會讓非本機環境（測試機、staging、正式環境）完全無法運作，不只是「效能」等非阻斷問題。

**建議**：改為 `import.meta.env.VITE_API_BASE_URL`，並提供 `.env.production` / `.env.development` 範例值。

### [P2] Finance 市場詳情頁完全未呼叫任何市場 API，屬於與天氣／運動市場相同模式但未被既有報告點名

**證據**：`frontend/src/pages/public/market-detail-finance/index.jsx` 全檔沒有 import `marketApi`，`marketId={id}` 只是把路由參數原樣往下傳，內容（BTC 100,000 美元、TradingView 走勢）全是靜態 JSX。

**影響**：與既有報告點名的天氣、運動市場一樣，一旦 P0 交易串接修好，金融市場的 `id`（路由字串，非後端 UUID）送進 `POST /api/trades` 一樣會得到「市場不存在」。

### [P2] Trade History 頁面完全硬編碼；`getTrades()` / `getPositions()` / `getPositionDetail()` 是已知契約不符的死碼

**證據**：
- `frontend/src/pages/member/trade-history/index.jsx:3-7`：`historyData` 為寫死陣列，未呼叫 `getTrades()`。
- `frontend/src/test/ApiTest/integration/authed.int.test.js:8-11,47-53`：測試檔案本身已用註解記錄「`getPositions()` 打 GET /api/positions，但後端只有 /api/positions/me → 500」「`getTrades()` 打 GET /api/trades，但後端 /api/trades 只有 POST → 500」「三個函式 getPositions/getTrades/getPositionDetail 前端零使用，屬死碼」，並用 `expect(...).rejects.toMatchObject({ status: 500 })` 精確記錄現況。

**影響**：這與既有報告點名的 Position API 路徑問題屬同一類、但範圍更廣——`tradeApi.getTrades()` 同樣是錯誤契約（後端 `/api/trades` 只有 `@PostMapping`，沒有 GET）。目前因為沒有頁面呼叫它們而不影響使用者，但一旦有人依現有 `positionApi.js` / `tradeApi.js` 介面去接 Trade History 或 Position 詳情頁，會立即得到 500。此問題團隊已自行記錄在測試檔中，非全新未知問題，但既有審查報告未提及 Trade API 的部分，這裡一併列出以求完整。

### [P2] Politics／Current-Affairs 詳情頁未把 `market` 傳進 `TradePanel`，賠率永遠是寫死的 `FIXED_ODDS`

**證據**：
- Politics（既有報告已點名）：`frontend/src/pages/public/market-detail-politics/index.jsx:52,68`。
- Current-Affairs（既有報告未點名，本次新增佐證）：`frontend/src/pages/public/market-detail-current-affairs/index.jsx:101-126`，`DetailPageTemplate` 呼叫只帶 `marketId={market.id}`，未帶 `market={market}`。
- `TradePanel.jsx:24-32`：沒有 `market` 屬性時，`yesPrice`/`noPrice` 退回硬編碼預設值 `0.55`/`0.45`，賠率退回 `FIXED_ODDS.YES = 1.62` / `FIXED_ODDS.NO = 2.63`。

**影響**：即使時事市場詳情頁已經正確呼叫後端 `getCurrentEventMarketDetail()` 取得真實市場，使用者在交易面板上看到的「目前賠率」與「預期回報」仍是與該市場實際 `yesPool`/`noPool` 無關的固定假數字。

---

### [P3] 通用 `MarketDetailPage`（`/markets/:id`）整頁硬編碼假 WTI 原油市場，且在正常導覽下幾乎無法被觸及

**證據**：`frontend/src/pages/public/market-detail/index.jsx:1-69`，整頁為寫死的 WTI 原油、`$0.62`/`$0.38` 價格、`成交量 $2.3M`、`今日交易 24` 等假資料，無任何 API 呼叫。`frontend/src/components/market/MarketCard.jsx:3-13` 顯示：只要 `market.category` 屬於「政治／運動／天氣／時事／金融」五類之一（後端目前所有市場皆屬此類），連結一定會導到對應的分類詳情頁（`/markets/{slug}/{id}`），而不是這個通用 `/markets/:id`。也就是說在目前資料下，這個頁面只能靠手動輸入 URL 才會被看到，屬孤兒頁面，但因為內容具誤導性（會被誤認是真實市場），仍建議清理或補上真實資料。

### [P3] `weatherApi.js` 存在逐字重複的兩份，其中一份已自我標註為孤兒檔案

**證據**：`frontend/src/api/weatherApi.js:1-5` 檔首已有註解：「⚠️ 孤兒檔案（ORPHAN，2026-07-08 盤點）— 全專案零引用，與 pages/public/market-detail-weather/weatherApi.js 為逐字重複的雙胞胎；實際被使用的是頁面內那份」。本次確認：`api/weatherApi.js` 只被 `frontend/src/test/ApiTest/weatherApi.test.js` import，沒有任何頁面／元件引用；實際生產路徑走的是 `frontend/src/pages/public/market-detail-weather/weatherApi.js`。狀態與註解描述一致，問題仍存在，未清理。

### [P3] 其他次要觀察（不影響核心流程，僅記錄）

- `frontend/src/components/market/MarketTrendCarousel.jsx:69-74` 的輪播 `setInterval` 依賴 `[activeIndex]`，每次切換都會重建一次 interval（有正確 `clearInterval` 清理，不是記憶體洩漏，但屬不必要的重複建立計時器）。
- 多處 admin 頁面（如 `frontend/src/pages/admin/dashboard/index.jsx:70,75,81`）用原生 `confirm()`/`prompt()` 而非專案既有的 `Toast`/`Modal` 元件，風格不一致，但功能正常。
- `npm run build` 出現 bundle 超過 500KB 的警告（`dist/assets/index-*.js` 787.78 kB）；依既有報告排除範圍（bundle 大小為非阻斷問題），本次僅記錄不列入嚴重度統計。

---

## 四、驗證結果重跑紀錄

執行位置：`frontend/`

```text
npm test -- --run
Test Files  12 passed | 4 skipped (16)
     Tests  55 passed | 14 skipped (69)

npm run build
128 modules transformed
✓ built in 547ms
```

兩項結果與既有報告記載完全一致，前端目前狀態與既有報告審查當下沒有出現退步或修復。

---

## 五、總結

既有報告點名的前端問題（天氣／運動市場假資料、TradePanel 假成功、Wallet 假流水、Position API 契約錯誤、政治市場未傳 market）**全部仍然存在，無一修復**。本次審查另外發現 4 個新的 P1 問題，全部與既有 P0（TradePanel 假成功）性質不同、獨立可修：管理後台在 dev 模式對外開放、已登入使用者重新整理受保護頁面會被踢出、登出未真正撤銷後端 refresh token、Portfolio 頁面顯示與 Wallet 互相矛盾的假資產數字。另有 4 個 P2 與 3 個 P3 屬於範圍更廣的「假資料頁面」與「API 契約死碼」問題，建議與既有 P0/P1 修復排程一併規劃，避免修好交易後又被這些周邊頁面拖累使用者信任度。

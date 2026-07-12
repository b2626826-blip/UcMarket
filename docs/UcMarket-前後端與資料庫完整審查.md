# UcMarket 前後端與資料庫完整審查

審查日期：2026-07-12  
審查分支：`eagle`  
審查基準：目前工作樹（審查開始時為乾淨狀態）

## 一、審查範圍與判定標準

本次審查涵蓋 Spring Boot 後端、React/Vite 前端、JPA entity/repository、PostgreSQL DDL、既有 migration 與測試。問題依指定順序整理：

1. Market 市場（shung）＋天氣市場
2. Trade 交易（tim）＋金融市場
3. Wallet 錢包（harry）＋運動市場
4. Position 持倉（roy）＋政治市場
5. Resolution 結算（eagle）＋時事
6. Ranking 排行榜（eagle）
7. 資料庫

只收錄會造成下列結果的問題：

- 前後端實際呼叫不到、呼叫契約不一致或畫面回報假成功。
- 交易、錢包、持倉、結算或排行榜資料不正確。
- 正式 PostgreSQL schema、JPA entity、測試 schema 或 repository SQL 不一致。
- 在正常 Demo 核心流程中可能造成錯誤交易或錯誤資料。

依需求排除：市場顯示筆數上限、純 UI 排版、首頁假卡片數量、封閉 Demo 可由開發人員手動控制的操作限制、未開放功能的體驗優化，以及 bundle 大小等非阻斷問題。

## 二、總結

目前程式可以編譯、測試與建置，但「可建置」不等於「已整合」。核心問題是前端交易面板沒有呼叫後端交易 API，卻直接顯示成功；因此使用者在任何市場詳情頁下注時，交易、錢包、持倉與後續結算都不會產生資料。

| 等級 | 數量 | 說明 |
|---|---:|---|
| P0 | 1 | 核心交易流程在前端是假成功，完全未進入後端 |
| P1 | 7 | 天氣市場沒有後端 UUID、報價／成交不一致、過期市場仍可交易、退款分類污染排行榜、持倉 API 錯誤、資產榜缺少價格來源、正式與測試 schema 契約不同 |
| P2 | 1 | 資料庫變更沒有由應用程式自動管理，環境容易漂移 |

建議修復順序：P0 交易串接 → 報價與成交模型 → 過期市場防線 → Wallet/Position 真實資料 → 排行榜價格來源與退款分類 → schema/migration 統一。

---

## 三、前後端整合審查

### 1. Market 市場（shung）＋天氣市場

#### [P1] 天氣市場是前端即時合成資料，並不是後端 Market

**證據**

- `frontend/src/pages/public/market-detail-weather/index.jsx:364-418` 依天氣預報在瀏覽器產生 threshold market。
- 合成的 `id` 是 `${region.id}-${idx}`，不是後端要求的 UUID。
- 同一段程式使用 `Math.random()` 產生交易量，且沒有呼叫 `getMarketDetail()` 或 `/api/markets`。
- `frontend/src/pages/public/market-detail-weather/index.jsx:428` 把路由字串 `id` 傳給共用 `TradePanel`。
- 後端 `TradeRequest.marketId` 是 `UUID`：`backend/src/main/java/com/ucmarket/dto/TradeRequest.java:11-20`。

**影響**

目前因 TradePanel 沒有真的送出交易，所以只會出現假成功。一旦把 TradePanel 直接接到 `POST /api/trades`，天氣市場的非 UUID／不存在 market id 會立刻得到 400 或「市場不存在」，仍然無法交易。

**建議**

後端先建立真實天氣 Market，前端只以 CWA 資料補充顯示；每個可交易選項必須持有後端 UUID。不要把 UI threshold 物件直接當作可交易 Market。

### 2. Trade 交易（tim）＋金融市場

#### [P0] 共用 TradePanel 未呼叫交易 API，卻顯示「交易送出成功」

**證據**

- `frontend/src/components/market/TradePanel.jsx:37-54` 的 `handleTrade()` 只做前端金額檢查與 `setBtnState()`。
- `frontend/src/components/market/TradePanel.jsx:51` 直接設定「交易送出成功」。
- 該元件沒有 import 或呼叫 `createTrade()`。
- 真正後端入口是 `POST /api/trades`：`backend/src/main/java/com/ucmarket/controller/TradeController.java:17-32`。
- `frontend/src/api/tradeApi.js:7-9` 雖已有 `createTrade()`，但全專案沒有頁面呼叫它。
- 金融、運動、天氣、政治、時事與通用詳情頁都透過 `DetailPageTemplate` 使用這個共用面板：`frontend/src/components/common/DetailPageTemplate.jsx:73-77`。

**影響**

這是核心流程中斷。畫面聲稱成功，但不會新增 `trades`、不會扣 wallet、不會增加 position、也不會更新 market pool。後續 Wallet、Position、Resolution、Ranking 全部拿不到這筆交易。

**建議**

TradePanel 應以後端 market UUID、`side`、`amount` 呼叫 `createTrade()`；成功後重新抓 market、wallet、position。後端錯誤必須顯示失敗，不能先顯示成功。

#### [P1] 報價模擬與實際成交更新相反的 pool

**證據**

- YES 報價在 `backend/src/main/java/com/ucmarket/service/TradeQuoteService.java:22-28` 將 amount 加到 `noPool`，再反推 `yesPool`。
- 真正成交在 `backend/src/main/java/com/ucmarket/entity/Market.java:260-265` 對 YES 交易增加 `yesPool`，NO 交易增加 `noPool`。
- `backend/src/main/java/com/ucmarket/service/TradeService.java:44-66` 成交又使用交易前 `getMarketOdds()`，沒有使用 quote endpoint 回傳的結果。

**影響**

`POST /api/markets/{id}/trades/getquote`／`quote` 顯示的成交後狀態與實際 `POST /api/trades` 不同。只要前端開始使用報價 API，使用者看到的賠率就無法保證是實際成交價；market pool、trade.price、shares 與派彩模型也會互相偏離。

**建議**

先決定單一價格模型，再讓 quote 與 execute 共用同一個純計算函式；成交必須使用報價版本或在鎖內重算並回傳實際成交價。

#### [P1] closeAt 已過但排程尚未關閉時，仍可報價與成交

**證據**

- `backend/src/main/java/com/ucmarket/controller/MarketController.java:190-199` 報價只檢查 `status == ACTIVE`。
- `backend/src/main/java/com/ucmarket/service/TradeService.java:38-42` 成交也只檢查 status。
- `backend/src/main/java/com/ucmarket/service/MarketService.java:150-160` 每 60 秒才批次關閉過期市場。
- `MarketService.findMarket()` 雖會在讀取時關閉過期市場，但報價與成交路徑沒有呼叫它：`backend/src/main/java/com/ucmarket/service/MarketService.java:162-171`。

**影響**

在 `closeAt` 到排程執行之間存在最長約 60 秒的錯誤交易窗口。這不是顯示限制，而是會真的扣款與建立持倉。

**建議**

在持有 market write lock 的 `TradeService.placeTrade()` 內同時檢查 `closeAt <= now`；quote endpoint 也應使用同一可交易判定。

### 3. Wallet 錢包（harry）＋運動市場

#### [P1] 取消市場退款被記成 RESOLUTION_PAYOUT，會污染獲利排行榜

**證據**

- 市場取消退款呼叫 `walletService.credit(..., "MARKET", ...)`：`backend/src/main/java/com/ucmarket/service/MarketService.java:137-147`。
- `WalletService.deriveType()` 把所有 credit + `MARKET` 映射為 `RESOLUTION_PAYOUT`：`backend/src/main/java/com/ucmarket/service/WalletService.java:146-160`。
- DDL 與 enum 本來都有獨立 `REFUND` 類型：`docs/資料庫設計/ucmarket-ddl.sql:193-208`。
- 排行榜把所有 `RESOLUTION_PAYOUT` 加總為派彩：`backend/src/main/java/com/ucmarket/repository/RankingRepository.java:18-29`。
- 取消的 position 狀態是 `CANCELED`，不會進入 settled cost；因此退款會被當成純獲利。

**影響**

只要管理員取消有持倉的市場，使用者拿回本金後，Profit Ranking 會把本金退款當成獲利，排行榜永久失真。

**建議**

取消退款使用明確 `REFUND` ref/type；排行榜只計真正結算派彩。新增「取消後 profit 不增加」的 repository integration test。

#### [整合缺口，併入 P0 修復] Wallet 只有餘額是真資料，流水與統計仍是假資料

- `frontend/src/store/walletStore.js:9-17` 只呼叫 balance endpoint。
- `frontend/src/pages/member/wallet/index.jsx:59-72` 的流水是 `FLOW_RAW` 常數。
- `frontend/src/pages/member/wallet/index.jsx:83-89` 的 KPI 也是固定值。
- 後端已有 `/api/wallets/me/transactions`，前端 API 也已有 `getWalletTransactions()`，但 WalletPage 未呼叫。

這會讓 P0 修好後出現「餘額已扣，但流水仍顯示舊假資料」的前後端矛盾。因本次要求忽略純 Demo 顯示問題，這裡不另計一個優先級；但應與交易串接一起完成。

運動市場另使用固定 `SAMPLE_MARKET`（`frontend/src/pages/public/market-detail-sports/index.jsx:20-21,243`），尚未取得後端 UUID；它與天氣／金融市場同樣會被 P0 的交易串接問題阻斷。

### 4. Position 持倉（roy）＋政治市場

#### [P1] Position 前端 API 路徑與後端 controller 完全不一致

**證據**

- 前端呼叫 `GET /api/positions` 與 `GET /api/positions/{id}`：`frontend/src/api/positionApi.js:3-9`。
- 後端本人持倉實際是 `GET /api/positions/me`、`GET /api/positions/me/open`：`backend/src/main/java/com/ucmarket/controller/PositionController.java:26-34`。
- 後端沒有 `/api/positions/{id}` 詳情端點。
- `frontend/src/pages/member/positions/index.jsx:1-5` 完全使用固定陣列，尚未暴露這個 404 契約錯誤。

**影響**

只要 PositionPage 開始使用現有 `positionApi.js`，持倉列表與詳情都會呼叫不存在的 API。即使 P0 交易修好，使用者仍看不到真實持倉。

**建議**

最小修復是將列表改呼叫 `/api/positions/me`；若畫面確實需要單筆詳情，再新增以 JWT user id 限制所有權的 `/api/positions/{id}`，不要讓前端傳任意 user id。

政治市場詳情已能用 `getMarketDetail(id)` 取得後端 Market（`frontend/src/pages/public/market-detail-politics/index.jsx:25-40`），但沒有把 market 傳進 `DetailPageTemplate` 的 TradePanel，因此仍受 P0 與報價不一致影響。

### 5. Resolution 結算（eagle）＋時事

本輪沒有發現獨立的 P0/P1 結算中斷：

- admin resolve 會進入 `MarketService` → `ResolutionService`。
- `ResolutionService` 以 market write lock 防止同一市場重複結算。
- 派彩使用 position idempotency key，並在同一 transaction 內更新 wallet、position 與 market。
- 時事列表／詳情已使用後端 API，而非首頁固定 market 陣列。

但此區仍受兩個跨模組問題影響：

1. P0 未修前，時事詳情的「送出交易」沒有建立 position，因此結算沒有可派彩資料。
2. Wallet 的退款／派彩分類錯誤會讓取消市場與正常結算在排行榜中混為一談。

另有一項刻意不列為問題：管理員可對 ACTIVE 市場手動 resolve。依本次「封閉 Demo、由開發人員操作」的前提，視為可接受的操作政策，不列缺陷。

### 6. Ranking 排行榜（eagle）

#### [P1] Assets Ranking 依賴 market_price_history，但正式程式沒有任何寫入路徑

**證據**

- `RankingRepository` 以 `market_price_history` 最新價格計算 open position value：`backend/src/main/java/com/ucmarket/repository/RankingRepository.java:55-72`。
- 全部 production Java 程式只有 RankingRepository 讀取此表，沒有 entity、repository writer、scheduler、trade hook 或 SQL insert。
- `docs/資料庫設計/ucmarket-ddl.sql:175-190` 也明確說這是沒有 JPA entity 的 read-model table。
- 查不到價格時 query 以 `COALESCE(..., 0)` 計價，因此所有 open position 的資產價值會是 0。
- 測試通過是因 `RankingRepositoryTest` 自己 insert 價格資料，並不能證明正式流程會產生資料。

**影響**

Assets Ranking 實際只剩 wallet balance；任何未結算持倉都被當成 0。交易越多，資產榜與真實資產偏差越大。

**建議**

二選一並固定契約：

1. 每次成交後在同一 transaction 寫入 `market_price_history`；或
2. 排行榜直接從 markets 的 current pool 推導目前價格，不維護無 writer 的 read model。

另須套用 Wallet 的 REFUND 修正，否則 Profit Ranking 仍會被取消退款污染。

---

## 四、資料庫審查

### [P1] Position entity、production DDL 與 H2 測試 schema 的唯一性契約不同

**證據**

- JPA entity 宣告完整唯一鍵 `(user_id, market_id)`：`backend/src/main/java/com/ucmarket/entity/Position.java:18-24`。
- production DDL 沒有該 constraint，而是對 `option_id IS NULL` 建 partial unique index：`docs/資料庫設計/ucmarket-ddl.sql:229-232`。
- native upsert 明確依賴同一個 partial conflict target：`backend/src/main/java/com/ucmarket/repository/PositionRepository.java:30-60,69-99`。
- H2 測試先由 Hibernate 依 entity 建完整 unique constraint，再由 `data.sql` 補 `option_id`；測試 schema 因此不等於 production schema。

**影響**

Repository integration test 無法完整驗證 production 的 partial-index／`ON CONFLICT ... WHERE option_id IS NULL` 行為。未來只要 option position 或 schema 調整進入程式，H2 可能提早拒絕 production 允許的資料，或反過來漏掉 PostgreSQL 才會發生的衝突。

**建議**

目前若確定只支援 binary market，最簡單做法是從正式 DDL、repository SQL 與 ranking SQL 一起移除未實作的 `option_id`，統一完整 unique constraint。若要保留 option 架構，則移除 entity 的完整 unique constraint，並增加真正 PostgreSQL 的 repository integration test。

### [P2] production schema 沒有應用程式層 migration runner

**證據**

- `backend/src/main/resources/application.properties:8` 設定 `spring.jpa.hibernate.ddl-auto=none`。
- migration 位於 `docs/資料庫設計/migrations/`，不是 Flyway/Liquibase 的執行目錄。
- `pom.xml` 沒有 Flyway 或 Liquibase dependency。

**影響**

應用程式啟動不會建立或升級 schema；`PositionRepository`、排行榜與 OAuth 等程式碼是否能執行，取決於開發人員是否手動、按正確順序套用 SQL。不同電腦／資料庫很容易出現「程式相同、schema 不同」的整合錯誤。

**建議**

Demo 若維持人工部署，至少提供單一、可重複執行且有版本紀錄的 bootstrap/upgrade 指令；若要多人整合，應將既有 SQL 收斂成 Flyway versioned migrations，並在 PostgreSQL CI 驗證。

### 資料庫已確認一致的部分

- Canonical DDL 已包含目前 entity 使用的 users、sessions、OAuth、wallets、markets、reviews、trades、positions、wallet transactions 與 admin logs。
- `wallet_transactions.idempotency_key` 有 partial unique index，符合 WalletService 防重設計。
- `PositionRepository` 的 PostgreSQL conflict target 與 canonical DDL 的 partial index 文字一致。
- `resolved_by`、`approved_by`、`image_url`、code 欄位與目前 entity／DTO 已對齊。
- 排行榜 native SQL 在清除本機 datasource 環境變數後可通過 H2 PostgreSQL mode 測試；但這不取代 production PostgreSQL schema test。

---

## 五、驗證結果

### 後端

執行位置：`backend/`

```text
Remove-Item Env:SPRING_DATASOURCE_URL,Env:SPRING_DATASOURCE_USERNAME,Env:SPRING_DATASOURCE_PASSWORD
.\mvnw.cmd test
Tests run: 216, Failures: 0, Errors: 0, Skipped: 12
BUILD SUCCESS
```

第一次未清除環境變數時，測試 datasource 被本機 PostgreSQL URL 覆寫，但 driver 仍是 H2，導致 integration context 啟動失敗。這是本機驗證環境污染，不列為產品程式缺陷。

### 前端

執行位置：`frontend/`

```text
npm.cmd test -- --run
Test Files: 12 passed, 4 skipped
Tests: 55 passed, 14 skipped

npm.cmd run build
128 modules transformed
Build success
```

### 測試覆蓋缺口

目前測試多數驗證單一 API wrapper、controller 或 service；沒有一個前端整合測試實際從 TradePanel 送交易，再驗證 wallet、position、resolution 與 ranking 的連鎖結果。因此 P0 假成功不會被現有綠燈測試發現。

建議新增一條最小核心 E2E：登入 → 載入真實 market UUID → quote → trade → wallet 扣款 → position 增加 → admin resolve → wallet 派彩 → ranking 更新。

## 六、修復順序與完成條件

1. **TradePanel 串接真實 Market/Trade API**  
   完成條件：畫面成功時 DB 必有 trade、wallet debit、position 與 market pool 更新；失敗不得顯示成功。
2. **統一 quote 與 execute 價格模型，補 closeAt 鎖內檢查**  
   完成條件：報價後成交使用相同算法；過期 market 在排程執行前也不能成交。
3. **Wallet 與 Position 改讀真實 API**  
   完成條件：Wallet 流水不再使用 `FLOW_RAW`；Position 列表改用 `/api/positions/me`。
4. **退款分類與排行榜修正**  
   完成條件：cancel 使用 REFUND；取消本金不增加 realized profit；open position 有可靠價格來源。
5. **統一 schema 契約**  
   完成條件：JPA、H2、PostgreSQL DDL 與 native upsert 對 Position uniqueness 的定義一致，並有 PostgreSQL integration test。

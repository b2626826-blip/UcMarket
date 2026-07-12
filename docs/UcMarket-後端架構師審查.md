# UcMarket 後端架構師獨立審查

審查日期：2026-07-12
審查分支：`eagle`
審查範圍：`backend/` 全部原始碼（controller、service、repository、entity、config、exception、util、測試）
比對基準：`docs/UcMarket-前後端與資料庫完整審查.md`（既有審查報告）

本報告只針對後端程式碼獨立審查，前端議題不重複評論，僅在比對既有報告時標註「不適用（前端範疇）」。

---

## 一、與既有報告逐項比對結論

| # | 既有報告問題（章節） | 等級 | 本次比對結論 |
|---|---|---|---|
| 1 | 天氣市場是前端合成資料，非後端 Market（三-1） | P1 | 不適用（前端範疇）——後端 `Market` 仍要求 UUID 主鍵，未變更 |
| 2 | TradePanel 未呼叫交易 API，卻顯示成功（三-2） | P0 | 不適用（前端範疇）——後端 `POST /api/trades` 本身正常運作，見 `backend/src/main/java/com/ucmarket/controller/TradeController.java:27-33`、`backend/src/main/java/com/ucmarket/service/TradeService.java:36-69` |
| 3 | 報價模擬與實際成交更新相反 pool（三-2） | P1 | **仍存在** ——`TradeQuoteService.getQuote()` 用 constant-product AMM 模型（`backend/src/main/java/com/ucmarket/service/TradeQuoteService.java:15-36`），`TradeService.placeTrade()` 卻用 `getMarketOdds()` 的 pool 比例模型並夾在 1.5~5.0（`TradeQuoteService.java:38-59`），兩者互不相關；quote 端點回傳的 odds 從未被 execute 使用 |
| 4 | closeAt 已過但排程未關閉前仍可報價／成交（三-2） | P1 | **仍存在** ——`TradeService.placeTrade()` 只檢查 `status == ACTIVE`（`backend/src/main/java/com/ucmarket/service/TradeService.java:40-42`），`MarketController.quoteTrade()` 同樣只檢查 status（`backend/src/main/java/com/ucmarket/controller/MarketController.java:195-197`），皆未檢查 `closeAt`；`autoCloseExpiredMarkets()` 仍是 60 秒排程（`backend/src/main/java/com/ucmarket/service/MarketService.java:150-160`） |
| 5 | 取消退款被記成 RESOLUTION_PAYOUT，污染排行榜（三-3） | P1 | **仍存在** ——`MarketService.refundPositions()` 呼叫 `walletService.credit(..., "MARKET", ...)`（`backend/src/main/java/com/ucmarket/service/MarketService.java:137-147`），`WalletService.deriveType()` 把 credit+`MARKET` 固定映射為 `RESOLUTION_PAYOUT`（`backend/src/main/java/com/ucmarket/service/WalletService.java:151-156`）。`WalletTransactionType` 雖已定義 `REFUND`（`backend/src/main/java/com/ucmarket/entity/WalletTransactionType.java:9`），但 `deriveType()` 的 switch 完全不接受 `"REFUND"` 這個 refType 輸入，即使呼叫端想用也會直接丟 `IllegalArgumentException` |
| 6 | Position 前端 API 路徑與後端 controller 不一致（三-4） | P1 | **仍存在（後端未變）**——後端本人持倉仍只有 `GET /api/positions/me`、`GET /api/positions/me/open`（`backend/src/main/java/com/ucmarket/controller/PositionController.java:26-34`），沒有 `/api/positions/{id}` |
| 7 | Assets Ranking 依賴 market_price_history 但無寫入路徑（三-6） | P1 | **仍存在** ——全 repo 搜尋 `market_price_history` 只有 `RankingRepository` 讀取（`backend/src/main/java/com/ucmarket/repository/RankingRepository.java:55-72,233-263`），沒有任何 entity、writer、scheduler 或 trade hook 寫入該表 |
| 8 | Position entity / production DDL / H2 測試 schema 唯一性契約不同（四） | P1 | **仍存在** ——`Position` entity 仍宣告完整 `@UniqueConstraint(columnNames = {"user_id","market_id"})` 且完全沒有 `option_id` 欄位（`backend/src/main/java/com/ucmarket/entity/Position.java:18-25`），但 `PositionRepository` 原生 upsert 仍依賴 `ON CONFLICT (user_id, market_id) WHERE option_id IS NULL`（`backend/src/main/java/com/ucmarket/repository/PositionRepository.java:54,93`） |
| 9 | production schema 沒有應用程式層 migration runner（四） | P2 | **仍存在** ——`spring.jpa.hibernate.ddl-auto=none`（`backend/src/main/resources/application.properties:8`），`pom.xml` 內未找到 Flyway 或 Liquibase 依賴 |

**結論**：既有報告列出的 7 條後端相關問題（不含 2 條純前端問題）全部**仍存在，尚未修復**。

---

## 二、本次新發現問題

### [P1] `GET /api/positions/market/{marketId}` 系列端點無擁有者或角色限制，洩漏他人持倉明細

**證據**

- `PositionController.getMarketPositions()` 與 `getOpenMarketPositions()` 只要求路徑帶 `marketId`，沒有任何權限判斷：`backend/src/main/java/com/ucmarket/controller/PositionController.java:36-44`。
- `SecurityConfig` 對 `/api/positions/**` 沒有特別規則，落入預設 `.anyRequest().authenticated()`（`backend/src/main/java/com/ucmarket/config/SecurityConfig.java:41`）——也就是說任何已登入使用者（非該市場參與者、非 admin）都能呼叫。
- 回傳的 `PositionResponse` 直接帶出 `userId`、`yesShares`、`noShares`、`yesCost`、`noCost`（`backend/src/main/java/com/ucmarket/dto/PositionResponse.java:10-34`）。
- Market UUID 透過 `GET /api/markets` 對所有人公開（`SecurityConfig.java:37`），因此任何登入使用者都能列出全站活躍市場，再逐一查出所有參與者的下注方向與金額。

**影響**

這是一個真實的資訊揭露／權限控管缺口：使用者的持倉成本與方向對其他一般會員完全透明，等同洩漏交易策略與部位大小。在金融交易類產品中屬於應該以「本人或 admin」限定的資料。

**建議**

`getMarketPositions`/`getOpenMarketPositions` 至少應限定 `hasRole('ADMIN')`，或改為只回傳聚合統計（如市場總量），不回傳個別 `userId`/成本欄位。

### [P2] Market 實體沒有樂觀鎖，`cancelMarket()`／`autoCloseExpiredMarkets()` 用無鎖讀取，與有鎖的 trade/resolve 路徑不一致，存在 lost-update 風險

**證據**

- `Market` entity 全篇沒有 `@Version` 欄位（`backend/src/main/java/com/ucmarket/entity/Market.java`），相較之下 `Wallet` entity 明確有 `@Version`（`backend/src/main/java/com/ucmarket/entity/Wallet.java:36-38`）。
- `TradeService.placeTrade()`、`ResolutionService.resolveMarket()` 都用 `marketRepository.findByIdForUpdate()` 取得悲觀鎖（`backend/src/main/java/com/ucmarket/service/TradeService.java:38`、`backend/src/main/java/com/ucmarket/service/ResolutionService.java:40`）。
- 但 `MarketService.cancelMarket()` 用的是 `findMarket()`，是一般 `marketRepository.findById()`（`backend/src/main/java/com/ucmarket/service/MarketService.java:113-135,162-172`），沒有鎖。
- `MarketService.autoCloseExpiredMarkets()` 排程同樣用 `findByStatusAndCloseAtBefore()` 一般查詢後直接 `saveAll()`（`backend/src/main/java/com/ucmarket/service/MarketService.java:150-160`），沒有鎖也沒有版本檢查。
- Hibernate 對沒有 `@DynamicUpdate` 的 entity，`save()` 會用當時記憶體內的完整欄位值產生 UPDATE。如果 `cancelMarket`/`autoCloseExpiredMarkets` 讀到的 `Market` 快照早於一筆並發 `TradeService.placeTrade()` 對 `yesPool`/`noPool` 的提交，之後這兩條路徑的 `save()` 會用舊值整列覆寫，等於把剛成交的 pool 更新蓋掉（經典 lost update）。
- `backend/src/test/java/com/ucmarket/service/TradeConcurrencyTest.java` 只驗證「trade 對 trade」的並發（50 條並發下單都用 `findByIdForUpdate` 排隊序列化），沒有涵蓋「cancel/排程 對 trade」交錯的情境，這個 race 目前完全沒有測試覆蓋。

**影響**

機率不高（需要 admin 取消或排程關閉恰好與使用者下單在同一 100ms 內交錯），但一旦發生，會讓 market 的 `yesPool`/`noPool`（進而影響往後所有賠率與派彩計算）悄悄倒退回舊值，且沒有任何錯誆或日誌可觀察到。

**建議**

`cancelMarket()` 與 `autoCloseExpiredMarkets()` 的市場讀取一律改用 `findByIdForUpdate()`（或至少替 `Market` 加 `@Version` 讓 Hibernate 用樂觀鎖擋下這類覆寫並轉成可重試的例外）；並新增一條「cancel 與並發 trade 交錯」的並發測試，比照 `TradeConcurrencyTest` 的做法。

### [P2] `DevWalletController` 只靠 Spring Profile 隔離，內部沒有任何角色檢查

**證據**

- `DevWalletController` 可對任意 `userId` 呼叫 `credit`/`debit`，唯一防線是類別上的 `@Profile("dev")`（`backend/src/main/java/com/ucmarket/controller/DevWalletController.java:16-35`）。程式碼註解本身也承認「credit/debit 本來『沒有』對外端點（公開 = 任何人都能印錢/亂扣別人）」。
- `SecurityConfig` 對 `/api/dev/**` 沒有專屬規則，落入預設 `authenticated()`（`backend/src/main/java/com/ucmarket/config/SecurityConfig.java:41`）——也就是說只要 profile 一旦被啟用，任何一個已登入的一般使用者（不需要 admin 角色）都能對「任意其他 userId」印錢或扣款。
- 目前 `application.properties` 沒有設定 `spring.profiles.active`，預設不會啟用 `dev` profile，暫時安全。

**影響**

這是一個「設計上刻意的後門」，殺傷力等同 P0（可任意操縱所有人餘額），目前唯一防線是部署時不要誤開 `dev` profile。一旦 QA/預發布環境誤設 `SPRING_PROFILES_ACTIVE=dev` 且對外網路可達，後果等同金流被任意竄改。

**建議**

至少加上 `@PreAuthorize("hasRole('ADMIN')")` 做 double-guard，不要只依賴 profile 隔離；並在 CI/部署腳本中加一道檢查，確認正式與預發布環境不會帶入 `dev` profile。

### [P3] JWT secret 與資料庫密碼在 `application.properties` 有硬編碼預設值並已提交到版控

**證據**

- `app.jwt.secret=${APP_JWT_SECRET:ucmarket-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256}`（`backend/src/main/resources/application.properties:12`）——若部署忘記覆蓋環境變數，簽章金鑰是任何看過原始碼的人都知道的固定字串，可偽造任意 `userId`/`role`（包含 `ADMIN`）的合法 JWT，直接繞過 `JwtAuthFilter` 的驗證（`backend/src/main/java/com/ucmarket/security/JwtAuthFilter.java:39-47`）。
- `spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:post}`（`application.properties:6`）——資料庫預設密碼同樣硬編碼並提交到版控。

**影響**

對封閉 demo 影響有限，但這類「有預設值可回退」的密鑰／密碼一旦被複製到共用測試環境或正式環境卻忘記覆蓋，就是可偽造 admin 身分的關鍵漏洞。

**建議**

至少在非 `dev` profile 啟動時檢查 `app.jwt.secret` 是否等於預設字串，若是則拒絕啟動（fail fast）；正式環境的密鑰/密碼應改由 secret manager 注入，不留原始碼內預設值。

### [P3] `TradeRequest.amount` 沒有上限，單筆巨額交易可在 AMM 報價與 pool-ratio 執行模型間造成不成比例的份額

**證據**

- `TradeRequest.amount` 只標註 `@NotNull @Positive`，沒有最大值（`backend/src/main/java/com/ucmarket/dto/TradeRequest.java:18-20`）。
- `Market.buy()` 直接把 `amount` 全數加進對應 pool（`backend/src/main/java/com/ucmarket/entity/Market.java:260-266`），`shares = amount / currentOdds` 也沒有上限（`backend/src/main/java/com/ucmarket/service/TradeService.java:50`）。

**影響**

`getMarketOdds()` 雖然把賠率夾在 1.5~5.0（`TradeQuoteService.java:50-58`），但單筆超大金額仍可用同一個夾住的賠率換到遠超其他人的份額，屬於觀察項而非阻斷缺陷，記錄供未來評估風控規則（單筆上限、滑價保護）時參考。

---

## 三、問題統計

| 等級 | 數量 | 說明 |
|---|---:|---|
| P0 | 0 | 本次後端獨立審查未發現新的 P0；既有報告的 P0（TradePanel 假成功）屬前端範疇，後端端點本身正常 |
| P1 | 7 | 既有報告 6 條後端相關 P1 全數仍存在（quote/execute 模型不一致、closeAt 競態、退款誤記、Position API 路徑缺口、Assets Ranking 無寫入源、Position schema 契約不一致）＋ 1 條新發現（`/api/positions/market/{marketId}` 無擁有者限制，洩漏他人持倉） |
| P2 | 3 | 既有報告 1 條（無 migration runner）仍存在 ＋ 2 條新發現（Market 無鎖/無版本控管的 lost-update 風險、DevWalletController 弱防護） |
| P3 | 2 | 新發現（JWT/DB 預設密鑰硬編碼、交易金額無上限），皆為觀察項 |

---

## 四、前五個最嚴重問題摘要

1. [P1] Quote 報價模型與 execute 成交模型完全不同，quote 顯示的賠率不保證是實際成交價 —— `backend/src/main/java/com/ucmarket/service/TradeQuoteService.java:15-59`
2. [P1] `closeAt` 已過但排程未執行前，`TradeService.placeTrade()` 仍可成交 —— `backend/src/main/java/com/ucmarket/service/TradeService.java:40-42`
3. [P1] 取消市場退款仍被記成 `RESOLUTION_PAYOUT`，`deriveType()` 甚至不接受 `REFUND` —— `backend/src/main/java/com/ucmarket/service/WalletService.java:151-156`
4. [P1] `GET /api/positions/market/{marketId}` 無擁有者限制，任何登入使用者可看到他人持倉成本 —— `backend/src/main/java/com/ucmarket/controller/PositionController.java:36-44`
5. [P1] Assets Ranking 依賴的 `market_price_history` 全 repo 沒有任何寫入路徑，open position 市值恆為 0 —— `backend/src/main/java/com/ucmarket/repository/RankingRepository.java:55-72`

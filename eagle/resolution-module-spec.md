# UcMarket 結算模組規格整理

## 負責範圍

我負責的是 `Resolution 結算功能`，不負責交易建立本身。

結算模組負責：

```text
1. 管理員設定市場結果 YES / NO
2. 找出該市場所有尚未結算的持倉
3. 根據市場結果計算中獎派彩
4. 更新使用者錢包餘額
5. 寫入錢包異動紀錄
6. 將持倉狀態改為 SETTLED
7. 將市場狀態改為 RESOLVED
8. 防止同一市場重複結算
```

結算模組不負責：

```text
1. 使用者買入 YES / NO
2. 價格計算
3. 建立交易紀錄
4. 建立初始持倉
5. 交易扣款
```

## ⚠️ 整合風險：目前已知但尚未解決的缺口（2026-06-17 審查記錄）

這兩項不是我這個模組本身的 bug，而是跟其他組員整合時會卡住的接線問題，先記在這裡，對齊時要主動跟對方確認：

1. **`AdminMarketController` 目前沒有呼叫 `ResolutionService`**：本文件「Controller 對應位置」那段程式碼是當初設計時的版本，但實際上傳到專案裡的 `AdminMarketController.java` 呼叫的是 `marketService.resolveMarket(id, admin.getId(), request.result())`，不是 `resolutionService.resolveMarket(...)`。也就是說目前管理員按下「結算」之後，市場狀態會變成 `RESOLVED`，但我寫的派彩邏輯完全沒有被執行——使用者不會拿到錢。這支 Controller 應該是 Market 負責人（shung）上傳時帶來的版本，需要在對齊時明確談好：結算 API 要改呼叫 `resolutionService.resolveMarket(...)`，且 `MarketService.resolveMarket()` 那份只改狀態、不派彩的版本要移除或停用，避免兩套結算邏輯並存。
2. **市場取消（cancel）沒有退款流程**：`MarketController.cancelMarket()` 目前只把市場狀態改成 `CANCELED`，沒有退還使用者已花費的點數；`WalletTransactionType.REFUND` 這個型別目前定義了但完全沒用到。退款邏輯按職責劃分應該也算 Resolution 範圍，但牽涉到另一支 Controller 的接線，目前還沒動手，先記錄成已知缺口，等對齊時跟負責 Market 的組員協調 cancel 端點要改呼叫哪個方法。

## 需要交易組員提供的資料

交易功能完成後，必須產生這些資料，結算功能才能正確運作：

```text
positions.userId
positions.marketId
positions.yesShares
positions.noShares
positions.yesCost
positions.noCost
positions.status = OPEN

wallets.userId
wallets.balance
```

也就是說，交易組員買入成功後，要建立或更新使用者的 `Position`，並確保該使用者有 `Wallet`。

## 結算流程

```text
1. 管理員呼叫結算 API
2. 系統取得 Market
3. 檢查 Market 是否已經 RESOLVED
4. 檢查 Market 是否為 ACTIVE 或 CLOSED
5. 取得該市場所有 OPEN positions
6. 若結果為 YES，使用 yesShares 計算派彩
7. 若結果為 NO，使用 noShares 計算派彩
8. 中獎者錢包加上 payout
9. 寫入 wallet_transactions
10. 所有 position 改為 SETTLED
11. Market 改為 RESOLVED
```

## API 說明

### 結算市場

```http
POST /api/admin/markets/{id}/resolve
```

這支 API 是給管理員使用的市場結算 API。管理員確認市場結果後，透過這支 API 傳入市場 ID 與結算結果，系統會執行完整結算流程。

### Path Variable

| 名稱 | 型別 | 說明 |
| --- | --- | --- |
| id | UUID | 要結算的市場 ID |

### Request Body

```json
{
  "result": "YES"
}
```

或：

```json
{
  "result": "NO"
}
```

欄位說明：

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| result | MarketResult | 是 | 市場最後結果，目前 MVP 只支援 `YES` 或 `NO` |

`ResolveMarketRequest` 目前只有一個欄位：

```java
public record ResolveMarketRequest(@NotNull MarketResult result) {
}
```

### Response

成功時會回傳結算後的 `Market`。

重要欄位會變成：

```json
{
  "status": "RESOLVED",
  "result": "YES"
}
```

如果傳入 `NO`，則會是：

```json
{
  "status": "RESOLVED",
  "result": "NO"
}
```

### Controller 對應位置

```java
@PostMapping("/{id}/resolve")
public Market resolveMarket(@PathVariable UUID id, @Valid @RequestBody ResolveMarketRequest request) {
	return resolutionService.resolveMarket(id, request.result());
}
```

Controller 只負責接收 HTTP request，真正的結算邏輯放在 `ResolutionService`。

### Service 對應方法

```java
@Transactional
public Market resolveMarket(UUID marketId, MarketResult result)
```

這個方法負責：

```text
1. 找到指定 Market
2. 檢查 Market 型別是否為 BINARY（不是的話直接回 400，2026-06-17 新增）
3. 檢查 Market 是否可以結算
4. 找出 OPEN positions
5. 根據 YES / NO 計算 payout
6. 透過 WalletService.credit(...) 入帳並寫入 WalletTransaction（2026-06-17 改為呼叫 WalletService，不再自己直接操作 WalletRepository）
7. 將 Position 改為 SETTLED
8. 將 Market 改為 RESOLVED
```

因為有 `@Transactional`，所以結算流程中如果有任一步失敗，資料會整體回復，不會只派彩一半。

**2026-06-17 更新**：第 2 步（marketType 檢查）跟第 6 步（改走 WalletService）是這次架構審查後新增的修正，細節見文件最後的「本次修正記錄」。

### 狀態限制

可以結算的市場狀態：

```text
ACTIVE
CLOSED
```

不能結算的市場狀態：

```text
DRAFT
PENDING
RESOLVED
REJECTED
CANCELED
```

其中 `RESOLVED` 特別重要，因為已結算市場不能再次結算，避免重複派彩。

### 錯誤情境

| 情境 | HTTP 狀態 | 原因 |
| --- | --- | --- |
| 找不到 marketId | 404 Not Found | 市場不存在 |
| result 沒有傳 | 400 Bad Request | `result` 是必填欄位 |
| 市場已經 RESOLVED | 400 Bad Request | 防止重複結算 |
| 市場不是 ACTIVE 或 CLOSED | 400 Bad Request | 市場尚未進入可結算狀態 |
| 市場 marketType 不是 BINARY | 400 Bad Request | 本服務目前只支援二元市場結算（2026-06-17 新增） |
| 找不到使用者 Wallet | 400 Bad Request | 持倉存在，但錢包資料缺失（現由 WalletService 拋出） |

### API 呼叫範例

用 YES 結算市場：

```bash
curl -X POST http://localhost:8080/api/admin/markets/{marketId}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "result": "YES"
  }'
```

用 NO 結算市場：

```bash
curl -X POST http://localhost:8080/api/admin/markets/{marketId}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "result": "NO"
  }'
```

### 複習重點

這支 API 表面上只是把市場結果設成 `YES` 或 `NO`，但實際上背後會同時影響三個核心資料：

```text
1. Market
   - status 改為 RESOLVED
   - result 設為 YES 或 NO

2. Position
   - 該市場所有 OPEN positions 改為 SETTLED

3. Wallet / WalletTransaction
   - 中獎者 wallet.balance 增加 payout
   - 新增 RESOLUTION_PAYOUT 錢包異動紀錄
```

所以結算 API 不只是狀態更新，而是一次完整的資產結算流程。

## 目前已完成檔案

```text
entity/Position.java
entity/PositionStatus.java
entity/Wallet.java
entity/WalletTransaction.java
entity/WalletTransactionType.java

repository/PositionRepository.java
repository/MarketRepository.java

service/ResolutionService.java
service/WalletService.java（harry 負責；2026-06-17 起 ResolutionService 改成依賴這支對外方法，不再直接碰 WalletRepository / WalletTransactionRepository）

controller/AdminMarketController.java（目前實際呼叫的是 MarketService.resolveMarket，尚未接到 ResolutionService，見上方「整合風險」）
```

## 結算規則

目前 MVP 只支援二元市場：

```text
MarketResult.YES
MarketResult.NO
```

`resolveMarket` 一開始就會檢查 `market.getMarketType()` 是否為 `"BINARY"`，不是的話直接丟 400。這是為了將來 `market_options`（次數型 / 多選項市場）上線時預留的安全網——避免那種市場悄悄被當成二元市場、用 `yesShares`/`noShares` 算出錯誤的 payout 卻沒有任何錯誤訊息。

派彩邏輯：

```text
結果 YES：payout = yesShares
結果 NO：payout = noShares
```

輸家不派彩，但持倉仍然會改成：

```text
PositionStatus.SETTLED
```

## 防重複結算

每筆派彩會建立一個 idempotency key：

```text
resolution:{marketId}:{userId}
```

用途是避免同一個使用者在同一個市場被重複派彩。

**2026-06-17 更新**：這個 idempotency key 現在是直接傳給 `WalletService.credit(...)`，由 WalletService 內部用 `findByIdempotencyKey` 原子查詢（查到就直接回傳既有紀錄，不會重複扣/加錢）並搭配 `findByUserIdForUpdate` 悲觀鎖。舊版是 `ResolutionService` 自己用 `existsByIdempotencyKey` 先查再寫、且查 Wallet 時沒有上鎖，理論上在「同一個使用者同時被多個市場結算」的情境下有競態風險；改走 `WalletService` 之後跟錢包模組共用同一套鎖與防重機制，這個風險就消除了。

## 已完成測試

目前測試已通過：

```text
1. YES 結算時，YES 持倉者獲得派彩
2. NO 結算時，NO 持倉者獲得派彩
3. 輸家不派彩，但 position 仍然會 SETTLED
4. 已 RESOLVED 市場不能重複結算
5. PENDING 市場不能結算
6. 非 BINARY 市場不能用本服務結算（2026-06-17 新增）
7. 全部後端測試通過
```

## 給組員的對齊版本

我的結算模組已經完成 MVP。

交易組員只要確保交易成功後會建立 `positions` 和 `wallets`，我這邊就可以在管理員結算市場時，根據 `OPEN positions` 自動派彩、更新錢包、留下 `RESOLUTION_PAYOUT` 紀錄，並把市場與持倉改成已結算狀態。

## 排行榜 API MVP 整理

排行榜功能目前不建立新的排行榜資料表，而是從既有業務資料即時計算。

主要資料來源：

```text
users
wallets
wallet_transactions
positions
markets
market_price_history
```

目前 MVP 已完成三支 API：

```text
GET /api/rankings/profit
GET /api/rankings/win-rate
GET /api/rankings/assets
```

Controller 對應位置：

```java
@RestController
@RequestMapping("/api/rankings")
public class RankingController
```

Service 對應位置：

```java
RankingService
```

Repository 對應位置：

```java
RankingRepository
```

Repository 使用 native SQL 查詢，並透過 projection interface 回傳查詢結果，再由 `RankingService` 轉成 API response DTO。

### 1. 盈虧排行榜 API

```http
GET /api/rankings/profit
```

用途：

```text
依使用者已實現盈虧排序，顯示誰目前從已結算市場中賺最多。
```

計算來源：

```text
wallet_transactions
wallets
positions
users
```

計算邏輯：

```text
totalPayout = 該使用者所有 RESOLUTION_PAYOUT 加總
settledCost = 該使用者所有 SETTLED positions 的 yesCost + noCost 加總
realizedProfit = totalPayout - settledCost
```

排序規則：

```text
1. realizedProfit 由高到低
2. username 由 A 到 Z
```

Response DTO：

```java
public record RankingProfitResponse(
		UUID userId,
		String username,
		String avatarUrl,
		BigDecimal totalPayout,
		BigDecimal settledCost,
		BigDecimal realizedProfit
) {
}
```

回傳範例：

```json
[
  {
    "userId": "00000000-0000-0000-0000-000000000001",
    "username": "eagleaby",
    "avatarUrl": "https://example.com/avatar.png",
    "totalPayout": 20.00,
    "settledCost": 12.00,
    "realizedProfit": 8.00
  }
]
```

目前正式資料庫沒有排行榜資料時，會回傳：

```json
[]
```

### 2. 勝率排行榜 API

```http
GET /api/rankings/win-rate
```

用途：

```text
依使用者在已結算市場中的預測正確率排序。
```

計算來源：

```text
users
positions
markets
wallet_transactions
wallets
```

計算邏輯（2026-06-17 修正後）：

```text
只計算 markets.status = RESOLVED 且 positions.status = SETTLED 的資料。

「預測正確」改成直接看：該使用者在這個市場是否有一筆
wallet_transactions.type = RESOLUTION_PAYOUT（透過 reference_type = 'MARKET',
reference_id = market_id 對應，再 join wallets 比對 user_id）。
也就是「有沒有實際拿到派彩」，跟盈虧排行榜判斷「贏」的方式是同一套定義。

resolvedMarketCount = 使用者參與且已結算（position SETTLED）的市場數
correctCount = 上述市場中，實際有 RESOLUTION_PAYOUT 紀錄的數量
winRate = correctCount / resolvedMarketCount
```

**為什麼要改**：原本的版本是直接比較 `yesShares > noShares` 來推算「猜對」，這跟盈虧排行榜用 `wallet_transactions` 算「實際入帳」是兩套不同定義，會出現兩邊榜矛盾的情況（例如兩邊份額相等時被判定猜錯，或份額大小跟最終是否真的拿到錢沒有直接對應）。改成共用「有沒有實際派彩」這個定義之後，勝率榜跟盈虧榜的「贏」語意才會一致。

如果使用者沒有任何已結算市場：

```text
winRate = 0
```

排序規則：

```text
1. winRate 由高到低
2. resolvedMarketCount 由高到低
3. username 由 A 到 Z
```

Response DTO：

```java
public record RankingWinRateResponse(
		UUID userId,
		String username,
		String avatarUrl,
		Long resolvedMarketCount,
		Long correctCount,
		BigDecimal winRate
) {
}
```

回傳範例：

```json
[
  {
    "userId": "00000000-0000-0000-0000-000000000001",
    "username": "eagleaby",
    "avatarUrl": "https://example.com/avatar.png",
    "resolvedMarketCount": 4,
    "correctCount": 3,
    "winRate": 0.7500
  }
]
```

### 3. 資產排行榜 API

```http
GET /api/rankings/assets
```

用途：

```text
依使用者目前總資產估值排序。
```

計算來源：

```text
users
wallets
positions
markets
market_price_history
```

計算邏輯：

```text
walletBalance = wallets.balance

openPositionValue =
  OPEN positions 的 YES 持倉數量 * 最新 yes_price
  +
  OPEN positions 的 NO 持倉數量 * 最新 no_price

totalAssetValue = walletBalance + openPositionValue
```

目前 MVP 只計算二元市場價格，因此 `market_price_history` 會使用：

```text
option_id IS NULL
yes_price
no_price
recorded_at 最新的一筆
```

只計算市場狀態為：

```text
ACTIVE
CLOSED
```

排序規則：

```text
1. totalAssetValue 由高到低
2. username 由 A 到 Z
```

Response DTO：

```java
public record RankingAssetsResponse(
		UUID userId,
		String username,
		String avatarUrl,
		BigDecimal walletBalance,
		BigDecimal openPositionValue,
		BigDecimal totalAssetValue
) {
}
```

回傳範例：

```json
[
  {
    "userId": "00000000-0000-0000-0000-000000000001",
    "username": "eagleaby",
    "avatarUrl": "https://example.com/avatar.png",
    "walletBalance": 100.00,
    "openPositionValue": 8.50,
    "totalAssetValue": 108.50
  }
]
```

計算範例：

```text
walletBalance = 100.00
yesShares = 10
noShares = 5
latest yesPrice = 0.70
latest noPrice = 0.30

openPositionValue = 10 * 0.70 + 5 * 0.30 = 8.50
totalAssetValue = 100.00 + 8.50 = 108.50
```

## 排行榜已完成檔案

```text
entity/User.java

dto/RankingProfitResponse.java
dto/RankingWinRateResponse.java
dto/RankingAssetsResponse.java

repository/RankingProfitRow.java
repository/RankingWinRateRow.java
repository/RankingAssetsRow.java
repository/RankingRepository.java

service/RankingService.java

controller/RankingController.java
```

## 排行榜已完成測試

目前已補齊三層測試：

```text
RankingControllerTest
- GET /api/rankings/profit
- GET /api/rankings/win-rate
- GET /api/rankings/assets

RankingServiceTest
- Profit row 轉 RankingProfitResponse
- Win-rate row 轉 RankingWinRateResponse
- Assets row 轉 RankingAssetsResponse

RankingRepositoryTest
- findProfitRankingsCalculatesRealizedProfit
- findWinRateRankingsCalculatesCorrectPredictionRate
- findAssetRankingsCalculatesWalletAndOpenPositionValue
```

全後端測試目前通過（2026-06-17 重新驗證，含本次修正）：

```text
Tests run: 116, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## 索引備註（2026-06-17 新增）

`findProfitRankings` 跟修正後的 `findWinRateRankings` 都會以 `wallet_transactions.type = 'RESOLUTION_PAYOUT'` 篩選資料，但這張表原本只對 `wallet_id`/`user_id`/`market_id`/`created_at`/`(reference_type, reference_id)` 建過索引，沒有對 `type` 建索引。已在 `docs/資料庫設計/ucmarket-ddl.sql` 補上：

```sql
CREATE INDEX idx_wallet_transactions_type_wallet ON wallet_transactions (type, wallet_id);
```

## 排行榜與結算的關係

排行榜不是獨立寫入的結果，而是從結算與交易資料推算出來。

其中盈虧排行榜最依賴結算資料：

```text
ResolutionService 結算成功
-> 寫入 wallet_transactions.type = RESOLUTION_PAYOUT
-> positions.status 改為 SETTLED
-> profit ranking 才能計算 totalPayout、settledCost、realizedProfit
```

勝率排行榜依賴市場結算結果（2026-06-17 修正後）：

```text
markets.status = RESOLVED
positions.status = SETTLED
wallet_transactions.type = RESOLUTION_PAYOUT（判斷是否真的拿到派彩，取代舊版用 yesShares/noShares 比大小）
```

資產排行榜依賴目前錢包與未結算持倉：

```text
wallets.balance
positions.status = OPEN
market_price_history 最新 yes_price / no_price
```

所以 Ranking MVP 的定位是：

```text
不新增排行榜資料表
不手動儲存排行榜結果
每次 API 呼叫時從現有資料即時計算
```

## 本次修正記錄（2026-06-17，架構審查後）

這次只動了我自己範圍內、不需要等其他組員對齊就能修的項目。修改的檔案：

```text
service/ResolutionService.java
service/ResolutionServiceTest.java（測試已更新並全部通過）
repository/RankingRepository.java
repository/RankingRepositoryTest.java（測試已更新並全部通過）
docs/資料庫設計/ucmarket-ddl.sql（補一個索引）
```

修了什麼：

1. **`payWinner` 改成呼叫 `WalletService.credit(...)`**，不再自己直接操作 `WalletRepository` / `WalletTransactionRepository`。換掉之後 ResolutionService 不再依賴 Wallet 模組的內部實作細節（鎖、idempotency 查詢寫法），只依賴 `WalletService` 對外的方法簽名，對齊風險更低，也補上了原本缺少的悲觀鎖。
2. **`resolveMarket` 新增 `marketType` 檢查**，不是 `BINARY` 的市場直接回 400，避免將來多選項市場上線時被本服務誤判。
3. **`findWinRateRankings` 改成以「是否實際拿到 RESOLUTION_PAYOUT」判斷預測正確**，取代原本「比較 yesShares 跟 noShares 哪邊大」的寫法，跟盈虧排行榜共用同一套「贏」的定義。
4. **`wallet_transactions` 補上 `(type, wallet_id)` 索引**，因為盈虧榜跟修正後的勝率榜都會用 `type = 'RESOLUTION_PAYOUT'` 篩選這張表。

沒修的（記錄在文件最前面的「整合風險」section）：

```text
1. AdminMarketController 還沒接到 ResolutionService —— 需要找 shung 對齊
2. 市場取消（cancel）沒有退款流程 —— 退款方法還沒寫，需要先決定要不要做、API 怎麼接
```

驗證方式：`./mvnw.cmd test`，全專案 116 個測試全過，`BUILD SUCCESS`。

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
2. 檢查 Market 是否可以結算
3. 找出 OPEN positions
4. 根據 YES / NO 計算 payout
5. 更新 Wallet
6. 新增 WalletTransaction
7. 將 Position 改為 SETTLED
8. 將 Market 改為 RESOLVED
```

因為有 `@Transactional`，所以結算流程中如果有任一步失敗，資料會整體回復，不會只派彩一半。

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
| 找不到使用者 Wallet | 400 Bad Request | 持倉存在，但錢包資料缺失 |

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
repository/WalletRepository.java
repository/WalletTransactionRepository.java

service/ResolutionService.java

controller/AdminMarketController.java
```

## 結算規則

目前 MVP 只支援二元市場：

```text
MarketResult.YES
MarketResult.NO
```

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

## 已完成測試

目前測試已通過：

```text
1. YES 結算時，YES 持倉者獲得派彩
2. NO 結算時，NO 持倉者獲得派彩
3. 輸家不派彩，但 position 仍然會 SETTLED
4. 已 RESOLVED 市場不能重複結算
5. PENDING 市場不能結算
6. 全部後端測試通過
```

## 給組員的對齊版本

我的結算模組已經完成 MVP。

交易組員只要確保交易成功後會建立 `positions` 和 `wallets`，我這邊就可以在管理員結算市場時，根據 `OPEN positions` 自動派彩、更新錢包、留下 `RESOLUTION_PAYOUT` 紀錄，並把市場與持倉改成已結算狀態。

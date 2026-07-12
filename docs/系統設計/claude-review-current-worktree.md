# Claude Code 二次驗收：目前工作樹整包改動

> 歷史驗收任務：此處的「目前工作樹」只指建立本檔當時的變更。現行基準請見 `../current-implementation.md`，不得把本檔的驗證結果視為最新測試結果。

## 驗收模式

- 請採唯讀審查；不要修改程式碼、不要 commit。
- 驗收對象是目前工作樹的 10 個受版控檔案變更；本文件本身只是交接資料，不屬產品改動。
- 請依嚴重度列 findings，並以 `ACCEPT`、`ACCEPT WITH NOTES` 或 `REJECT` 作整包結論。
- 若有不確定的產品規則，請標示「需確認」，不要假設預期行為。

## 本輪目標

1. 讓時事市場頁可透過後端 `status` 查詢只取得 ACTIVE 市場。
2. 建立／更新市場時驗證 `sourceUrl` 為 HTTP(S) URL，並讓前端安全呈現無效或缺失來源。
3. 修正排行榜資產估值：優先使用最新 binary 價格歷史、沒有歷史時以 pool ratio fallback，且不計入 option position。
4. 增加對應後端與 Repository 回歸測試。

## 受驗收檔案與預期行為

### A. 市場列表與來源網址驗證

- `backend/src/main/java/com/ucmarket/controller/MarketController.java`
  - `GET /api/markets?status=ACTIVE` 應呼叫分頁 `findByStatus`。
  - `PUT /api/markets/{id}` 應套用 Bean Validation。
- `backend/src/main/java/com/ucmarket/repository/MarketRepository.java`
  - 新增 `Page<Market> findByStatus(MarketStatus, Pageable)`。
- `backend/src/main/java/com/ucmarket/dto/CreateMarketRequest.java`
- `backend/src/main/java/com/ucmarket/dto/UpdateMarketRequest.java`
  - `sourceUrl` 僅接受空字串或 HTTP(S) URL；`null` 的相容性也請檢查。
- `backend/src/test/java/com/ucmarket/controller/MarketControllerTest.java`
  - 新增 status filter、create／update invalid URL 與 sourceUrl 保存測試。

必查：category 和 status 同時提供時，既有 `findByCategoryAndStatus` 分支是否仍維持正確優先順序；update 的 validation 是否真的在 controller 層執行。

### B. 時事前端來源顯示

- `frontend/src/pages/public/market-detail-current-affairs/index.jsx`
  - `getSourceDisplay` 不得讓 malformed source URL 造成 render crash。
  - 只有 HTTP(S) URL 才可輸出外連結；其他值以純文字顯示。

必查：前端 `getCurrentEventMarkets({ status: 'ACTIVE', size: 6 })` 與新增後端 status filter 的資料型態、query 參數和回傳結果是否相容；確認 `target="_blank"` 的安全屬性仍足夠。

### C. 排行榜資產估值（P1 + P2）

- `backend/src/main/java/com/ucmarket/repository/RankingRepository.java`
  - `latest_binary_price` 只讀取 `market_price_history.option_id IS NULL` 的最新價格。
  - OPEN、ACTIVE/CLOSED 的 binary position 以最新 YES/NO price 估值。
  - 沒有價格歷史時，YES/NO 皆以 `0` 估值（`COALESCE(lbp.yes_price, 0)` / `COALESCE(lbp.no_price, 0)`），與 canonical DDL 一致；不使用 pool ratio fallback。
  - `p.option_id IS NULL`：option position 不得混入 binary 資產估值（P2）。
- `backend/src/test/resources/data.sql`
  - H2 test schema 補 `positions.option_id`，使 native query 與 option-position 測試可執行。
- `backend/src/test/java/com/ucmarket/repository/RankingRepositoryTest.java`
  - 無價格歷史的 zero-value 測試 `findAssetRankingsUsesZeroValueWithoutPriceHistory`：預期 `openPositionValue = 0.00`、`totalAssetValue = 100.00`。
  - 新增 option position 排除測試：wallet `100.00`、option position 的理論 pool 值 `80.00`，但預期 `openPositionValue = 0.00`、`totalAssetValue = 100.00`。

必查：

1. canonical DDL `docs/資料庫設計/ucmarket-ddl.sql` 的 `v_ranking_assets` 與本輪 Repository 在無價格歷史時皆使用 `COALESCE(lbp.*, 0)`，估值同為 `0`，兩端一致（先前的 pool-ratio fallback 漂移已移除）。請確認此對齊仍成立，勿再引入分歧。
2. `Position` JPA entity 目前未映射 `option_id`，但 production DDL 有該欄。請確認本輪僅以 native SQL / test schema 補欄是否足夠，或應列出 mapping contract 風險；不要自行擴大成多選項功能。
3. 移除 `AND p.option_id IS NULL` 後，option regression test 應失敗（會估出 `80.00`）；確認測試具有真正的回歸保護力。
4. 在不存在 price history 的情況，估值恆為 `0`（已無 pool-ratio 除法），與產品期望是否合理。

### D. CORS 測試強化

- `backend/src/test/java/com/ucmarket/config/WebConfigTest.java`
  - 由「不拋例外」改為驗證 `/api/**` 真的載入逗號分隔的 configured origins。

必查：Reflection 取得 `CorsRegistry` 內部設定的做法是否穩定，且測試目的確實對應 `WebConfig` 行為。

## 已有驗證證據

已在 `backend/` 執行：

```bash
./mvnw -Dtest=RankingRepositoryTest test
```

結果：`Tests run: 5, Failures: 0, Errors: 0`。

這只驗證 RankingRepository 範圍，不能視為整包改動驗收。請 Claude 另行執行：

```bash
cd backend && ./mvnw clean test
cd frontend && npm run build
```

前端 `package.json` 未定義 test 或 lint script；請以 `npm run build` 作最低可執行驗證，並以 code review 檢查來源 URL 顯示分支。

## 建議輸出格式

```text
Overall verdict: ACCEPT | ACCEPT WITH NOTES | REJECT

Findings:
- [P?] file:line - impact, evidence, and required follow-up

Validated:
- status filtering and DTO validation
- frontend malformed-source handling
- ranking price / fallback / option-position rules
- DDL and entity contract
- backend full suite and frontend build
```

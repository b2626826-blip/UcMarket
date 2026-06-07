# Agent.md - UcMarket AI 接手指南

這份文件給未來接手 UcMarket 的 AI agent 使用。請先讀完本檔，再讀 `README.md`、`docs/project-spec.md`、`docs/系統設計/技術架構.md`、`docs/資料庫設計/ucmarket-integrated-erd.md` 與相關 DDL。

## 1. 這個專案目標是什麼

UcMarket 是一個以「虛擬點數」運作的模擬預測市場平台。使用者可以瀏覽未來事件市場，針對 Yes / No 結果進行預測交易，也可以提交自己的預測盤；市場經規則檢查與管理員審核後上架，截止後由管理員設定結果，系統完成結算、錢包異動、持倉更新與排行榜統計。

這不是電商，也不是金流、賭博或加密貨幣入金平台。專案重點是完整展示預測市場產品的核心流程：

- 使用者註冊、登入、登出與權限控管。
- 虛擬點數錢包、扣款、退款、結算入帳與異動紀錄。
- 市場建立、規則檢查、管理員審核、上架、截止與結算。
- Yes / No 份額交易、價格變動、交易紀錄與持倉。
- 排行榜、熱門市場、個人績效與作品集展示。
- 前後端分離架構、PostgreSQL 資料庫、n8n 自動化、API 文件與 Demo 流程。

目前專案定位是資策會跨域 Java 工程師課程期末專題與作品集。實作時要兼顧「能 Demo」、「架構清楚」、「面試時說得出設計理由」。

## 2. AI 要如何理解目前內容

請用產品流程理解 UcMarket，而不是只用檔案名稱理解。

核心流程如下：

```text
使用者登入
  -> 瀏覽市場
  -> 買入 Yes / No
  -> 產生交易紀錄與持倉
  -> 更新錢包與市場價格
  -> 市場截止
  -> 管理員設定結果
  -> 系統結算盈虧
  -> 更新錢包、持倉、排行榜與個人績效
```

開盤流程如下：

```text
使用者建立市場
  -> 填寫標題、截止時間、資料來源、結算規則
  -> 系統檢查題目是否可客觀驗證
  -> 進入 pending
  -> 管理員審核
  -> approved 後成為 active 市場
```

MVP 階段先支援二元市場：

- 市場只有 `Yes` 與 `No`。
- 交易使用 `side = yes / no`。
- `markets.result` 儲存二元市場結算結果。
- 價格使用簡化流動池模型：

```text
yes_price = no_pool / (yes_pool + no_pool)
no_price = yes_pool / (yes_pool + no_pool)
```

進階版才處理次數型、數值型、多選項市場：

- 使用 `market_options`。
- 交易改用 `option_id`。
- 可用 `result_value` 搭配 `min_value` / `max_value` 找出勝出選項。

目前專案已有的內容：

- `README.md`：專題定位、技術架構、MVP 功能與開發階段。
- `docs/project-spec.md`：完整產品規格、市場規則、角色、流程、資料表草案。
- `docs/系統設計/技術架構.md`：前後端分離、後端分層、核心模組與建議目錄。
- `docs/資料庫設計/`：DDL、ERD、資料庫設計文件與圖檔。
- `docs/resolution-ranking-planning.md`：結算、排行榜、個人績效的分工與資料流規劃。
- `backend/`：Spring Boot 後端骨架，Java 21、Spring Boot 3.5.0、JPA、Validation、Web、PostgreSQL driver。
- `frontend/`：前端目錄骨架，目前多數資料夾仍是 `.gitkeep`。
- `公版/`：獨立靜態前端參照物，Apple-like 簡潔風格，可直接開 `公版/index.html` 檢視；包含市場列表、篩選搜尋、交易試算、資產、審核、排行榜等展示畫面。

重要理解：`公版/` 是給組員對齊畫面與產品感的參照原型，不等於正式 React 前端。除非使用者明確要求，先不要把它直接混進 `frontend/`。

## 3. 專案接下來要完成什麼任務

優先順序建議如下。

### 3.1 後端基礎

- 建立 `controller`、`service`、`repository`、`entity`、`dto`、`exception`、`config`、`security` 等分層目錄。
- 設定 PostgreSQL 連線與環境變數範例。
- 根據 DDL / ERD 建立 Entity 與 Repository。
- 建立統一 API 回應格式、統一例外處理、表單驗證。
- 補上最小可驗證測試，至少讓專案能 `mvn test`。

### 3.2 核心 API

- 會員與登入：註冊、登入、登出、角色、session 或 token。
- 市場：列表、詳情、建立市場、狀態管理、審核流程。
- 交易：買入 Yes / No、試算、交易紀錄、價格更新。
- 錢包：餘額查詢、扣款、退款、結算入帳、wallet_transactions。
- 持倉：查詢個人持倉、更新份額、結算後標記。
- 結算：管理員設定結果、防止重複結算、派發收益。
- 排行榜：依資產、已實現盈虧、勝率、活躍度或交易量排序。

### 3.3 前端正式化

- 決定正式前端建置方式，原規劃是 React + JavaScript，樣式可用 Bootstrap 或 Tailwind。
- 以 `公版/` 的視覺與流程當參照，拆成正式 pages / components / api / router / store。
- 優先完成市場列表、市場詳情、交易面板、登入狀態、錢包與持倉頁。
- 前端只透過 REST API 溝通，不直接操作資料庫。

### 3.4 文件與作品集

- 讓 README、規格書、ERD、DDL、API 文件與實作保持一致。
- 加 Swagger / OpenAPI。
- 準備 Demo 帳號與展示路線。
- 加 Docker 與可重現啟動流程。
- 建立 n8n workflow：交易成功通知、每日熱門市場報表、市場截止提醒、管理員異常通知。

## 4. 未來處理任務要遵照什麼規格

### 4.1 協作規格

- 先讀現有文件與程式碼，再修改。
- 不確定時先說明假設；有多種解法時列出取捨。
- 只改和任務直接相關的檔案，不順手重構無關內容。
- 對使用者已有的變更保持尊重，不擅自還原或覆蓋。
- 每次修改都要能說明為什麼和 UcMarket 的產品流程有關。
- 若是多步驟任務，先列簡短 plan，做完後回報完成項目與驗證方式。

### 4.2 產品規格

- 平台只使用虛擬點數，不做真實金流、真實下注或賭博機制。
- MVP 先做二元 Yes / No 市場，不要太早擴充多選項交易。
- 市場必須能客觀結算，必須有明確截止時間、資料來源與結算規則。
- 避免主觀題，例如「很紅」、「成功」、「重大」、「受歡迎」這類無法客觀驗證的字眼。
- 市場狀態至少要能支援 draft / pending / active / closed / resolved / rejected / canceled 的概念。
- 管理員審核與結算都要留下操作紀錄。
- 結算要防止重複執行，錢包異動要可追蹤。

### 4.3 後端規格

- 使用 Java 21、Spring Boot、Spring MVC、Spring Data JPA、Validation、PostgreSQL。
- 採 Controller -> Service -> Repository -> Entity 分層。
- Controller 負責 request / response，不放商業邏輯。
- Service 負責交易、錢包、結算等核心邏輯；需要一致性的流程要使用 transaction。
- Repository 只處理資料存取。
- DTO 作為 API 傳輸格式，不直接把 Entity 暴露給前端。
- 表單輸入使用 validation，不把髒資料推進 Service。
- 錢包扣款、交易建立、持倉更新、市場價格更新要考慮同一交易流程的一致性。
- 結算與錢包異動要設計 idempotency 或其他防重機制。
- 測試優先覆蓋價格計算、交易扣款、餘額不足、結算派彩、重複結算。

### 4.4 資料庫規格

- 以 PostgreSQL 為主。
- 優先對齊 `docs/資料庫設計/ucmarket-ddl.sql` 與整合 ERD。
- 使用 `users`、`wallets`、`wallet_transactions`、`markets`、`market_reviews`、`market_price_history`、`market_options`、`trades`、`positions` 等核心表。
- 金額、價格、份額不要用浮點數草率處理；後端與資料庫都要選擇能支援精準計算的型別。
- 所有重要狀態欄位要有清楚 enum 或限制規則。
- 任何會影響資產或結算的資料異動，都應留下可追蹤紀錄。

### 4.5 前端規格

- 正式前端遵照 `frontend/src/pages`、`components`、`api`、`router`、`store`、`types`、`assets` 的結構。
- `公版/` 保持為獨立參照原型，除非任務明確要求搬移或改寫成 React。
- 視覺方向以乾淨、簡潔、有產品感為主；先參考 `公版/` 的 Apple-like 方向。
- 頁面應優先支援市場瀏覽、交易試算、登入狀態、錢包、持倉、審核與排行榜。
- 所有資料存取集中在 `api` 層，不要在元件中散落 fetch 邏輯。
- 修改前端後要檢查桌機與手機版是否有文字溢出、水平捲動或互動失效。

### 4.6 驗證規格

- 後端修改：優先跑 `mvn test`，必要時補 API 或 Service 測試。
- 前端修改：啟動 dev server 或直接開靜態頁，檢查主要互動與響應式畫面。
- 文件修改：確認路徑、術語、狀態名稱、資料表名稱與現有文件一致。
- 若無法驗證，回報原因，不要假裝已經通過。

## 5. 與使用者合作的方式

使用者希望更深刻地使用 AI，所以未來回應不要只給想法，要盡量產出可以直接放進專案的成果。

好的合作方式：

- 把模糊需求轉成可執行任務。
- 主動指出目前專案最需要補的缺口。
- 先保護既有架構，再提出改進。
- 需要 Demo 或參照物時，優先做可以打開看的成果。
- 回報時清楚說明改了什麼、放在哪裡、怎麼驗證。

如果使用者說「做一個參照」、「公版」、「給組員看」，預設採用：

```text
獨立資料夾 + 靜態原型 + 瀏覽器驗證
```

如果使用者說「正式接到專案」、「做成前端功能」、「串後端」，才開始動 `frontend/` 或正式 API。

## 6. 原則：Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so.
- If something is unclear, stop and name what is confusing.

## 7. 原則：Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that was not requested.
- If 200 lines could be 50, simplify.

## 8. 原則：Surgical Changes

Touch only what you must. Clean up only your own changes.

- Do not improve adjacent code, comments, or formatting without need.
- Do not refactor unrelated code.
- Match existing style.
- If unrelated dead code is noticed, mention it instead of deleting it.
- Every changed line should trace directly to the user's request.

## 9. 原則：Goal-Driven Execution

Define success criteria. Loop until verified.

For multi-step tasks, use this shape:

```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let the agent work independently. Weak criteria like "make it work" should be clarified or converted into concrete checks.

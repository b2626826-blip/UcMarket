# Agent.md - UcMarket AI 接手指南

> 現況入口：先讀 `docs/current-implementation.md`。本檔包含產品願景與合作原則；多選項市場、通知工作與績效快照屬規劃，不可當作目前已實作功能。第一階段自動化已決定使用 Java／Spring Boot，不導入 n8n。

這份文件給未來接手 UcMarket 的 AI agent 使用。請先讀完本檔，再讀 `README.md`、`docs/docsREADME.md`、`docs/project-spec.md`、`docs/系統設計/技術架構.md`、`docs/資料庫設計/ucmarket-er-diagram.md` 與相關 DDL。

## 1. 這個專案目標是什麼

UcMarket 是一個以「虛擬點數」運作的模擬預測市場平台。使用者可以瀏覽未來事件市場，針對 Yes / No 結果進行預測交易，也可以提交自己的預測盤；市場經規則檢查與管理員審核後上架，截止後由管理員設定結果，系統完成結算、錢包異動、持倉更新與排行榜統計。

這不是電商，也不是金流、賭博或加密貨幣入金平台。專案重點是完整展示預測市場產品的核心流程：

- 使用者註冊、登入、登出與權限控管。
- 虛擬點數錢包、扣款、退款、結算入帳與異動紀錄。
- 市場建立、規則檢查、管理員審核、上架、截止與結算。
- Yes / No 份額交易、價格變動、交易紀錄與持倉。
- 排行榜、熱門市場、個人績效與作品集展示。
- 前後端分離架構、PostgreSQL／Flyway、Spring 排程自動化、API 文件與 Demo 流程。

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
- 畫面與價格歷史使用同側 pool 比例；交易試算另以同側 pool 計算並限制賠率：

```text
yes_price = yes_pool / (yes_pool + no_pool)
no_price = no_pool / (yes_pool + no_pool)
yes_odds = clamp((yes_pool + no_pool) / yes_pool, 1.5, 5.0)
no_odds = clamp((yes_pool + no_pool) / no_pool, 1.5, 5.0)
shares = amount / odds
```

進階版才處理次數型、數值型、多選項市場：

- 使用 `market_options`。
- 交易改用 `option_id`。
- 可用 `result_value` 搭配 `min_value` / `max_value` 找出勝出選項。

目前專案已有的內容：

- `README.md`：專題定位、技術架構、MVP 功能與開發階段。
- `docs/docsREADME.md`：`docs/` 文件入口、閱讀順序與資料夾索引。
- `docs/project-spec.md`：完整產品規格、市場規則、角色、流程、資料表草案。
- `docs/工作計劃書/`：課程專題工作計劃書、Word 版本與網站架構圖。
- `docs/系統設計/技術架構.md`：前後端分離、後端分層、核心模組與建議目錄。
- `docs/資料庫設計/`：正式 DDL、ERD 文件、`erd/` 圖檔與原始檔、`seed/` mock data、`migrations/` 修補腳本、`notes/` 排錯筆記、`docs/資料庫設計/db-backups/` 本機 DB 備份。
- `backend/`：Spring Boot 後端，已有 controller、service、repository、entity、dto、security、exception、config 分層、Flyway migration、排程與測試。
- `frontend/`：正式 React + Vite 前端，公開、會員、管理員頁面與主要 API client 已實作；現況不可再描述為骨架或 `.gitkeep` 階段。

重要理解：目前根目錄沒有 `公版/` 或 `front/`。若未來重新加入靜態 prototype，應只作為畫面與產品感參考，不直接混進正式 `frontend/`。

## 3. 專案接下來要完成什麼任務

優先順序建議如下。

### 3.1 後端基礎

- 保持 `controller`、`service`、`repository`、`entity`、`dto`、`exception`、`config`、`security` 分層。
- PostgreSQL 連線與測試 H2 設定已存在；不要把團隊共用設定改成個人帳號。
- 後端已有 API 與測試；不要在文件固定寫死測試數量，修改後優先在 `backend/` 執行 `./mvnw test` 並以當次輸出為準。
- 後續重點是補齊仍缺的交易歷史、價格歷史讀取、通知工作、寄信與 OpenAPI；前端已宣告的 route 不等於後端已存在。

### 3.2 核心 API

- 會員與登入：已有註冊、登入、登出、目前使用者、refresh、profile、change-password 基礎 API。
- 市場：已有列表、詳情、建立、submit、update、cancel 與管理員審核/結算流程。
- 交易：已有 quote 與 BUY trade API，兩者使用同一份賠率／份額計算；SELL 尚未實作。
- 錢包：已有錢包建立、餘額查詢與異動紀錄。
- 持倉：查詢個人持倉、更新份額、結算後標記。
- 結算：管理員設定結果、防止重複結算、派發收益。
- 排行榜：已有 profit、win-rate、assets 查詢端點。

### 3.3 前端正式化

- 正式前端已採 React + Vite + JavaScript，搭配 React Router、Zustand、Bootstrap 與 Chart.js。
- 目前沒有可直接引用的 `公版/`；正式前端先以 `docs/系統設計/網站架構.md` 與 `frontend/docs/前端資料夾檔案內容.md` 作為頁面和資料夾依據。
- 目前已有首頁、政治／天氣列表、各主題詳情、交易面板、登入／註冊、個人資料、錢包、持倉、排行榜與管理後台；修改前先查實際 route 與 API 串接狀態。
- 前端只透過 REST API 溝通，不直接操作資料庫。

### 3.4 文件與作品集

- 讓 README、規格書、ERD、DDL、API 文件與實作保持一致。
- 加 Swagger / OpenAPI。
- 準備 Demo 帳號與展示路線。
- 加 Docker 與可重現啟動流程。
- 依 `docs/系統設計/自動化系統規劃.md` 以 Spring Boot 建立通知工作、寄信重試、截止提醒與報表；第一階段不建立 n8n workflow。

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
- 正式 schema 由 Flyway migration 管理，Hibernate 保持 `ddl-auto=none`；變更 Entity 時同步新增 migration 與更新 canonical DDL／ERD。
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
- 目前根目錄沒有 `公版/`；若未來新增靜態 prototype，必須保持為獨立參照物，除非任務明確要求搬移或改寫成 React。
- 視覺方向以乾淨、簡潔、有產品感為主；正式頁面結構先對齊 `docs/系統設計/網站架構.md`。
- 頁面應優先支援市場瀏覽、交易試算、登入狀態、錢包、持倉、審核與排行榜。
- 所有資料存取集中在 `api` 層，不要在元件中散落 fetch 邏輯。
- 修改前端後要檢查桌機與手機版是否有文字溢出、水平捲動或互動失效。

### 4.6 驗證規格

- 後端修改：優先跑 `mvn test`，必要時補 API 或 Service 測試。
- 前端修改：執行 `npm run test -- --run`、`npm run build`，必要時啟動 dev server 檢查主要互動與響應式畫面。
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

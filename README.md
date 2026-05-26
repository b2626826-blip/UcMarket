# UcMarket

UcMarket 是一個以虛擬點數運作的「模擬預測市場」平台。使用者可以瀏覽未來事件市場，針對 Yes / No 結果進行預測交易，也可以提交自己的預測盤，經系統規則檢查與管理員審核後上架。

本專題不處理真實金流、加密貨幣入金或實際賭博機制，重點放在預測市場產品的核心流程：市場建立、審核、交易、價格變動、資料視覺化、結果結算，以及前後端分離架構的完整實作。

## 專題定位

- 類型：模擬預測市場平台
- 目標：資策會跨域 Java 工程師課程期末專題與作品集
- 對象：想用虛擬點數參與事件預測的使用者
- 核心亮點：使用者可開盤、價格會隨交易變動、市場到期後結算
- 風險控制：市場需經過規則檢查與管理員審核，不開放真實金錢下注

## 技術架構

本專案採用前後端分離架構，前端負責畫面與互動，後端負責商業邏輯、資料庫操作、權限控管與 API 服務。

```text
Frontend
React + JavaScript
        ↓
HTTP Request
Axios / Fetch
        ↓
Backend
Spring Boot RESTful API
        ↓
Database
PostgreSQL
```

### Frontend 前端

- React
- JavaScript
- Bootstrap 或 Tailwind CSS
- Axios / Fetch 串接後端 REST API

### Backend 後端

- Java
- Spring Boot
- Spring MVC
- Spring Security
- Spring Data JPA / Hibernate
- RESTful API

### Database 資料庫

- PostgreSQL
- 會員資料
- 市場資料
- 交易紀錄
- 錢包紀錄
- 後台管理資料

### Automation 自動化流程

- n8n
- 交易成功通知
- 每日熱門市場報表
- 市場截止提醒
- 管理員異常通知

### Dev / Portfolio 工程化與作品集

- Git / GitHub
- Swagger / OpenAPI
- Docker
- README
- 架構圖 / API 文件
- Demo 帳號與展示流程

## MVP 功能

- 使用者註冊、登入、登出
- 虛擬點數錢包
- 市場列表與市場詳細頁
- Yes / No 份額買賣
- 簡化版價格機制
- 使用者提交預測盤
- 管理員審核市場
- 管理員設定市場結果
- 系統自動結算盈虧
- 交易紀錄與排行榜

## 市場類型規劃

MVP 階段先支援二元市場，也就是每個市場只有 Yes / No 兩個交易結果。這能讓專題先完整展示會員、開盤、審核、交易、錢包、持倉與結算流程。

後續完整版本會擴充「次數型 / 數值型市場」，例如「某人在指定時間內公開說出某句話幾次？」。此類市場需要將答案拆成可交易區間，例如 0 次、1 次、2-3 次、4 次以上，並以市場選項表支援多個結果，而不是只使用 yes_pool / no_pool。

## 核心模組

- 會員系統：註冊、登入、登出、權限控管
- 市場系統：市場列表、詳情、建立、審核、狀態管理
- 交易系統：買入 / 賣出、交易紀錄、價格計算
- 錢包系統：餘額查詢、扣款、退款、錢包異動紀錄
- 後台系統：會員管理、市場審核、市場結算、報表查看
- n8n 自動化：通知、排程報表、截止提醒、異常通知

## 開發階段

### 第一階段：完成基本功能

- 建立前後端專案
- 建立資料庫
- 完成會員註冊與登入
- 完成市場列表與市場詳情
- 完成基本交易流程
- 完成錢包餘額與交易紀錄

### 第二階段：提升架構完整度

- 加入 Spring Security
- 使用 DTO 區分 API 傳輸資料
- 加入統一例外處理
- 加入表單驗證
- 加入 Swagger / OpenAPI 文件
- 建立後台管理功能

### 第三階段：加入作品集亮點

- 整合 n8n Webhook 通知
- 建立每日報表 workflow
- 建立市場截止提醒 workflow
- 加入 Docker
- 撰寫 README 與架構圖
- 準備 Demo 帳號與展示流程

## 文件

- 專題規格書：[docs/project-spec.md](docs/project-spec.md)
- 技術架構：[docs/專案架構/技術架構.md](docs/專案架構/技術架構.md)

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

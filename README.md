# UcMarket

> 目前程式碼基準、已實作功能、API、前端路由與資料庫範圍請先讀 [docs/current-implementation.md](docs/current-implementation.md)。本 README 保留產品定位與啟動入口；規劃中的功能不代表已完成。

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

- React + Vite
- JavaScript
- React Router、Zustand、Bootstrap、Chart.js
- Fetch 串接後端 REST API
- Firebase Web SDK（OAuth）

### Backend 後端

- Java
- Spring Boot
- Spring MVC
- Spring Security
- Spring Data JPA / Hibernate
- Flyway
- Firebase Admin SDK
- RESTful API

### Database 資料庫

- PostgreSQL
- 會員資料
- 市場資料
- 交易紀錄
- 錢包紀錄
- 後台管理資料

### Automation 自動化流程

- Spring `@Scheduled`
- 逾期市場自動關閉
- ACTIVE 市場價格 snapshot
- 天氣市場啟動時／每日建立與自動結算
- 第一階段通知工作規劃採 Java／Spring Boot；n8n 不納入目前實作

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
- Yes / No BUY 交易
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
- 交易系統：BUY 下單、交易紀錄、價格／賠率計算；SELL 尚未實作
- 錢包系統：餘額查詢、扣款、退款、錢包異動紀錄
- 後台系統：會員管理、市場審核、市場結算、報表查看
- 自動化系統：Spring 排程、天氣市場建立／結算、價格 snapshot；通知工作尚未實作

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

- 依 `docs/系統設計/自動化系統規劃.md` 建立可靠通知工作、寄信與重試
- 建立每日報表與市場截止提醒排程
- 加入 Docker
- 撰寫 README 與架構圖
- 準備 Demo 帳號與展示流程

## 後端資料庫設定

正式 schema 由 Flyway 管理，目前 migration 到 `V5`。空白資料庫啟動時會自動套用 `backend/src/main/resources/db/migration/`；既有資料庫首次納管請先閱讀 [Flyway migration 操作手冊](backend/src/main/resources/Flyway-migration-操作手冊.md)，不要自行修改已套用的 migration。

後端 datasource 預設值集中在 `backend/src/main/resources/application.properties`。團隊與部署環境建議用下列環境變數覆蓋，不在 README 複製或固定密碼：

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ucmarket
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your-password
```

團隊共用的 `application.properties` 不要改成個人帳號。每個人如果本機 PostgreSQL 帳號、密碼或 port 不同，請用環境變數覆蓋。

例如本機帳號是 `eagleaby` 且密碼為空，可以在 STS Run Configuration 或 Terminal 設定：

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ucmarket
SPRING_DATASOURCE_USERNAME=eagleaby
SPRING_DATASOURCE_PASSWORD=
```

在 `backend` 目錄啟動後端服務時，也可以直接帶環境變數：

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ucmarket SPRING_DATASOURCE_USERNAME=eagleaby SPRING_DATASOURCE_PASSWORD= ./mvnw spring-boot:run
```

如果使用 Docker PostgreSQL，請確認 `SPRING_DATASOURCE_URL`、帳號、密碼與 Docker container 對外開放的 port 一致。

## 後端測試執行

後端測試請在 `backend` 目錄執行：

```bash
cd backend
./mvnw test
```

測試環境會讀取 `backend/src/test/resources/application.properties`，使用 H2 記憶體資料庫，不需要先啟動本機 PostgreSQL。若 Windows 使用者環境已設定 `SPRING_DATASOURCE_*`，Spring 仍會讓環境變數覆蓋測試設定；請先在目前 PowerShell process 清除後再跑：

```powershell
$env:SPRING_DATASOURCE_URL=$null
$env:SPRING_DATASOURCE_USERNAME=$null
$env:SPRING_DATASOURCE_PASSWORD=$null
.\mvnw.cmd test
```

如果在專案根目錄直接執行 Maven wrapper，會因為 wrapper 位於 `backend/` 而失敗。

## 文件

- 目前實作基準：[docs/current-implementation.md](docs/current-implementation.md)
- 文件總覽：[docs/docsREADME.md](docs/docsREADME.md)
- 專題規格書：[docs/project-spec.md](docs/project-spec.md)
- 工作計劃書：[docs/工作計劃書/UcMarket工作計劃.md](docs/工作計劃書/UcMarket工作計劃.md)
- 技術架構：[docs/系統設計/技術架構.md](docs/系統設計/技術架構.md)
- 網站架構：[docs/系統設計/網站架構.md](docs/系統設計/網站架構.md)
- 自動化系統規劃：[docs/系統設計/自動化系統規劃.md](docs/系統設計/自動化系統規劃.md)
- 資料庫設計：
  - ER 圖：[docs/資料庫設計/ucmarket-er-diagram.md](docs/資料庫設計/ucmarket-er-diagram.md)
  - DDL：[docs/資料庫設計/ucmarket-ddl.sql](docs/資料庫設計/ucmarket-ddl.sql)

## 前端規劃

- 正式前端位置：[frontend/](frontend/)
- 前端資料夾規劃：[frontend/docs/前端資料夾檔案內容.md](frontend/docs/前端資料夾檔案內容.md)
- 頁面架構來源：[docs/系統設計/網站架構.md](docs/系統設計/網站架構.md)

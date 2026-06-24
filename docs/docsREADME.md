# UcMarket 文件總覽

這份文件是 `docs/` 的入口，幫助後續開發時快速判斷每份文件的用途與閱讀順序。

## 建議閱讀順序

1. `../README.md`
   - 專案定位、技術架構、MVP 功能與主要文件入口。
2. `project-spec.md`
   - 產品規格、角色、核心流程、API 規劃與展示重點。
3. `工作計劃書/UcMarket工作計劃.md`
   - 課程專題工作計劃書與書面報告內容。
4. `系統設計/技術架構.md`
   - 前後端分離、後端分層、核心模組與建議目錄。
5. `系統設計/網站架構.md`
   - 網站頁面、正式前端路由、API 串接與目前實作狀態。
6. `資料庫設計/ucmarket-er-diagram.md`
   - ER 圖、資料表關係與整併決策。
7. `資料庫設計/ucmarket-ddl.sql`
   - PostgreSQL DDL、索引、view 與約束。

## 文件分區

### 專題規格

| 文件 | 用途 |
| --- | --- |
| `project-spec.md` | 產品規格、MVP 範圍、市場規則、API 與里程碑 |

### 工作計劃書

| 文件 | 用途 |
| --- | --- |
| `工作計劃書/UcMarket工作計劃.md` | 主要 Markdown 工作計劃書 |
| `工作計劃書/UcMarket工作計劃.docx` | Word 版本工作計劃書 |
| `工作計劃書/圖4-3-1-UcMarket預測市場平台網站架構圖.png` | 工作計劃書引用的網站架構圖 |

### 系統設計

| 文件 | 用途 |
| --- | --- |
| `系統設計/技術架構.md` | 技術選型、後端分層、前後端分離與核心模組 |
| `系統設計/網站架構.md` | 頁面架構、正式前端路由、API 對應與資料流 |
| `系統設計/網站規劃圖.svg` | 網站頁面規劃圖，可放簡報或報告 |
| `系統設計/網站規劃圖.png` | 網站頁面規劃圖的 PNG 版本 |
| `系統設計/圖4-3-1-UcMarket預測市場平台網站架構圖拷貝.png` | 工作計劃書使用的網站架構圖備份 |

### 資料庫設計

| 文件 | 用途 |
| --- | --- |
| `資料庫設計/ucmarket-er-diagram.md` | 可閱讀版 ERD 與資料表說明 |
| `資料庫設計/ucmarket-ddl.sql` | PostgreSQL schema、索引與排行榜/reporting views |

### 資料庫設計子資料夾

| 資料夾 / 文件 | 用途 |
| --- | --- |
| `資料庫設計/erd/ucmarket-er-diagram.mmd` | Mermaid ERD 原始檔 |
| `資料庫設計/erd/ucmarket-er-diagram.svg` | ER 圖 SVG 輸出 |
| `資料庫設計/erd/ucmarket-er-diagram.png` | ER 圖 PNG 輸出 |
| `資料庫設計/seed/mock.sql` | 開發與測試用 mock data |
| `資料庫設計/migrations/sync-current-db-to-ddl.sql` | 將既有本機 PostgreSQL schema 對齊正式 DDL 的遷移腳本 |
| `資料庫設計/migrations/add-code-columns.sql` | 舊資料庫補上可讀 code 欄位的修補腳本 |
| `資料庫設計/migrations/drop-wallet-transaction-user-market-columns.sql` | 舊資料庫移除 `wallet_transactions` 重複欄位的修補腳本 |
| `資料庫設計/migrations/fix-admin-password.sql` | 本機 demo/admin 密碼修補腳本 |
| `資料庫設計/notes/postgresql-test-troubleshooting.md` | PostgreSQL 測試與連線排錯筆記 |
| `資料庫設計/db-backups/` | 本機資料庫整理或重建前的 SQL 備份 |

## 目前實作對齊提醒

- `frontend/` 是正式前端實作位置，目前已建立 `src/pages`、`components`、`api`、`router`、`store`、`types`、`assets` 骨架。
- 目前根目錄沒有 `公版/` 或 `front/`；若未來重新加入靜態 prototype，應只作為畫面參考，不直接混入正式前端。
- `backend/` 已有 Spring Boot API 與測試；文件整理時以目前 controller、service、repository 與 `./mvnw test` 通過結果作為後端實作現況。
- Ranking 排行榜目前以既有資料表查詢或 view 計算，不建立獨立排行榜資料表；資產榜使用 `market_price_history` 最新價格估算 OPEN 持倉價值。
- 結算與錢包異動以 `wallet_transactions` 追蹤，MVP 不另建 `resolution_payouts`。

## 維護原則

- 改 API 或資料表時，同步檢查 `project-spec.md`、`網站架構.md`、`ucmarket-er-diagram.md` 與 `ucmarket-ddl.sql`。
- 新增圖檔時，確認 Markdown 裡引用的檔名真的存在。
- 文件若描述「目前已完成」，要先對照 `backend/src/main/java/com/ucmarket`、測試檔與 `./mvnw test`，不只看 DDL 或規格。

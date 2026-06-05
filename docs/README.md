# UcMarket 文件總覽

這份文件是 `docs/` 的入口，幫助後續開發時快速判斷每份文件的用途與閱讀順序。

## 建議閱讀順序

1. `../README.md`
   - 專案定位、技術架構、MVP 功能與主要文件入口。
2. `project-spec.md`
   - 產品規格、角色、核心流程、API 規劃與展示重點。
3. `系統設計/技術架構.md`
   - 前後端分離、後端分層、核心模組與建議目錄。
4. `系統設計/網站架構.md`
   - 網站頁面、正式前端路由、API 串接與目前實作狀態。
5. `資料庫設計/ucmarket-er-diagram.md`
   - ER 圖、資料表關係與整併決策。
6. `資料庫設計/ucmarket-ddl.sql`
   - PostgreSQL DDL、索引、view 與約束。

## 文件分區

### 專題規格

| 文件 | 用途 |
| --- | --- |
| `project-spec.md` | 產品規格、MVP 範圍、市場規則、API 與里程碑 |

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
| `資料庫設計/ucmarket-er-diagram.mmd` | Mermaid ERD 原始檔 |
| `資料庫設計/ucmarket-er-diagram.svg` | ER 圖 SVG 輸出 |
| `資料庫設計/ucmarket-er-diagram.png` | ER 圖 PNG 輸出 |
| `資料庫設計/ucmarket-ddl.sql` | PostgreSQL schema、索引與排行榜/reporting views |

## 目前實作對齊提醒

- `公版/demo/` 是獨立靜態 prototype，不是正式 React 前端。
- `公版/user/` 是另一組使用者端靜態頁，目前包含首頁與 wallet 子頁。
- `frontend/` 是正式前端預留骨架，目前尚未正式開發頁面。
- `backend/` 已有 Spring Boot API 雛形，文件整理時要分清楚「規格規劃」與「已實作現況」。
- Ranking 排行榜目前以既有資料表查詢或 view 計算，不建立獨立排行榜資料表。
- 結算與錢包異動以 `wallet_transactions` 追蹤，MVP 不另建 `resolution_payouts`。

## 維護原則

- 改 API 或資料表時，同步檢查 `project-spec.md`、`網站架構.md`、`ucmarket-er-diagram.md` 與 `ucmarket-ddl.sql`。
- 新增圖檔時，確認 Markdown 裡引用的檔名真的存在。
- 文件若描述「目前已完成」，要先對照 `backend/src/main/java/com/ucmarket` 與測試檔，不只看 DDL 或規格。

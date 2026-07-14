# UcMarket 文件總覽

這份文件是 `docs/` 的入口，幫助後續開發時快速判斷每份文件的用途與閱讀順序。

文件分成「目前實作」、「產品／設計規劃」與「歷史審查」三類。只有 `current-implementation.md`、目前程式碼、測試與 canonical DDL 可用來判斷現行契約。

## 建議閱讀順序

1. `current-implementation.md`
   - 目前技術、功能、API、前端路由、資料表與驗證指令。
2. `../README.md`
   - 專案定位、技術架構、MVP 功能與主要文件入口。
3. `project-spec.md`
   - 產品規格、角色、核心流程、API 規劃與展示重點。
4. `工作計劃書/UcMarket工作計劃.md`
   - 課程專題工作計劃書與書面報告內容。
5. `系統設計/技術架構.md`
   - 前後端分離、後端分層、核心模組與建議目錄。
6. `系統設計/網站架構.md`
   - 網站頁面、正式前端路由、API 串接與目前實作狀態。
7. `系統設計/自動化系統規劃.md`
   - 目前 Java／Spring Boot 自動化決策、通知工作、排程與實作順序。
8. `資料庫設計/ucmarket-er-diagram.md`
   - ER 圖、資料表關係與整併決策。
9. `資料庫設計/ucmarket-ddl.sql`
   - 目前 PostgreSQL DDL、索引與約束；排行榜不使用 view。
10. `../backend/src/main/resources/Flyway-migration-操作手冊.md`
    - 正式 schema migration 的建立、執行、baseline 與驗證方式。

## 文件分區

### 專題規格

| 文件 | 用途 |
| --- | --- |
| `project-spec.md` | 產品規格、MVP 範圍、市場規則、API 與里程碑 |
| `current-implementation.md` | 目前程式碼契約與驗證基準 |
| `../frontend/docs/前端資料夾檔案內容.md` | 正式 React 前端結構、路由與撰寫規則 |
| `../frontend/docs/test.md` | Vitest 單元／整合測試範圍、指令與已知契約缺口 |
| `../frontend/排行榜設計語彙.md` | 排行榜黑金視覺與互動語彙 |
| `../frontend/時事盤口設計規格.md` | 時事列表與詳情的視覺／互動規格 |

### 工作計劃書

| 文件 | 用途 |
| --- | --- |
| `工作計劃書/UcMarket工作計劃.md` | 主要 Markdown 工作計劃書 |
| `工作計劃書/UcMarket工作計劃.docx` | 歷史 Word 匯出；現況註記以同名 Markdown 為準 |
| `工作計劃書/圖4-3-1-UcMarket預測市場平台網站架構圖.png` | 工作計劃書引用的網站架構圖 |

### 系統設計

| 文件 | 用途 |
| --- | --- |
| `系統設計/技術架構.md` | 技術選型、後端分層、前後端分離與核心模組 |
| `系統設計/網站架構.md` | 頁面架構、正式前端路由、API 對應與資料流 |
| `系統設計/自動化系統規劃.md` | Java／Spring Boot 自動化、通知工作與排程規劃 |
| `系統設計/網站規劃圖.svg` | 網站頁面規劃圖，可放簡報或報告 |
| `系統設計/網站規劃圖.png` | 網站頁面規劃圖的 PNG 版本 |
| `系統設計/圖4-3-1-UcMarket預測市場平台網站架構圖.png` | 工作計劃書使用的網站架構圖備份 |

### 資料庫設計

| 文件 | 用途 |
| --- | --- |
| `資料庫設計/ucmarket-er-diagram.md` | 可閱讀版 ERD 與資料表說明 |
| `資料庫設計/ucmarket-ddl.sql` | 目前 PostgreSQL schema、索引與約束 |

### 資料庫設計子資料夾

| 資料夾 / 文件 | 用途 |
| --- | --- |
| `資料庫設計/erd/ucmarket-er-diagram.mmd` | Mermaid ERD 原始檔 |
| `資料庫設計/erd/ucmarket-er-diagram.svg` | ER 圖 SVG 輸出 |
| `資料庫設計/erd/ucmarket-er-diagram.png` | ER 圖 PNG 輸出 |
| `資料庫設計/seed/mock.sql` | 開發與測試用 mock data |
| `資料庫設計/migrations/sync-current-db-to-ddl.sql` | 將既有本機 PostgreSQL schema 對齊正式 DDL 的遷移腳本 |
| `資料庫設計/migrations/add-code-columns.sql` | 舊資料庫補上可讀 code 欄位的修補腳本 |
| `資料庫設計/migrations/add-oauth-support.sql` | 舊資料庫補上第三方 OAuth 支援的修補腳本 |
| `資料庫設計/migrations/drop-wallet-transaction-user-market-columns.sql` | 舊資料庫移除 `wallet_transactions` 重複欄位的修補腳本 |
| `資料庫設計/migrations/fix-admin-password.sql` | 本機 demo/admin 密碼修補腳本 |
| `資料庫設計/notes/postgresql-test-troubleshooting.md` | PostgreSQL 測試與連線排錯筆記 |
| `../backend/src/main/resources/Flyway-migration-操作手冊.md` | Flyway migration 操作與驗證手冊 |

### 歷史審查與交接

`UcMarket-*審查.md`、`前後端整合.md` 與 `claude-review-*.md` 記錄特定時間點的審查或交接，不隨每次功能更新改寫，也不能用來判斷目前功能是否仍有相同問題。需要現況時回到 `current-implementation.md`、目前程式碼與測試。

## 目前實作對齊提醒

- `frontend/` 是正式 React + Vite 前端，已有公開、會員、管理員路由與主要 API client；實際檔案責任以 `frontend/docs/前端資料夾檔案內容.md` 為準。
- 目前根目錄沒有 `公版/` 或 `front/`；若未來重新加入靜態 prototype，應只作為畫面參考，不直接混入正式前端。
- `backend/` 已有 Spring Boot API 與測試；文件整理時以目前 controller、service、repository 與 `./mvnw test` 通過結果作為後端實作現況。
- Ranking 目前由 `RankingRepository` native SQL 直接計算，不建立獨立排行榜資料表或 view；資產榜使用 `market_price_history` 最新價格估算 OPEN 持倉價值。
- `market_price_history` 已有 JPA entity／repository／service 寫入流程；交易後與 5 分鐘排程會產生紀錄，但讀取用 Controller route 尚未提供。
- 第一階段自動化直接使用 Spring `@Scheduled`；n8n 目錄只有 `.gitkeep`，不是目前實作方向。
- `market_options`、`notifications`、`user_portfolio_snapshots` 只屬未來規劃，不在目前 DDL。
- 結算與錢包異動以 `wallet_transactions` 追蹤，MVP 不另建 `resolution_payouts`。

## 維護原則

- 改 API 或資料表時，同步檢查 `project-spec.md`、`網站架構.md`、`ucmarket-er-diagram.md` 與 `ucmarket-ddl.sql`。
- 改 schema 時以新的 Flyway migration 演進，不修改已套用版本；canonical DDL 與 ERD 必須同步。
- 新增圖檔時，確認 Markdown 裡引用的檔名真的存在。
- 文件若描述「目前已完成」，要先對照 `backend/src/main/java/com/ucmarket`、測試檔與 `./mvnw test`，不只看 DDL 或規格。

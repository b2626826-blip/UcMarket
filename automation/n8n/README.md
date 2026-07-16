# automation/n8n —— UcMarket 通知／監控整合線

n8n 自動化的家：容器定義、一鍵安裝、workflow 版控。維護：Harry。
**雙平台**：Windows 與 macOS（Intel／Apple Silicon）用同一份 compose 與文件；文件中的指令示範一律分 **cmd／PowerShell／macOS** 三種標註，照自己的殼複製整段即可。

## 檔案地圖

| 路徑 | 是什麼 |
|---|---|
| `docker-compose.yml` | 容器定義（n8n `2.29.11`＋mailpit `v1.30.4`；專案名由 `name: n8n` 釘死，跟資料夾無關）。**日常 up/stop/logs 都在本層打** |
| `install/` | 一次性安裝與快照匯入：`setup.ps1`（Win）／`setup.sh`（mac/Linux）一鍵啟動（全新安裝自動匯入**憑證＋workflows**、完成自動開網頁）；`import-workflows` 與 `import-credentials`（`.ps1`／`.sh`）以 git 快照覆蓋本機（照 id 覆蓋不長重複）；`credentials.json`（3 筆開發憑證，含 Discord webhook——**公開 repo 前必須輪替並移除**，見文件真相規則 3）；`安裝部署.md`（含 Docker/n8n 基礎說明與手動逐指令） |
| `workflows/` | workflow JSON 匯出＝**版控真相源**（目前三條：`01` 健康告警、`04` 通知 webhook ⭐、`06` 心跳）；每條的用途與驗法見該資料夾 README |
| `runbook.md` | （待產出）災難還原五步＋憑證重建 |
| `開發進度.md` | **已實作／未實作看板**——想知道做到哪先看這份（關卡狀態變動時同 commit 更新） |
| `Docker 指令完整參考手冊.md` | Docker 指令速查 |
| `.gitignore`／`.gitattributes`／`.env.example` | 擋 `.env`／強制 `*.sh` LF／環境變數範本 |

## 快速開始

- 第一次裝 → 讀 `install/安裝部署.md`
- 已裝過 → 本層 `docker compose up -d`，開 <http://localhost:5678>
- 想知道做到哪、什麼在跑 → `開發進度.md`（Discord 兩頻道：`#ucmarket-通知`＝告警、`#ucmarket-心跳`＝存活訊號） 

## 文件真相規則（手修必看）

1. 手動改了任何東西（compose、workflow、憑證名、port），**對應文件同一個 commit 內同步**——文件與現實不符時，以現實為準並視文件為壞掉待修。
2. workflow 在 n8n UI 改完 → 重新匯出 JSON 覆蓋 `workflows/` 同名檔 → 跟文件一起 commit。
3. 秘密**預設不進 git**；要把任何新秘密放進 repo，**必須先問使用者、取得核可**。目前唯一核可例外：`install/credentials.json`（開發用低敏感憑證：Discord webhook ×2＋mailpit SMTP，2026-07-16 使用者拍板「等公開再說」）。**repo 轉公開前必須先輪替 Discord webhook 並移除該檔**——Discord 在 GitHub 秘密掃描（secret scanning）合作名單內，URL 一進公開 repo 就會被自動作廢，監控線會無聲斷掉。

## 給 AI 助手（Claude 等）

- 動手前先讀本 README＋`install/安裝部署.md`；workflow 行為以 `workflows/*.json` 為準，聊天記憶或舊 spec 與 JSON 衝突時信 JSON。
- 容器操作一律在本資料夾用 `docker compose ...`（專案名已釘 `n8n`）。
- 禁用 `latest` 映像；版本策略（N-1 minor 熟成版）見 `install/安裝部署.md` §版本規則。
- 寫給隊友的任何指令示範，一律提供 **cmd／PowerShell／macOS** 三種可直接複製的完整版本（或明確標註殼差異）——三殼的引號、換行、編碼規則不同，單一版本必踩雷（範例見 `workflows/README.md` 04 卡片）。
- webhook 契約（`POST /webhook/notify`）的對外文件欄位變動必須發版本號＋差異，不默默改。
- 對外文件的措辭：用角色（核心線／整合線）不用人名，不用「等誰／卡在誰／催」等指向性字眼——只陳述事實與前置條件。

# UcMarket n8n 災難復原 Runbook

本文件用於本機／開發環境的 n8n 故障處理、資料還原、credential 重建與定期演練。
所有指令都從 `automation/n8n/` 執行；正式環境若有獨立備份或部署規範，以正式規範優先。

## 安全界線

- 不在 command、chat、log、workflow JSON、snapshot、shell history 或 `install/credentials.json` 寫入新的 secret value。
- credential value 只由操作者在 n8n UI 或受控的秘密管理介面輸入；驗證時只核對 credential 名稱與節點綁定。
- 未確認備份可讀前，不執行 `docker compose down -v`。此指令會刪除本機 n8n 帳號、workflow、execution、staticData 與 credential store。
- `02-daily-digest`、`03-closing-reminder` 由 Java WP5 負責，不得在 n8n 匯入或建立。
- `01`、`05`、`06` 只允許一台監控哨啟用，避免 Discord 重複告警；`07` 也只允許一個 instance 啟用，避免重複蒐證流量。
- 若 `05-failed-alert` 任一核心條件失敗，先 Deactivate，再排查；不要留下錯誤排程持續執行。
- 若 `07-resolution-evidence-collector` 分頁、credential 隔離或單輪上限不符合契約，先 Deactivate，再排查。

## 告警位置與責任

| Workflow | 位置 | 用途 |
|---|---|---|
| `01-health-alert` | `discord-ucmarket-通知` | backend 停止與恢復告警 |
| `05-failed-alert` | `discord-ucmarket-通知` | FAILED notification job 告警 |
| `06-heartbeat` | `discord-ucmarket-心跳` | 每整點／半點的存活訊號 |
| `04-notify-webhook` | Mailpit `http://localhost:8025` | 開發期通知郵件接收 |

安靜不一定代表正常：`06` 應出現但未出現的心跳，也是 n8n 或 backend 異常訊號。

## 災難還原五步

### 1. 隔離並記錄現況

1. 在 n8n UI 記錄目前 active workflows 與最近 execution ID／狀態，不複製 request／response body。
2. 若 Discord 重複、401／403、錯誤訊息外洩或狀態異常，先將相關 workflow Deactivate。
3. 先做唯讀檢查：

```text
docker compose ps
docker compose exec -T n8n n8n --version
curl http://localhost:5678/healthz
docker compose logs --tail 100 n8n
```

Windows PowerShell 的健康檢查可用 `curl.exe http://localhost:5678/healthz`。log 若可能含敏感資料，只在本機檢查，不貼到 issue 或聊天。

### 2. 保存仍可讀的 n8n volume

先停止容器，避免 SQLite 還在寫入：

```text
docker compose stop
```

macOS：

```bash
read -r "BACKUP_DIR?Repo 外的絕對備份目錄: "
mkdir -p "$BACKUP_DIR"
docker run --rm -v n8n_n8n_data:/data:ro -v "$BACKUP_DIR:/backup" alpine:3.22 \
  tar czf /backup/n8n-data-backup-YYYYMMDD-HHMM.tgz -C /data .
shasum -a 256 "$BACKUP_DIR/n8n-data-backup-YYYYMMDD-HHMM.tgz"
```

Windows PowerShell：

```powershell
$BackupDir = Read-Host "Repo 外的絕對備份目錄"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
docker run --rm -v n8n_n8n_data:/data:ro -v "${BackupDir}:/backup" alpine:3.22 `
  tar czf /backup/n8n-data-backup-YYYYMMDD-HHMM.tgz -C /data .
Get-FileHash (Join-Path $BackupDir "n8n-data-backup-YYYYMMDD-HHMM.tgz") -Algorithm SHA256
```

cmd 使用者請開 PowerShell 執行上段。將 `YYYYMMDD-HHMM` 換成實際時間；備份目錄必須在 Git workspace 外，且應位於受控、加密的位置。archive 含帳號、execution、credential 加密資料與 n8n encryption key，視同 secret，不得加入 Git。

### 3. 恢復容器或建立乾淨 instance

volume 仍健康時，優先保留原 volume：

```text
docker compose up -d
docker compose ps
```

確認 n8n 與 Mailpit 都是 Up，且 `http://localhost:5678/healthz` 回應正常。

只有在 volume 確定無法使用、備份已驗證且操作者明確核可時，才能重建：

```text
docker compose down -v
docker compose up -d
```

`setup.ps1`／`setup.sh` 的全新安裝流程會匯入版控快照，但匯入後 workflows 仍是 inactive。credential snapshot 可能因輪替而過期，不可直接視為可啟用狀態。

若要從 volume archive 還原，必須先確認 checksum 相符並取得刪除現有 volume 的明確核可。下列流程會建立空 volume、解壓備份，並在 n8n 正式啟動前將所有 workflows 設為 inactive。

macOS：

```bash
read -r "BACKUP_DIR?備份 archive 所在的絕對目錄: "
docker compose down -v
docker compose create
docker run --rm -v n8n_n8n_data:/data -v "$BACKUP_DIR:/backup" alpine:3.22 \
  tar xzf /backup/n8n-data-backup-YYYYMMDD-HHMM.tgz -C /data
docker compose run --rm n8n n8n unpublish:workflow --all
docker compose up -d
```

Windows PowerShell：

```powershell
$BackupDir = Read-Host "備份 archive 所在的絕對目錄"
docker compose down -v
docker compose create
docker run --rm -v n8n_n8n_data:/data -v "${BackupDir}:/backup" alpine:3.22 `
  tar xzf /backup/n8n-data-backup-YYYYMMDD-HHMM.tgz -C /data
docker compose run --rm n8n n8n unpublish:workflow --all
docker compose up -d
```

cmd 使用者請從該目錄開 PowerShell 執行上段。不要把 archive 解壓覆蓋到仍含資料的 volume；若 `unpublish:workflow --all` 失敗，不得啟動 n8n。

### 4. 匯入 workflows 並重建 credentials

從 Git 快照匯入目前五條 workflow：

| 平台 | 指令 |
|---|---|
| Windows PowerShell | `.\install\import-workflows.ps1` |
| Windows cmd | `powershell -ExecutionPolicy Bypass -File install\import-workflows.ps1` |
| macOS | `bash install/import-workflows.sh` |

匯入後必須仍為 inactive，並確認清單只有 `01-health-alert`、`04-notify-webhook`、`05-failed-alert`、`06-heartbeat`、`07-resolution-evidence-collector`；不得出現 `02`／`03`。

在 n8n UI 重建或核對：

| Credential 名稱 | 類型／固定欄位 | 必須綁定 |
|---|---|---|
| `ucmarket-n8n-service-token` | Header Auth；Header Name=`X-N8N-Service-Token` | `05` → `Fetch All FAILED Pages` |
| `ucmarket-notify-webhook-token` | Header Auth；Header Name=`X-Webhook-Token` | `04` → Webhook 驗證節點 |
| `ucmarket-resolution-evidence-candidate-read-token` | Header Auth；Header Name=`X-N8N-Service-Token` | `07` → `Fetch Candidate Pages` |
| `ucmarket-resolution-evidence-write-token` | Header Auth；Header Name=`X-N8N-Service-Token` | `07` → `Submit Evidence First Attempt`、`Retry Transient Evidence` |
| `discord-ucmarket-通知` | Discord Webhook | `01` 告警節點、`05` → `Send FAILED Alert` |
| `discord-ucmarket-心跳` | Discord Webhook | `06` 心跳節點 |
| `smtp-mailpit` | SMTP；Host=`mailpit`、Port=`1025`、SSL 關 | `04` 寄信節點 |

`ucmarket-n8n-service-token` 的 value 必須與 backend 的 `N8N_SERVICE_TOKEN` 相同；`ucmarket-notify-webhook-token` 必須與 `N8N_NOTIFY_WEBHOOK_TOKEN` 相同。`07` 的 candidate read／evidence write value 分別對應 `N8N_RESOLUTION_EVIDENCE_CANDIDATE_SERVICE_TOKEN`／`N8N_RESOLUTION_EVIDENCE_SERVICE_TOKEN`，且兩值必須不同。只確認兩端已由同一次安全輸入更新，不讀取或回顯 value。

service token 輪替順序：

1. Deactivate `05`。
2. 在 backend 的安全啟動介面更新 `N8N_SERVICE_TOKEN` 並重新啟動。
3. 在 n8n UI 覆寫 `ucmarket-n8n-service-token` 的 Value 並 Save。
4. 確認 backend 與 n8n health 都正常，再 Activate `05`。
5. 等正式 5 分鐘排程驗證；不要用手動 Execute 取代 staticData 驗收。

### 5. 依序啟用與驗收

1. backend health 必須先成功。
2. `04` 完成 token／SMTP 綁定後才啟用；backend Worker 要使用它時，先啟用 `04` 再啟動 Worker。
3. 只在指定監控哨啟用 `01`、`05`、`06`。
4. `07` 必須先完成兩組 Header Auth 交叉 403 與隔離 fixture 驗收，再由指定 instance 啟用。
5. `07` 匯入後核對 `saveDataErrorExecution=all`、`saveDataSuccessExecution=none`、`saveManualExecutions=false`、`saveExecutionProgress=false`。成功 execution 不保存；失敗 execution 必須保留供排錯，並由 n8n pruning 依保留期清理。查詢可見 execution 時以 `deletedAt IS NULL` 為準；soft-deleted 實體列不代表仍可由 UI 查閱。
6. `n8n execute` CLI 固定會把完整 runData 寫到 stdout；驗收時必須把 stdout／stderr 直接導向空裝置（macOS：`>/dev/null 2>&1`；PowerShell：`*>$null`；cmd：`>NUL 2>&1`），只以 process exit code 與 fixture `/fixture/stats` 的安全聚合判斷。禁止把 raw output 顯示於終端、導向檔案或交給 `tee`。
7. 每條 workflow 啟用後，確認下一次正式排程 execution 正常。
8. 檢查 Discord／Mailpit／`07` evidence 筆數，再記錄 execution ID、時間與結果。

## `05-failed-alert` 核心驗收矩陣

| 情境 | Execution | Discord | staticData |
|---|---|---|---|
| 新 FAILED | success | 10 分鐘內恰一則 | 發送成功後提交 |
| 相同快照下一輪 | success | 0 則 | 不重複增加 |
| job 離開 FAILED 後再次 FAILED，或 `attemptCount` 增加 | success | 恰一則 | 成功後更新 |
| 超過 100 筆安全 fixture | success；第二頁納入總數 | 每輪最多一則 | 完整分頁成功後才提交 |
| backend 停止／連線失敗／5xx | 可靜默結束 | 0 則 | 不提交 |
| 401／403／400 | 明確 failure | 0 則 | 不提交 |
| Discord 發送失敗 | failure | 送達 0 則 | 不提交 |
| Discord 恢復後下一輪 | success | 恰一則 | 只提交一次 |

訊息只允許 `jobId`、`eventType`、`attemptCount`、`updatedAt` 與統計數；不得包含 recipient、lastError、API body 或 secret。

大量 fixture 只能在隔離的本機／測試資料庫使用。執行前先記錄精確 INSERT／UPDATE／DELETE 範圍與還原 SQL，取得核可後才操作；驗收結束必須確認 fixture 為 0。

## 定期演練

建議每季及每次 n8n 升版／credential 輪替後執行：

1. 記錄 Git HEAD、n8n 版本、backend health 與 active workflows。
2. 備份 n8n volume 並驗證 checksum。
3. 在隔離 instance 匯入 workflows，手動重建 credential 綁定。
4. 依上表至少驗證新 FAILED、去重、backend 停止、Discord 失敗後恢復。
5. 清除 fixture、恢復 backend 與原 active 狀態。

演練紀錄只保存：

- 日期、操作者、Git HEAD、n8n 版本。
- execution ID、開始時間、success／error。
- Discord／Mailpit 則數與 staticData 是否提交。
- fixture 清除結果與最終 active 狀態。

不得保存 secret、credential value、recipient、API response body 或含敏感資料的 execution snapshot。`07` 的驗收紀錄只能保存 exit code，以及 `/fixture/stats` 回傳的 mode、頁碼、筆數、attempt count、403 計數與欄位契約符合筆數。

## 停止條件與交接

出現下列任一情況時，立即 Deactivate 對應的 `05` 或 `07` 並停止演練：

- 同一快照重複告警。
- Discord 發送失敗後仍提交 staticData。
- backend 無法連線、5xx、401、403 或 400 時仍提交 staticData。
- 訊息含 recipient、lastError、API body 或 secret。
- fixture 無法精確還原。
- `07` 的 candidate／evidence credential 可交叉使用、單輪超過 200 筆，或錯誤輸出含 URL、body、token。

交接時只回報嚴重度、workflow／節點、execution ID、時間、Discord 則數、staticData 是否提交與最終 runtime 狀態；不要貼 secret、PII 或 API response body。

# workflows —— 版控與使用說明

## 同步方向鐵律（先記這條）

平常唯一的同步方向是「**UI 改完 → Download → commit**」（見匯出節）。
反方向（git 快照 → 本機）叫**匯入**，只用在兩種情況：**新機器初始化**、或**明確想丟掉本機修改回到快照**。

## 匯入（新機器或想用 git 快照重置時）

一鍵：`install\import-workflows.ps1`（Win）／`bash install/import-workflows.sh`（mac）——會先警告再動手。
或手動（在 automation/n8n 層）：

```text
docker compose exec -T -u root n8n rm -rf /tmp/wfimport
docker compose cp workflows n8n:/tmp/wfimport
docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport
```

第一行必做且必須 `-u root`：`docker cp` 進容器的檔案是 root 擁有（普通使用者在 /tmp 刪不掉）；而暫存若殘留，下一次 cp 會把資料夾**巢狀塞進去**（變成 /tmp/wfimport/workflows/），匯入就掃不到檔案。

CLI 匯入的三個已知行為（**與 UI 的 Import from File 不同**，已實測）：

1. **照 id 覆蓋、不會長重複**——JSON 內帶 workflow id，重跑幾次都是同三條。（UI 的 Import from File 每次生一條新的、雙告警——別用它來「更新」，只在 CLI 不可用時救急）
2. **匯入後一律變停用**——即使快照裡是 `active: true` 也會被停用；要逐條進 UI 把 **Active** 開關打開
3. **憑證不在 workflow JSON 裡**，而在 `install/credentials.json`——用 `install\import-credentials.ps1`／`bash install/import-credentials.sh` 匯入（setup 全新安裝時自動做）。憑證照 id 匯入後，workflow 的綁定**直接生效、不用逐節點重選**

> `setup` 腳本在**全新安裝**（volume 不存在）時會自動匯入憑證＋workflows 一次；偵測到既有安裝則一律跳過，避免蓋掉 UI 內未匯出的修改。

## 匯出（在 UI 改完 workflow 後必做）

workflow 畫布 → 右上三點 → **Download** → 覆蓋本資料夾同名檔 → 跟相關文件一起 commit。

---

## 01-health-alert 健康告警

- **做什麼**：每 **10 秒** `GET /api/health`；連續 3 次失敗（約 30 秒判死）發 🔴（含已躺幾分鐘）、掛超過 30 分鐘重提醒一次、復活發 🟢（含本次停機時長）。安靜＝一切正常。
- **憑證**：`discord-ucmarket-通知`（Discord Webhook） 
- **驗法**（一定要先 Activate）：關後端 → **約 40 秒內**恰一則 🔴、再等 5 分鐘無第二則 → 重啟 → 恰一則 🟢
- **坑**：計數存在 workflow 的 staticData，**只在正式排程執行時保存**——手動 Execute 驗不了防抖與時長。

## 06-heartbeat 心跳

- **做什麼**：整點與半點 `GET /api/health`，**活著才**發 💓。「該出現的💓沒出現」＝n8n 或後端有事（監控監控者）。
- **憑證**：`discord-ucmarket-心跳`（Discord Webhook，獨立頻道）
- **驗法**：無狀態，手動 Execute 一次即應見 💓；Activate 後等下個整點／半點驗正式觸發。

## 04-notify-webhook 通知寄送收信端（契約端點 ⭐）

- **做什麼**：`POST /webhook/notify` 先用 Header Auth 驗證 `X-Webhook-Token`，通過後收 `{recipientEmail, subject, body}` → 驗必填 → 開發期以 2 秒 timeout 探測 Mailpit → 寄信 → **真寄出才回 200**。缺少／錯誤 token 回 403，缺欄回 400，Mailpit 不可用時直接回 500 且不進 Email 節點；未授權 request 也不會進 Email 節點。單純轉發、不碰語意。
- **憑證**：
  - `ucmarket-notify-webhook-token`（Header Auth）：Header Name 固定 `X-Webhook-Token`；Value 必須與後端環境變數 `N8N_NOTIFY_WEBHOOK_TOKEN` 相同。這是秘密，只建立在各 n8n instance 的 credential store，**不得**加入 `install/credentials.json` 或 commit。
  - `smtp-mailpit`（SMTP）：Host `mailpit`、Port `1025`、SSL 關、帳密空。
- **後端設定**：啟用 Worker 時同時設定 `NOTIFICATION_WORKER_ENABLED=true`、`N8N_NOTIFY_WEBHOOK_URL=http://localhost:5678/webhook/notify`、`N8N_NOTIFY_WEBHOOK_TOKEN=<同一 token>`；connect/read timeout 可用 `N8N_NOTIFY_CONNECT_TIMEOUT_MS`／`N8N_NOTIFY_READ_TIMEOUT_MS` 覆蓋，預設 2000／5000 ms。
- **URL**：正式 `http://localhost:5678/webhook/notify`（**Activate 後才存在**）；`/webhook-test/` 開頭是編輯器測試用，一次一發
- **首次綁定**：Credentials → Add credential → Header Auth，以上述名稱、Header Name 與自訂 token 建立；回到 `04` 的 Webhook 節點選取該 credential。workflow JSON 只保存 credential 參照，不保存 value。
- **開發期失敗邊界**：`Check Mailpit` 只保護目前的 Mailpit SMTP；timeout 必須短於後端 read timeout。切換正式 Email Provider 前，須以該 Provider 的有界失敗機制取代，不能把 Mailpit 探測當成正式環境保證。
- **驗法＝契約四連測**。三種殼各自完整、整段直接複製（殼之間引號／換行規則不同，別混用）：

**PowerShell**

```powershell
$WebhookToken = Read-Host "Webhook token"

# ① 成功 → 印出 status: SENT；http://localhost:8025 多一封「契約測試」
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -Headers @{"X-Webhook-Token"=$WebhookToken} `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"recipientEmail":"admin@test.local","subject":"[UcMarket] 契約測試","body":"這是一封契約測試信"}'

# ② 未授權（故意送錯 token）→ 印出 403；mailpit 不得新增信
try { Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -Headers @{"X-Webhook-Token"="wrong"} `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"recipientEmail":"admin@test.local","subject":"x","body":"y"}' }
catch { $_.Exception.Response.StatusCode.value__ }

# ③ 缺必填 → 印出 400
try { Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -Headers @{"X-Webhook-Token"=$WebhookToken} `
  -ContentType "application/json; charset=utf-8" -Body '{"subject":"x","body":"y"}' }
catch { $_.Exception.Response.StatusCode.value__ }

# ④ 暫時性失敗（先 cd automation\n8n）→ 期望印出 500；start 後重跑① 應回 SENT
docker compose stop mailpit
try { Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -Headers @{"X-Webhook-Token"=$WebhookToken} `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"recipientEmail":"a@b.c","subject":"x","body":"y"}' }
catch { $_.Exception.Response.StatusCode.value__ }
docker compose start mailpit
```

**cmd**（cmd 的編碼塞中文會亂碼，樣本改英文、語意相同）

```cmd
set "WEBHOOK_TOKEN=replace-with-local-token"

:: ① 成功 → 回 {"status":"SENT"}；http://localhost:8025 多一封信
curl -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: %WEBHOOK_TOKEN%" -H "Content-Type: application/json" -d "{\"recipientEmail\":\"admin@test.local\",\"subject\":\"[UcMarket] contract-test\",\"body\":\"contract test mail\"}"

:: ② 未授權（故意送錯 token）→ 回應第一行 HTTP/1.1 403；mailpit 不得新增信
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: wrong" -H "Content-Type: application/json" -d "{\"recipientEmail\":\"admin@test.local\",\"subject\":\"x\",\"body\":\"y\"}"

:: ③ 缺必填 → 回應第一行 HTTP/1.1 400
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: %WEBHOOK_TOKEN%" -H "Content-Type: application/json" -d "{\"subject\":\"x\",\"body\":\"y\"}"

:: ④ 暫時性失敗（先 cd automation\n8n）→ 期望 HTTP/1.1 500；start 後重跑① 應回 SENT
docker compose stop mailpit
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: %WEBHOOK_TOKEN%" -H "Content-Type: application/json" -d "{\"recipientEmail\":\"a@b.c\",\"subject\":\"x\",\"body\":\"y\"}"
docker compose start mailpit
```

**macOS（Terminal）**

```bash
read -s "WEBHOOK_TOKEN?Webhook token: "
echo

# ① 成功 → 200 {"status":"SENT"}；http://localhost:8025 多一封信
curl -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" \
  -d '{"recipientEmail":"admin@test.local","subject":"[UcMarket] 契約測試","body":"這是一封契約測試信"}'

# ② 未授權（故意送錯 token）→ 回應第一行 HTTP/1.1 403；mailpit 不得新增信
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: wrong" -H "Content-Type: application/json" \
  -d '{"recipientEmail":"admin@test.local","subject":"x","body":"y"}'

# ③ 缺必填 → 回應第一行 HTTP/1.1 400
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" \
  -d '{"subject":"x","body":"y"}'

# ④ 暫時性失敗（在 automation/n8n 內）→ 期望 HTTP/1.1 500；start 後重跑① 應回 SENT
docker compose stop mailpit
curl -i -X POST "http://localhost:5678/webhook/notify" -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" \
  -d '{"recipientEmail":"a@b.c","subject":"x","body":"y"}'
docker compose start mailpit
```

- **契約文件**：《API對接文件-對外版》（給核心線）／《API對接文件》完整版——欄位變動發版本號，不默默改。

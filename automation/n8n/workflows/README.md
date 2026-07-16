# workflows —— 版控與使用說明

## 匯入（拿到新 JSON 時）

1. n8n UI → 左上三點（或 Workflow 選單）→ **Import from File** → 選 JSON
2. 開啟每個有憑證的節點 → 重綁憑證（**憑證不隨 JSON 走**，名字對照見各卡片；沒有就照名字新建）
3. 右上 **Activate** 開關打開（排程與正式 webhook URL 都要啟用才活）

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

- **做什麼**：`POST /webhook/notify` 收 `{recipientEmail, subject, body}` → 驗必填 → 寄信（開發期進 mailpit）→ **真寄出才回 200**；缺欄 400、寄失敗 500。單純轉發、不碰語意。
- **憑證**：`smtp-mailpit`（SMTP：Host `mailpit`、Port `1025`、SSL 關、帳密空）
- **URL**：正式 `http://localhost:5678/webhook/notify`（**Activate 後才存在**）；`/webhook-test/` 開頭是編輯器測試用，一次一發
- **驗法＝契約三連測**。三種殼各自完整、整段直接複製（殼之間引號／換行規則不同，別混用）：

**PowerShell**

```powershell
# ① 成功 → 印出 status: SENT；http://localhost:8025 多一封「契約測試」
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"recipientEmail":"admin@test.local","subject":"[UcMarket] 契約測試","body":"這是一封契約測試信"}'

# ② 缺必填 → 印出 400
try { Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -ContentType "application/json; charset=utf-8" -Body '{"subject":"x","body":"y"}' }
catch { $_.Exception.Response.StatusCode.value__ }

# ③ 暫時性失敗（先 cd automation\n8n）→ 期望印出 500；start 後重跑① 應回 SENT
docker compose stop mailpit
try { Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/notify" `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"recipientEmail":"a@b.c","subject":"x","body":"y"}' }
catch { $_.Exception.Response.StatusCode.value__ }
docker compose start mailpit
```

**cmd**（cmd 的編碼塞中文會亂碼，樣本改英文、語意相同）

```cmd
:: ① 成功 → 回 {"status":"SENT"}；http://localhost:8025 多一封信
curl -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" -d "{\"recipientEmail\":\"admin@test.local\",\"subject\":\"[UcMarket] contract-test\",\"body\":\"contract test mail\"}"

:: ② 缺必填 → 回應第一行 HTTP/1.1 400
curl -i -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" -d "{\"subject\":\"x\",\"body\":\"y\"}"

:: ③ 暫時性失敗（先 cd automation\n8n）→ 期望 HTTP/1.1 500；start 後重跑① 應回 SENT
docker compose stop mailpit
curl -i -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" -d "{\"recipientEmail\":\"a@b.c\",\"subject\":\"x\",\"body\":\"y\"}"
docker compose start mailpit
```

**macOS（Terminal）**

```bash
# ① 成功 → 200 {"status":"SENT"}；http://localhost:8025 多一封信
curl -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" \
  -d '{"recipientEmail":"admin@test.local","subject":"[UcMarket] 契約測試","body":"這是一封契約測試信"}'

# ② 缺必填 → 回應第一行 HTTP/1.1 400
curl -i -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" \
  -d '{"subject":"x","body":"y"}'

# ③ 暫時性失敗（在 automation/n8n 內）→ 期望 HTTP/1.1 500；start 後重跑① 應回 SENT
docker compose stop mailpit
curl -i -X POST "http://localhost:5678/webhook/notify" -H "Content-Type: application/json" \
  -d '{"recipientEmail":"a@b.c","subject":"x","body":"y"}'
docker compose start mailpit
```

- **契約文件**：《API對接文件-對外版》（給核心線）／《API對接文件》完整版——欄位變動發版本號，不默默改。

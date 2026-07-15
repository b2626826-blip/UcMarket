# UcMarket n8n 整合規劃

> 文件定位：n8n 與既有 Java／Spring Boot 自動化的分層整合方案。本文件不推翻《自動化系統規劃》的決策——outbox、重試、冪等仍由 Java 實作且照原計畫執行；n8n 從 `EmailSender` 介面與 admin API 兩個既有接口接入，承擔外部整合與多渠道觸達。

## 1. 決策摘要

- 核心交易、市場狀態、結算與錢包仍由 Spring Boot Service 層負責，不變。
- 通知的可靠性保證（不漏發、不重發、重試、失敗紀錄）由 Java outbox（`notification_jobs`）負責，不變；WP0–WP4 照《自動化系統規劃》第 13.4 節執行，不受本文件影響。
- 通知的實際送出（Email、Discord、LINE、Telegram 等渠道）由 n8n 負責：`EmailSender` 的正式實作為 HTTP POST 到 n8n webhook。
- 外部資料進出（賽果、報價、新聞、氣象）、系統監控告警、營運報表與社群發布由 n8n 負責。
- n8n 一律透過後端 REST API 與專屬 service token 操作，不直連 PostgreSQL。
- n8n 故障不得影響市場核准、交易或結算；通知工作停留在 `RETRY`，恢復後由 Worker 自動補送。

## 2. 職責分層

| 職責 | 歸屬 | 理由 |
|---|---|---|
| 市場狀態、交易、結算、錢 | Spring Boot Service | 需要資料庫交易，不可妥協 |
| 通知的「不漏發、不重發」保證 | Spring Boot outbox（V6 `notification_jobs`） | webhook 天生會漏；冪等鍵與重試已在實作中 |
| 通知的「實際送出去」 | n8n（Email、Discord、LINE、Telegram） | 多渠道是 n8n 強項，Java 接多套渠道 SDK 維護成本高 |
| 外部資料進出（賽果、報價、新聞、氣象） | n8n | 低程式碼串 API；改資料源不改後端、不重新部署 |
| 監控、告警、報表、社群發布 | n8n | 非交易關鍵，壞了不影響平台 |

## 3. 整體架構

```mermaid
flowchart LR
    A[市場狀態變更] --> B[Spring Service 同一交易寫入 notification_jobs]
    B --> C[NotificationJobWorker 領取、重試、冪等]
    C --> D[EmailSender 介面]
    D --> E[N8nWebhookEmailSender：HTTP POST 到 n8n webhook]
    E --> F[n8n 分發]
    F --> G[SMTP Email]
    F --> H[Discord / LINE / Telegram]

    I[n8n Cron] --> J[外部 API：氣象、賽事、報價、新聞]
    J --> K[後端 admin API + service token]
    I --> L[健康檢查與告警]
    L --> H
```

接合點只有兩個，且都是既有設計預留的：

1. **`EmailSender` 介面**：《自動化系統規劃》第 5 節本來就定義成可替換的 Adapter。第一版用 `RecordingEmailSender` 驗收流程，之後新增 `N8nWebhookEmailSender` 即接上，WP0–WP4 零改動。
2. **admin／公開 REST API**：n8n 定時輪詢或呼叫結算入口，比照 `POST /api/admin/weather/resolve` 的模式。

## 4. 可靠性分析

- 漏發、重發、重試、失敗紀錄全由 outbox 保證，n8n 不承擔任何一致性責任。
- n8n 掛掉時：Worker 呼叫 webhook 失敗，工作依 1、5、30 分鐘規則進入 `RETRY`，n8n 恢復後自動補送；市場操作完全不受影響。
- webhook 呼叫視同一次寄送嘗試，成功與失敗記入 `notification_job_attempts`，管理員查詢與手動重送（WP4）行為不變。
- n8n workflow 內部的渠道失敗（例如 Discord API 掛掉但 Email 成功）第一版不回報後端，僅記錄於 n8n 執行紀錄；後端只認 webhook 回應的成功與失敗。

## 5. 分階段實作

### 階段一：Java outbox 垂直切片（進行中，不變）

WP0–WP4 照《自動化系統規劃》第 13.4 節執行，使用 `RecordingEmailSender` 驗收。本文件不改變其任何範圍與驗收條件。

### 階段一．五：n8n 監控告警（可立即平行進行，零依賴）

部署 n8n（Docker 單容器），先跑兩條不碰核心的 workflow：

1. **健康檢查**：定時打 `GET /api/health`，連續失敗發告警到管理員即時通訊。
2. **FAILED 告警**：輪詢 WP4 的 `GET /api/admin/notifications?status=FAILED`，數量超過門檻即告警。此即《自動化系統規劃》7.4「外部監控告警另行整合」預留的位子，並解掉「Email 管線壞了但告警也走 Email」的死結。

驗收：後端停機 5 分鐘內收到告警；FAILED 工作出現後 10 分鐘內收到告警；n8n 停機期間平台功能不受任何影響。

### 階段二：n8n 接管實際寄送

- 新增 `N8nWebhookEmailSender` 實作（含 timeout、webhook URL 與 token 設定鍵）。
- n8n 端建立收信 webhook、Email 模板與渠道分發。
- 之後 WP5 的每個新事件（核准、駁回、截止提醒、結算）自動獲得多渠道能力，後端只需新增事件與 payload。

驗收：暫停 n8n 後觸發送審，工作進入 `RETRY`；恢復 n8n 後自動補寄且不重複；`notification_job_attempts` 完整記錄每次 webhook 嘗試。

### 階段三：外部資料整合

把天氣市場「自動建盤＋自動結算」的既有模式推廣到其他類型，n8n 當觸發者，錢的計算仍在後端交易內：

| 市場類型 | n8n 工作 | 後端入口 |
|---|---|---|
| 運動 | 抓賽事比分 API，賽後判定結果 | 新增 admin 結算端點（比照 weather/resolve） |
| 金融 | 抓交易所公開報價，判定門檻類題目 | 同上 |
| 時事 | 到期時抓來源 URL 與相關新聞，打包結算證據 | 附給管理員一鍵確認，不自動結算 |

驗收：n8n 誤判或重複呼叫時，後端結算入口以既有狀態檢查擋下；每次自動結算留有 audit log。

### 階段四：加值層

- 新市場核准上架後自動發布到 Discord／Telegram 社群頻道。
- 每日／每週熱門市場摘要寄給訂閱使用者（拉公開排行榜與市場 API）。
- 營運日報（待審數、新註冊數、交易量）寫入 Google Sheets 或寄給管理員。
- AI 輔助審核：對 `NEEDS_REVIEW` 市場呼叫 LLM API 產生建議與理由，寫回後台當參考意見；只建議、不決定，符合《自動化系統規劃》6.3 的界線。

## 6. 前置需求

1. 後端新增 n8n 專用 service token 機制（目前僅有 ADMIN role）；token 僅授權必要端點。
2. 部署一台 n8n：Docker 單容器即可，與後端同網段，webhook 端點不對公網開放或以 token 保護。
3. n8n workflow JSON 匯出檔納入版控，放在 `automation/n8n/workflows/`。

## 7. 不該給 n8n 做的事

- 市場狀態變更、交易、結算邏輯——一律走既有 Service 層。
- 通知的冪等與重試——outbox 已負責，n8n 重做會形成兩套可靠性機制。
- 直接讀寫 PostgreSQL——繞過商業規則與 audit log，一律禁止。
- 在資料庫交易內被同步呼叫——webhook 只由 Worker 在交易外觸發。

## 8. 與主規劃的同步結果

| # | 原有差異 | 已同步決策 | 原因 |
|---|---|---|---|
| 1 | 主規劃原建議移除 `automation/n8n/` | 保留 `automation/n8n/workflows/`，將 workflow JSON 匯出檔納入版控 | n8n 定位為周邊整合層，workflow 需要版控 |
| 2 | 主規劃原將 `EmailSender` 導向 SMTP 或 Email Provider Adapter | 驗收使用 `RecordingEmailSender`；正式整合使用 `N8nWebhookEmailSender`，SMTP 由 n8n 端負責 | 渠道彈性集中在 n8n，後端無需因換渠道而改動 |

上述決策已同步回《自動化系統規劃》；僅影響 WP2 之後的一個新類別與收尾工作，不影響 WP0–WP4 的現行分工與驗收。

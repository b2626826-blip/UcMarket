# AGENTS.md

## 專案規則

實作前：

- 清楚說明假設。
- 當需求的歧義足以影響解法時，應提出詢問。
- 變更前先定義成功標準。
- 變更範圍限於被要求的任務。

## 工作方式

- 優先採用能解決既定目標的最簡單方案。
- 除非被要求，否則不要加入抽象化、選項或未來擴充性。
- 配合既有專案風格。
- 不重構不相關的程式碼。
- 除非明確要求，否則不要覆寫使用者或其他代理的異動。

## 專案邊界（2026-08-24 新增）

**UcMarket 的工作只寫進 UcMarket 的檔案。** 這條規則的由來：2026-08-21 的 Project Brain
dogfood 拿 UcMarket 當測試對象，途中發現 UcMarket 自己的缺陷後順著修下去，之後三天的部署
工作全部累積在 Project Brain 的 `agent-handoff.md` 裡，把那個專案的主線帶偏了三天。

- 在 UcMarket 動手之前，先確認自己是**在做 UcMarket**，而不是在做別的專案時順路發現了
  UcMarket 的問題。後者應該只記錄，回報給使用者決定，不要直接開始修。
- 交接紀錄一律寫本 repo 的 `agent-handoff.md`。

## 建置與測試

```bash
# backend（Maven wrapper，在 backend/ 下）
./mvnw --batch-mode clean test

# frontend（在 frontend/ 下）
npm ci
npm run test -- --run
npm run build

# 部署設定
bash deploy/gcp/test-deploy-workflow-contract.sh
bash -n deploy/gcp/render-runtime-secrets.sh
```

部署相關的操作步驟以 `deploy/gcp/GCP操作手冊.md` 為準。

## 部署注意事項

- **`gcloud` 一律帶 `--project`。** 這台機器的預設 project 不是本專案的。
- production 與 staging 跑在**同一台 VM**（`ucmarketvm`）上，分別是 `/opt/ucmarket` 與
  `/opt/ucmarket-staging` 兩套 compose stack。手動執行 compose 一定要帶 `-p`，否則 CLI 會用
  compose 檔的 `name: ucmarket`，直接操作到 production 的容器。
- 關掉 VM 等於 ucmarket.online 下線。

## Vault 同步規則

- 一旦確認 bug、review finding、技術／產品決策、Human／Claude 裁定，或會改變範圍、驗收條件、
  延後項目的結論，必須在同一輪工作同步寫入
  `C:\Users\b2626\Desktop\obisidan\vault\Project\UcMarket\`；不得只留在聊天或
  `agent-handoff.md`。
- Bug 與 finding 建立或更新 `Bug/Bug-<短標題>.md`。每筆至少記錄日期、狀態、來源、影響範圍、
  證據（檔案／行號／指令結果）與下一步，並以 wiki link 連回 `[[Project/UcMarket/專案索引]]`。
- vault 是**獨立的 git repo**，commit 與 push 都要另外取得授權。

## agent-handoff.md 寫入規則

- `agent-handoff.md` 為 append-only：每輪只以 `# ` 一級標題**追加於檔尾**，不得修改或插入
  既有節。
- 交付前必須執行 `git diff -U0 -- agent-handoff.md`，確認**只有一個檔尾 hunk**，並把該 hunk
  header 附在回報中。

## 驗證

每項任務皆應回報：異動內容、已異動的檔案、已執行的指令、結果為通過或失敗、未執行哪些檢查
以及原因。

**交給別人執行的指令，裡面的每一個具體數字、過濾器、期望輸出，都要先在本機實跑一次產生**，
不能從邏輯推導——對方沒有上下文可以判斷「這個數字看起來怪怪的」。

## 審查標準

審查程式碼時，優先檢查：

1. 正確性錯誤。
2. 行為回歸。
3. 遺漏的測試。
4. 安全性或資料處理風險。
5. 過度複雜的異動。
6. 不相關的修改。

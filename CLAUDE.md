@AGENTS.md

# CLAUDE.md

## Claude Code 規則

遵循 `AGENTS.md` 中的共用專案規則。

- 編輯前先檢查儲存庫。
- 讓變更保持精準且最小化。
- 執行最聚焦且相關的驗證指令。
- 交接前摘要說明異動檔案與測試結果。

## 這個 repo 的範圍

**只處理 UcMarket 的事。** 這個 repo 的 `agent-handoff.md` 只記 UcMarket 的工作；
Project Brain 的工作寫在 `C:\Users\b2626\desktop\Project Brain\agent-handoff.md`。
兩者曾經混在一起（2026-08-21～08-24），詳見本 repo `agent-handoff.md` 的檔頭說明。

接續工作時，**不要只讀交接檔的檔尾就開始做**——先確認這一輪要做的是哪個專案。

## 部署

任何會動到 GCP 資源、VM 或觸發 `deploy-gcp.yml` 的動作，先讀
`deploy/gcp/GCP操作手冊.md` 對應章節，並在回報中列出未執行的檢查與原因。

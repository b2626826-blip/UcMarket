# 以 repo 憑證檔覆蓋本機 n8n 憑證（install\credentials.json → 本機；同 id 覆蓋）
# 注意：本檔必須存成 UTF-8 with BOM——PowerShell 5.1 讀無 BOM 的 UTF-8 會當 ANSI，中文全亂。
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)   # compose 在上一層（automation/n8n/）

function Fail {
    param([string]$Title, [string[]]$Hints = @())
    Write-Host $Title -ForegroundColor Red
    foreach ($h in $Hints) { Write-Host "  $h" }
    Read-Host "按 Enter 關閉視窗" | Out-Null
    exit 1
}

Write-Host "本腳本會把 install\credentials.json 的 3 筆憑證匯入本機 n8n（同 id 直接覆蓋）。" -ForegroundColor Yellow
Write-Host "  你在 UI 改過這 3 筆憑證的話，會被 repo 版蓋回去" -ForegroundColor Yellow
$ans = Read-Host "確定繼續？（輸入 y 繼續，其他鍵取消）"
if ($ans -ne "y") {
    Write-Host "已取消，什麼都沒動。"
    Read-Host "按 Enter 關閉視窗" | Out-Null
    exit 0
}

docker compose cp install/credentials.json n8n:/tmp/credentials.json
if ($LASTEXITCODE -ne 0) { Fail "複製失敗——n8n 容器沒在跑（先跑 install\setup.ps1）或 install\credentials.json 不存在" }

docker compose exec -T n8n n8n import:credentials --input=/tmp/credentials.json
if ($LASTEXITCODE -ne 0) { Fail "匯入失敗——訊息在上方；n8n 剛啟動的話等 30 秒再試" }

Write-Host ""
Write-Host "匯入完成——workflow 內的憑證綁定照 id 自動生效，不用逐節點重選。" -ForegroundColor Green
Read-Host "按 Enter 關閉視窗" | Out-Null

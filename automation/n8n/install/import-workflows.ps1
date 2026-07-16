# 以 git 快照覆蓋本機 n8n 的 workflows（方向：git → 本機；平常同步方向相反，見 workflows\README.md）
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

Write-Host "本腳本會把 workflows\*.json 匯入本機 n8n（同 id 直接覆蓋）。" -ForegroundColor Yellow
Write-Host "  1) 你在 UI 改過、但還沒 Download 匯出的內容會被蓋掉" -ForegroundColor Yellow
Write-Host "  2) 匯入後這幾條 workflow 一律變停用——要進 UI 重新啟用（Active 開關）" -ForegroundColor Yellow
$ans = Read-Host "確定繼續？（輸入 y 繼續，其他鍵取消）"
if ($ans -ne "y") {
    Write-Host "已取消，什麼都沒動。"
    Read-Host "按 Enter 關閉視窗" | Out-Null
    exit 0
}

docker compose exec -T n8n rm -rf /tmp/wfimport
if ($LASTEXITCODE -ne 0) { Fail "n8n 容器沒在跑——先跑 install\setup.ps1（或本層 docker compose up -d）再來" }

docker compose cp workflows n8n:/tmp/wfimport
if ($LASTEXITCODE -ne 0) { Fail "複製 workflows 進容器失敗——確認 automation\n8n 的資料夾結構沒被搬動" }

docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport
if ($LASTEXITCODE -ne 0) { Fail "匯入失敗——訊息在上方；n8n 剛啟動的話等 30 秒再試" }

Write-Host ""
Write-Host "匯入完成。" -ForegroundColor Green
Write-Host "提醒：匯入後一律是停用狀態——到 UI 確認各節點憑證綁定，再逐條把 Active 開關打開。"
Read-Host "按 Enter 關閉視窗" | Out-Null

# UcMarket n8n 一鍵啟動（Windows PowerShell）
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

Write-Host "[1/5] 檢查 Docker..."
$dockerOk = $false
try { docker version --format '{{.Server.Version}}' | Out-Null; if ($LASTEXITCODE -eq 0) { $dockerOk = $true } } catch { }
if (-not $dockerOk) { Fail "Docker 引擎沒回應——請先開 Docker Desktop 再重跑" }

Write-Host "[2/5] 下載映像（第一次要幾分鐘，進度條是 Docker 原生顯示；已是最新則秒過）..."
docker compose pull
if ($LASTEXITCODE -ne 0) {
    Fail "docker compose pull 失敗" @(
        "多半是網路不通或 Docker Hub 暫時限流——已下載的層會續傳，重跑本腳本即可"
    )
}

# 在 up 之前偵測是不是全新安裝（volume 還不存在）——決定稍後要不要自動匯入 workflows
$vol = docker volume ls -q --filter "name=n8n_n8n_data"
$freshInstall = -not ($vol -contains "n8n_n8n_data")

Write-Host "[3/5] 啟動容器..."
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Fail "docker compose 失敗，往上看錯誤訊息。常見兩種：" @(
        "1) port 被占 → docker compose ls 揪出誰佔（別的專案就去那裡 stop）",
        "2) 版本降版與舊資料衝突 → 開發資料可拋則 docker compose down -v 重置後重跑本腳本"
    )
}

Write-Host "[4/5] 等待 n8n 就緒（最多 60 秒）..."
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ok) { Fail "n8n 60 秒內沒就緒：跑 docker compose logs n8n 查原因" }

Write-Host "[5/5] 匯入 workflows..."
if ($freshInstall) {
    $imported = $false
    docker compose exec -T n8n rm -rf /tmp/wfimport
    docker compose cp workflows n8n:/tmp/wfimport
    if ($LASTEXITCODE -eq 0) {
        docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport
        if ($LASTEXITCODE -eq 0) { $imported = $true }
    }
    if ($imported) {
        Write-Host "已匯入 workflows\ 全部快照（匯入後一律是停用狀態，啟用步驟見下方）" -ForegroundColor Green
    } else {
        Write-Host "workflow 自動匯入沒成功（環境本身沒壞）——稍後手動跑 install\import-workflows.ps1 即可" -ForegroundColor Yellow
    }
} else {
    Write-Host "偵測到既有安裝——跳過匯入，避免蓋掉你在 UI 改過但還沒匯出的 workflow。"
    Write-Host "（確定要用 git 快照覆蓋本機時，才跑 install\import-workflows.ps1）"
}

Write-Host ""
Write-Host "完成！瀏覽器已自動開啟兩個頁面：" -ForegroundColor Green
Write-Host "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
Write-Host "  mailpit 信箱 http://localhost:8025"
if ($freshInstall) {
    Write-Host ""
    Write-Host "新機器還差三步，workflow 才會真的動起來：" -ForegroundColor Yellow
    Write-Host "  1. n8n 左側 Credentials 建三個憑證：discord-ucmarket-通知／discord-ucmarket-心跳／smtp-mailpit"
    Write-Host "     （Discord webhook URL 向整合線索取；smtp-mailpit 填 Host mailpit、Port 1025、SSL 關、帳密空）"
    Write-Host "  2. 逐條開啟 workflow，在有憑證的節點重新選取剛建的憑證"
    Write-Host "  3. 右上開關 Inactive → Active 逐條啟用（匯入後一律是停用狀態）"
    Write-Host "  各 workflow 的用途與驗法見 workflows\README.md"
}
Start-Process "http://localhost:5678"
Start-Process "http://localhost:8025"
Read-Host "按 Enter 關閉視窗" | Out-Null

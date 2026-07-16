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

Write-Host "[5/5] 匯入憑證與 workflows..."
if ($freshInstall) {
    $credsOk = $false
    docker compose cp install/credentials.json n8n:/tmp/credentials.json
    if ($LASTEXITCODE -eq 0) {
        docker compose exec -T n8n n8n import:credentials --input=/tmp/credentials.json
        if ($LASTEXITCODE -eq 0) { $credsOk = $true }
    }
    $wfOk = $false
    docker compose exec -T n8n rm -rf /tmp/wfimport
    docker compose cp workflows n8n:/tmp/wfimport
    if ($LASTEXITCODE -eq 0) {
        docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport
        if ($LASTEXITCODE -eq 0) { $wfOk = $true }
    }
    if ($credsOk -and $wfOk) {
        Write-Host "已匯入 3 筆憑證＋全部 workflow 快照（綁定照 id 自動生效；workflow 匯入後一律停用）" -ForegroundColor Green
    } else {
        if (-not $credsOk) { Write-Host "憑證自動匯入沒成功（環境本身沒壞）——稍後手動跑 install\import-credentials.ps1" -ForegroundColor Yellow }
        if (-not $wfOk) { Write-Host "workflow 自動匯入沒成功（環境本身沒壞）——稍後手動跑 install\import-workflows.ps1" -ForegroundColor Yellow }
    }
} else {
    Write-Host "偵測到既有安裝——跳過匯入，避免蓋掉你在 UI 改過但還沒匯出的 workflow。"
    Write-Host "（要用 git 快照覆蓋本機：workflows 跑 install\import-workflows.ps1、憑證跑 install\import-credentials.ps1）"
}

Write-Host ""
Write-Host "完成！瀏覽器已自動開啟兩個頁面：" -ForegroundColor Green
Write-Host "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
Write-Host "  mailpit 信箱 http://localhost:8025"
if ($freshInstall) {
    Write-Host ""
    Write-Host "新機器還差兩步：" -ForegroundColor Yellow
    Write-Host "  1. 進 n8n（5678）建自己的帳號——憑證與 workflow 已自動匯入、綁定已生效"
    Write-Host "  2. 按需啟用（右上 Inactive -> Active；匯入後一律是停用狀態）："
    Write-Host "     - 04 通知 webhook：每台都可開（信只進本機 mailpit，不吵任何人）"
    Write-Host "     - 01 告警／06 心跳：只在「當監控哨的那一台」開——多台同開＝Discord 重複告警"
    Write-Host "  各 workflow 的用途與驗法見 workflows\README.md"
}
Start-Process "http://localhost:5678"
Start-Process "http://localhost:8025"
Read-Host "按 Enter 關閉視窗" | Out-Null

# UcMarket n8n 一鍵啟動（Windows PowerShell）
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)   # compose 在上一層（automation/n8n/）

Write-Host "[1/3] 檢查 Docker..."
try { docker version --format '{{.Server.Version}}' | Out-Null }
catch { Write-Host "Docker 引擎沒回應——請先開 Docker Desktop 再重跑" -ForegroundColor Red; exit 1 }

Write-Host "[2/3] 啟動容器..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose 失敗，往上看錯誤訊息" -ForegroundColor Red; exit 1 }

Write-Host "[3/3] 等待 n8n 就緒（最多 60 秒）..."
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ok) { Write-Host "n8n 60 秒內沒就緒：跑 docker compose logs n8n 查原因" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "完成！" -ForegroundColor Green
Write-Host "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
Write-Host "  mailpit 信箱 http://localhost:8025"

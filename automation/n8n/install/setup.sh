#!/usr/bin/env bash
# UcMarket n8n 一鍵啟動（macOS / Linux）
set -e
cd "$(dirname "$0")/.."   # compose 在上一層（automation/n8n/）

echo "[1/3] 檢查 Docker..."
if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "Docker 引擎沒回應——請先開 Docker Desktop 再重跑"; exit 1
fi

echo "[2/3] 啟動容器..."
if ! docker compose up -d; then
  echo "docker compose 失敗，往上看錯誤訊息。常見兩種："
  echo "  1) port 被占 → docker compose ls 揪出誰佔（別的專案就去那裡 stop）"
  echo "  2) 版本降版與舊資料衝突 → 開發資料可拋則 docker compose down -v 重置後重跑本腳本"
  exit 1
fi

echo "[3/3] 等待 n8n 就緒（最多 60 秒）..."
for i in $(seq 1 30); do
  if curl -fsS http://localhost:5678/healthz >/dev/null 2>&1; then
    echo ""
    echo "完成！"
    echo "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
    echo "  mailpit 信箱 http://localhost:8025"
    exit 0
  fi
  sleep 2
done
echo "n8n 60 秒內沒就緒：跑 docker compose logs n8n 查原因"; exit 1

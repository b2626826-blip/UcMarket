#!/usr/bin/env bash
# UcMarket n8n 一鍵啟動（macOS / Linux）
set -e
cd "$(dirname "$0")/.."   # compose 在上一層（automation/n8n/）

echo "[1/5] 檢查 Docker..."
if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "Docker 引擎沒回應——請先開 Docker Desktop 再重跑"; exit 1
fi

echo "[2/5] 下載映像（第一次要幾分鐘，進度條是 Docker 原生顯示；已是最新則秒過）..."
if ! docker compose pull; then
  echo "docker compose pull 失敗——多半是網路不通或 Docker Hub 暫時限流；已下載的層會續傳，重跑本腳本即可"
  exit 1
fi

# 在 up 之前偵測是不是全新安裝（volume 還不存在）——決定稍後要不要自動匯入 workflows
fresh_install=0
if ! docker volume ls -q --filter "name=n8n_n8n_data" | grep -qx "n8n_n8n_data"; then
  fresh_install=1
fi

echo "[3/5] 啟動容器..."
if ! docker compose up -d; then
  echo "docker compose 失敗，往上看錯誤訊息。常見兩種："
  echo "  1) port 被占 → docker compose ls 揪出誰佔（別的專案就去那裡 stop）"
  echo "  2) 版本降版與舊資料衝突 → 開發資料可拋則 docker compose down -v 重置後重跑本腳本"
  exit 1
fi

echo "[4/5] 等待 n8n 就緒（最多 60 秒）..."
ready=0
for i in $(seq 1 30); do
  if curl -fsS http://localhost:5678/healthz >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "n8n 60 秒內沒就緒：跑 docker compose logs n8n 查原因"; exit 1
fi

echo "[5/5] 匯入 workflows..."
if [ "$fresh_install" -eq 1 ]; then
  docker compose exec -T n8n rm -rf /tmp/wfimport >/dev/null 2>&1 || true
  if docker compose cp workflows n8n:/tmp/wfimport \
     && docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport; then
    echo "已匯入 workflows/ 全部快照（匯入後一律是停用狀態，啟用步驟見下方）"
  else
    echo "workflow 自動匯入沒成功（環境本身沒壞）——稍後手動跑 bash install/import-workflows.sh 即可"
  fi
else
  echo "偵測到既有安裝——跳過匯入，避免蓋掉你在 UI 改過但還沒匯出的 workflow。"
  echo "（確定要用 git 快照覆蓋本機時，才跑 bash install/import-workflows.sh）"
fi

echo ""
echo "完成！瀏覽器已自動開啟兩個頁面："
echo "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
echo "  mailpit 信箱 http://localhost:8025"
if [ "$fresh_install" -eq 1 ]; then
  echo ""
  echo "新機器還差三步，workflow 才會真的動起來："
  echo "  1. n8n 左側 Credentials 建三個憑證：discord-ucmarket-通知／discord-ucmarket-心跳／smtp-mailpit"
  echo "     （Discord webhook URL 向整合線索取；smtp-mailpit 填 Host mailpit、Port 1025、SSL 關、帳密空）"
  echo "  2. 逐條開啟 workflow，在有憑證的節點重新選取剛建的憑證"
  echo "  3. 右上開關 Inactive → Active 逐條啟用（匯入後一律是停用狀態）"
  echo "  各 workflow 的用途與驗法見 workflows/README.md"
fi
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5678"; open "http://localhost:8025"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5678" >/dev/null 2>&1 || true
  xdg-open "http://localhost:8025" >/dev/null 2>&1 || true
fi

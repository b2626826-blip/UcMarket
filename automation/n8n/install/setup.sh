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

# 容器內自測用 wget：n8n 映像裡沒有 curl，只有 BusyBox wget
probe_inside() {
  docker compose exec -T n8n wget -q -O /dev/null -T 2 http://localhost:5678/healthz >/dev/null 2>&1
}

echo "[4/5] 等待 n8n 就緒（最多 90 秒，每 2 秒探測一次）..."
ready=0; rescued=0
deadline=90
start_ts=$(date +%s)
while :; do
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" http://localhost:5678/healthz || true)
  if [ "$code" = "200" ]; then ready=1; break; fi
  elapsed=$(( $(date +%s) - start_ts ))
  echo "  ${elapsed}s 未就緒（code=${code:-000}）"
  if [ "$rescued" -eq 0 ] && [ "$elapsed" -ge 45 ]; then
    state=$(docker inspect -f '{{.State.Status}}' n8n-n8n-1 2>/dev/null || true)
    if [ "$state" = "running" ] && probe_inside; then
      echo "  n8n 在容器內是好的、外部卻打不進去＝Docker Desktop 轉發悶住——自動 restart 一次重新註冊..."
      docker compose restart
      rescued=1
      deadline=$(( elapsed + 45 ))
      continue
    fi
  fi
  if [ "$elapsed" -ge "$deadline" ]; then break; fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  state=$(docker inspect -f '{{.State.Status}}' n8n-n8n-1 2>/dev/null || true)
  if [ "$state" != "running" ]; then
    echo "n8n 容器沒起來：跑 docker compose ps 與 docker compose logs n8n 查原因"; exit 1
  elif probe_inside; then
    echo "n8n 在容器內正常、但外部(5678)打不進去——Docker Desktop 的 port 轉發卡住了：重啟 Docker Desktop 後重跑本腳本"; exit 1
  else
    echo "n8n 沒就緒（應用還沒起來）：跑 docker compose logs n8n 查原因；可直接再重跑一次本腳本"; exit 1
  fi
fi

echo "[5/5] 匯入憑證與 workflows..."
if [ "$fresh_install" -eq 1 ]; then
  creds_ok=0
  if docker compose cp install/credentials.json n8n:/tmp/credentials.json \
     && docker compose exec -T n8n n8n import:credentials --input=/tmp/credentials.json; then
    creds_ok=1
  fi
  wf_ok=0
  # -u root：docker cp 塞進容器的檔案是 root 擁有——/tmp 有 sticky bit，node 使用者刪不掉
  docker compose exec -T -u root n8n rm -rf /tmp/wfimport >/dev/null 2>&1 || true
  if docker compose cp workflows n8n:/tmp/wfimport \
     && docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport; then
    wf_ok=1
  fi
  if [ "$creds_ok" -eq 1 ] && [ "$wf_ok" -eq 1 ]; then
    echo "已匯入 3 筆憑證＋全部 workflow 快照（綁定照 id 自動生效；workflow 匯入後一律停用）"
  else
    if [ "$creds_ok" -ne 1 ]; then echo "憑證自動匯入沒成功（環境本身沒壞）——稍後手動跑 bash install/import-credentials.sh"; fi
    if [ "$wf_ok" -ne 1 ]; then echo "workflow 自動匯入沒成功（環境本身沒壞）——稍後手動跑 bash install/import-workflows.sh"; fi
  fi
else
  echo "偵測到既有安裝——跳過匯入，避免蓋掉你在 UI 改過但還沒匯出的 workflow。"
  echo "（要用 git 快照覆蓋本機：workflows 跑 bash install/import-workflows.sh、憑證跑 bash install/import-credentials.sh）"
fi

echo ""
echo "完成！瀏覽器已自動開啟兩個頁面："
echo "  n8n 編輯器   http://localhost:5678   （第一次進去先建自己的帳號）"
echo "  mailpit 信箱 http://localhost:8025"
if [ "$fresh_install" -eq 1 ]; then
  echo ""
  echo "新機器還差兩步："
  echo "  1. 進 n8n（5678）建自己的帳號——憑證與 workflow 已自動匯入、綁定已生效"
  echo "  2. 按需啟用（右上 Inactive -> Active；匯入後一律是停用狀態）："
  echo "     - 04 通知 webhook：每台都可開（信只進本機 mailpit，不吵任何人）"
  echo "     - 01 告警／06 心跳：只在「當監控哨的那一台」開——多台同開＝Discord 重複告警"
  echo "  各 workflow 的用途與驗法見 workflows/README.md"
fi
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5678"; open "http://localhost:8025"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5678" >/dev/null 2>&1 || true
  xdg-open "http://localhost:8025" >/dev/null 2>&1 || true
fi

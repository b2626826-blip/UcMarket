#!/usr/bin/env bash
# 以 repo 憑證檔覆蓋本機 n8n 憑證（install/credentials.json → 本機；同 id 覆蓋）
set -e
cd "$(dirname "$0")/.."   # compose 在上一層（automation/n8n/）

echo "本腳本會把 install/credentials.json 的 3 筆憑證匯入本機 n8n（同 id 直接覆蓋）。"
echo "  你在 UI 改過這 3 筆憑證的話，會被 repo 版蓋回去"
read -r -p "確定繼續？（輸入 y 繼續，其他鍵取消）" ans
if [ "$ans" != "y" ]; then echo "已取消，什麼都沒動。"; exit 0; fi

if ! docker compose cp install/credentials.json n8n:/tmp/credentials.json; then
  echo "複製失敗——n8n 容器沒在跑（先跑 ./install/setup.sh）或 install/credentials.json 不存在"; exit 1
fi
if ! docker compose exec -T n8n n8n import:credentials --input=/tmp/credentials.json; then
  echo "匯入失敗——訊息在上方；n8n 剛啟動的話等 30 秒再試"; exit 1
fi

echo ""
echo "匯入完成——workflow 內的憑證綁定照 id 自動生效，不用逐節點重選。"

#!/usr/bin/env bash
# 以 git 快照覆蓋本機 n8n 的 workflows（方向：git → 本機；平常同步方向相反，見 workflows/README.md）
set -e
cd "$(dirname "$0")/.."   # compose 在上一層（automation/n8n/）

echo "本腳本會把 workflows/*.json 匯入本機 n8n（同 id 直接覆蓋）。"
echo "  1) 你在 UI 改過、但還沒 Download 匯出的內容會被蓋掉"
echo "  2) 匯入後這幾條 workflow 一律變停用——要進 UI 重新啟用（Active 開關）"
read -r -p "確定繼續？（輸入 y 繼續，其他鍵取消）" ans
if [ "$ans" != "y" ]; then echo "已取消，什麼都沒動。"; exit 0; fi

# -u root：docker cp 塞進容器的檔案是 root 擁有——/tmp 有 sticky bit，node 使用者刪不掉
if ! docker compose exec -T -u root n8n rm -rf /tmp/wfimport; then
  echo "n8n 容器沒在跑——先跑 ./install/setup.sh（或本層 docker compose up -d）再來"; exit 1
fi
if ! docker compose cp workflows n8n:/tmp/wfimport; then
  echo "複製 workflows 進容器失敗——確認 automation/n8n 的資料夾結構沒被搬動"; exit 1
fi
if ! docker compose exec -T n8n n8n import:workflow --separate --input=/tmp/wfimport; then
  echo "匯入失敗——訊息在上方；n8n 剛啟動的話等 30 秒再試"; exit 1
fi

echo ""
echo "匯入完成。"
echo "提醒：匯入後一律是停用狀態——到 UI 確認各節點憑證綁定，再逐條把 Active 開關打開。"

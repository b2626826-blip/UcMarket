# UcMarket 網站 GCP 操作手冊

最後更新：2026-07-21（Asia/Taipei）

本手冊只處理 UcMarket 網站前端的 GCP 部署：React/Vite 建置、Caddy web image、
Artifact Registry、Compute Engine 私有預覽、DNS/HTTPS 公開上線、日常更新與回滾。

以下項目不在本手冊重複說明：GCP project/IAM/Cloud SQL/Secret Manager/VM 首次建立、backend
部署、n8n credential/workflow activation、正式 Email/Discord。需要這些流程時，依
[GCP 設置、部署與上線操作手冊](./GCP操作手冊.md)執行。

## 1. 網站部署架構

```text
Browser
  |
  | HTTPS 443
  v
ucmarket.online / www.ucmarket.online
  |
  v
GCP static IPv4 -> Compute Engine: ucmarketvm
                         |
                         v
                    Caddy container
                    +-- /srv: React build
                    +-- /api/* -> backend:8080
                    +-- SPA fallback -> /index.html
```

網站不直接連 Cloud SQL。瀏覽器對 `/api/*` 的請求由 Caddy 轉送至同一個 Docker Compose
network 內的 backend；backend port 不對 Internet 公開。

## 2. 操作邊界

### 2.1 一般網站 release 可執行的範圍

- 測試與建置 frontend。
- 建立新的 web image tag 並 push 至 Artifact Registry。
- 將 VM `deploy.env` 的 `WEB_IMAGE` 更新成新 digest。
- pull/recreate `web` service。
- 驗證網站、SPA route、API proxy、Firebase OAuth 與實際 image digest。
- 驗收失敗時切回前一個 web digest。

### 2.2 必須停下取得明確核可

以下不是一般網站 release，執行前必須先列出精確影響並等待 `go`：

- 第一次修改 apex、`www`、`n8n` DNS。
- 新增、修改或刪除 public firewall rule。
- 第一次把 Caddy 從 localhost staging 切到 public 80/443。
- 更換 Firebase project、Authorized domains 或 OAuth provider。
- 刪除 Artifact Registry image、Caddy volume、VM 或 static IP。
- Cloud SQL、backend、n8n、Email/Discord、Git push 等網站 release 以外的動作。

### 2.3 Secret 安全

- Firebase Web config 會編入瀏覽器 bundle，不是 backend Admin SDK private key；仍由受控部署
  流程提供，不寫進 repo 的永久 `.env`。
- Firebase Admin service-account JSON、password、token、webhook 與 OAuth Client Secret
  不得出現在本手冊、指令歷史、build log、image label 或 Git。
- 驗收只記錄 HTTP status、Git SHA、image digest 與結果，不保存 OAuth token/API body。

## 3. 網站相關檔案

| 檔案 | 用途 |
|---|---|
| `frontend/` | React/Vite 網站來源 |
| `frontend/src/config/firebase.js` | 從 `VITE_FIREBASE_*` 讀取 Firebase Web config |
| `deploy/gcp/web.Dockerfile` | Node 建置 frontend，輸出放入 Caddy `/srv` |
| `deploy/gcp/Caddyfile.staging` | localhost 私有 HTTP 預覽，不申請公開 certificate |
| `deploy/gcp/Caddyfile.production` | 正式網域、API proxy 與自動 HTTPS |
| `deploy/gcp/docker-compose.yml` | `web` service、Caddyfile mount、80/443 bind |
| `deploy/gcp/deploy.env.example` | staging 的非敏感設定範例 |
| `/opt/ucmarket/deploy.env` | VM 現行 image digest 與 Caddy/bind 設定；不進 Git |
| `/run/ucmarket/web.env` | VM runtime 的 `ACME_EMAIL`；不進 Git |

`web.Dockerfile` 目前固定 Node `24.17.0-alpine3.23` 與 Caddy `2.11.4-alpine`。版本更新屬於
獨立 release 變更，必須完成相對應測試，不在日常發版時順手升級。

## 4. 操作變數

### 4.1 本機變數

從 repo root 執行：

```bash
export PROJECT_ID="project-db645bf4-fc60-49be-a75"
export REGION="asia-east1"
export ZONE="asia-east1-c"
export VM_NAME="ucmarketvm"
export ARTIFACT_REPOSITORY="ucmarket"
export STATIC_ADDRESS_NAME="ucmarket-web-ip"
export REGISTRY_HOST="${REGION}-docker.pkg.dev"
export WEB_IMAGE_PREFIX="${REGISTRY_HOST}/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/web"
```

每次操作先確認：

```bash
test "$(pwd)" = "/Users/eagleaby/Desktop/UcMarket"
test "$(gcloud config get-value project)" = "${PROJECT_ID}"
gcloud auth list --filter=status:ACTIVE --format='value(account)'
```

帳號輸出只用於本機確認，不貼入公開紀錄。

### 4.2 VM 變數

每個新的 IAP SSH session 都重新設定：

```bash
export PROJECT_ID="project-db645bf4-fc60-49be-a75"
export REGION="asia-east1"
export REGISTRY_HOST="${REGION}-docker.pkg.dev"
export DEPLOY_DIR="/opt/ucmarket"
```

`RELEASE_TAG` 在建置完成後另外設定，必須與本機完全一致。

## 5. 發版前唯讀檢查

### 5.1 Git baseline

```bash
git status --short --branch
git rev-parse HEAD
git fetch origin eagle
git rev-parse origin/eagle
git diff --check
```

正式 image 必須能對應到核准的 source。working tree dirty 時先停止，確認是要部署 commit
還是未提交內容；不要默默把其他人的未提交檔案打進 image。

### 5.2 現行 GCP 與網站狀態

本機唯讀查詢：

```bash
gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" \
  --format='yaml(name,status,tags.items,networkInterfaces[0].accessConfigs[0].natIP)'

gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
  --region="${REGION}" \
  --format='yaml(name,address,status)'

gcloud compute firewall-rules list \
  --format='table(name,priority,sourceRanges.list(),allowed[].map().firewall_rule().list(),targetTags.list(),disabled)'
```

確認 DNS 與 health：

```bash
dig +short A ucmarket.online @1.1.1.1
dig +short A ucmarket.online @8.8.8.8
dig +short A www.ucmarket.online @8.8.8.8

curl -fsS -o /dev/null -w 'web=%{http_code}\n' https://ucmarket.online/
curl -fsS -o /dev/null -w 'www=%{http_code}\n' https://www.ucmarket.online/
curl -fsS -o /dev/null -w 'api=%{http_code}\n' https://ucmarket.online/api/health
```

現行 production 預期都是 HTTP 200。若發版前已經失敗，先記錄並診斷既有故障，不把它
誤算成新 release 問題。

### 5.3 VM read-back

```bash
gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  --command='cd /opt/ucmarket && sudo awk -F= '\''$1 ~ /^(WEB_IMAGE|CADDYFILE_PATH|WEB_BIND_ADDRESS|WEB_TLS_BIND_ADDRESS)$/ {print}'\'' deploy.env && sudo docker inspect --format "{{.Name}} {{.Config.Image}}" ucmarket-web-1'
```

上段只讀非敏感 `deploy.env` keys 與 web image；不得讀取 `/run/ucmarket/*.env` 的 values。
記錄目前 web digest，這是 rollback 基線。

## 6. 前端測試與 build config

### 6.1 安裝與測試

長輸出放在 repo 外的臨時目錄：

```bash
export WEB_RELEASE_LOG_DIR="$(mktemp -d /tmp/ucmarket-web-release.XXXXXX)"

(
  cd frontend
  npm ci
  npm run test -- --run
) > "${WEB_RELEASE_LOG_DIR}/frontend-test.log" 2>&1

tail -n 30 "${WEB_RELEASE_LOG_DIR}/frontend-test.log"
```

測試失敗即停止，不修改測試來遷就 build。

### 6.2 Firebase Web config

本專案 Docker build args 與 Vite env 對應：

| Docker build arg | Vite env | 來源 |
|---|---|---|
| `FIREBASE_WEB_API` | `VITE_FIREBASE_API_KEY` | Firebase Web App `apiKey` |
| `FIREBASE_WEB_DOMAIN` | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_WEB_PROJECT` | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_WEB_APP` | `VITE_FIREBASE_APP_ID` | `appId` |

由 Firebase Console 的已核准 Web App 取得，互動讀入 shell，不寫檔：

```bash
read -rsp "Firebase web apiKey: " FIREBASE_WEB_API_VALUE
echo
read -rp "Firebase authDomain: " FIREBASE_WEB_DOMAIN_VALUE
read -rp "Firebase projectId: " FIREBASE_WEB_PROJECT_VALUE
read -rp "Firebase appId: " FIREBASE_WEB_APP_VALUE
```

上線網域必須已列在 Firebase Authentication 的 Authorized domains。填裸網域
`ucmarket.online`，不能填 `https://ucmarket.online` 或 path。

### 6.3 本機 production build 驗證

```bash
(
  cd frontend
  VITE_FIREBASE_API_KEY="${FIREBASE_WEB_API_VALUE}" \
  VITE_FIREBASE_AUTH_DOMAIN="${FIREBASE_WEB_DOMAIN_VALUE}" \
  VITE_FIREBASE_PROJECT_ID="${FIREBASE_WEB_PROJECT_VALUE}" \
  VITE_FIREBASE_APP_ID="${FIREBASE_WEB_APP_VALUE}" \
    npm run build
) > "${WEB_RELEASE_LOG_DIR}/frontend-build.log" 2>&1

tail -n 30 "${WEB_RELEASE_LOG_DIR}/frontend-build.log"
test -f frontend/dist/index.html
```

成功條件：Vite build exit 0、`frontend/dist/index.html` 存在，log 沒有缺少 Firebase config
或 unresolved import。

## 7. 驗證 Caddy 設定

staging 與 production 都要驗：

```bash
docker run --rm \
  -e ACME_EMAIL=ops@example.com \
  -v "${PWD}/deploy/gcp/Caddyfile.staging:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine \
  caddy validate --config /etc/caddy/Caddyfile

docker run --rm \
  -e ACME_EMAIL=ops@example.com \
  -v "${PWD}/deploy/gcp/Caddyfile.production:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine \
  caddy validate --config /etc/caddy/Caddyfile
```

人工 read-back 檢查：

```bash
sed -n '1,180p' deploy/gcp/Caddyfile.staging
sed -n '1,180p' deploy/gcp/Caddyfile.production
```

必要契約：

- staging 使用 `:80`、`auto_https off`。
- production 網域是 `ucmarket.online`、`www.ucmarket.online`。
- `/api/*` 先於 SPA handler，proxy 到 `backend:8080`。
- SPA 使用 `try_files {path} /index.html`。
- 網站沒有未核准的 `basic_auth`。
- Caddy admin API 維持 `admin off`。

若只改 React source，Caddyfile 不應出現無關 diff。

## 8. 建置與 push web image

### 8.1 唯一 release tag

```bash
export RELEASE_TAG="$(git rev-parse --short=7 HEAD)-web1"
gcloud auth configure-docker "${REGISTRY_HOST}"
```

Artifact Registry 使用 immutable tags，release tag 不得重複。`web1` 若已存在，增加序號，
不要覆蓋。

### 8.2 Buildx build/push

Compute Engine 是 `linux/amd64`；Apple Silicon 本機也必須明確指定 platform：

```bash
docker buildx build \
  --platform=linux/amd64 \
  -f deploy/gcp/web.Dockerfile \
  --build-arg FIREBASE_WEB_API="${FIREBASE_WEB_API_VALUE}" \
  --build-arg FIREBASE_WEB_DOMAIN="${FIREBASE_WEB_DOMAIN_VALUE}" \
  --build-arg FIREBASE_WEB_PROJECT="${FIREBASE_WEB_PROJECT_VALUE}" \
  --build-arg FIREBASE_WEB_APP="${FIREBASE_WEB_APP_VALUE}" \
  -t "${WEB_IMAGE_PREFIX}:${RELEASE_TAG}" \
  --push \
  .
```

完成後立即清除 shell 變數：

```bash
unset FIREBASE_WEB_API_VALUE FIREBASE_WEB_DOMAIN_VALUE \
  FIREBASE_WEB_PROJECT_VALUE FIREBASE_WEB_APP_VALUE
```

### 8.3 解析 digest

```bash
gcloud artifacts docker images list "${WEB_IMAGE_PREFIX}" \
  --include-tags \
  --filter="tags:${RELEASE_TAG}" \
  --format='table(IMAGE,DIGEST,TAGS,UPDATE_TIME)'
```

只接受唯一一個 tag 對應的 digest。建立 VM 要使用的完整值：

```text
asia-east1-docker.pkg.dev/PROJECT_ID/ucmarket/web@sha256:WEB_DIGEST
```

不要把 tag 或 `latest` 寫進正式 `WEB_IMAGE`。

## 9. 私有 staging 預覽

這一章用於第一次上線或高風險網站變更。若 production 已在線且本次只是低風險日常 release，
可依變更風險決定是否建立獨立 staging；不能因此略過 tests、digest 與 rollback 基線。

### 9.1 VM 備份與 staging 設定

透過 IAP 進入 VM，在 VM 設定 4.2 的變數及實際 release tag：

```bash
export RELEASE_TAG="APPROVED_RELEASE_TAG"
cd "${DEPLOY_DIR}"
sudo cp deploy.env "deploy.env.pre-${RELEASE_TAG}"
sudo chmod 0600 "deploy.env.pre-${RELEASE_TAG}"
sudoedit deploy.env
```

staging 設定：

```dotenv
WEB_IMAGE=asia-east1-docker.pkg.dev/PROJECT_ID/ucmarket/web@sha256:NEW_WEB_DIGEST
CADDYFILE_PATH=./Caddyfile.staging
WEB_BIND_ADDRESS=127.0.0.1:8080
WEB_TLS_BIND_ADDRESS=127.0.0.1:8443
```

只修改上述網站 keys；不要改 backend/DB/n8n 設定。完成後 read-back：

```bash
sudo awk -F= '$1 ~ /^(WEB_IMAGE|CADDYFILE_PATH|WEB_BIND_ADDRESS|WEB_TLS_BIND_ADDRESS)$/ {print}' deploy.env
```

### 9.2 VM 登入 Artifact Registry

VM service account 使用 Reader role。用 metadata 短效 token，不建立 key：

```bash
VM_REGISTRY_TOKEN="$(
  curl -fsS \
    -H 'Metadata-Flavor: Google' \
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' |
    jq -er '.access_token'
)"

printf '%s' "${VM_REGISTRY_TOKEN}" | \
  sudo docker login \
    -u oauth2accesstoken \
    --password-stdin \
    "https://${REGISTRY_HOST}"
unset VM_REGISTRY_TOKEN

sudo docker compose --env-file deploy.env pull web
sudo docker logout "${REGISTRY_HOST}"
```

### 9.3 啟動 web staging

backend 必須已 healthy，因為 Compose 的 web service 依賴 backend health：

```bash
sudo docker compose --env-file deploy.env up -d web
sudo docker compose --env-file deploy.env ps
sudo docker compose --env-file deploy.env logs --tail=100 web
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/health
```

### 9.4 IAP 本機預覽

本機另開 Terminal：

```bash
gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  -- \
  -N \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080
```

開啟 `http://127.0.0.1:18080`，至少驗證：

- 首頁、登入頁、列表、詳情頁能顯示。
- 直接刷新 SPA route 不會 404。
- `/api/health` 透過同源 proxy 回 200。
- 瀏覽器 Console 沒有 chunk、CORS 或 Firebase initialization error。
- 桌面與行動 viewport 的本次變更正常。

Firebase OAuth redirect 與 secure-cookie 行為通常需要正式 HTTPS 網域，localhost staging 只能
驗畫面與基本初始化；OAuth 最終仍須在 production URL 做一次真實登入。

## 10. 第一次公開上線

本章只適用尚未公開的環境。現行 UcMarket 已在線，日常 release 不要重改 DNS/firewall，直接
進第 11 章。

### 10.1 Gate A 唯讀確認

公開前確認：

- 私有 staging 驗收通過。
- static IP 為 `IN_USE`，VM status 為 `RUNNING`。
- production Caddy read-back/validate 通過。
- backend healthy，API proxy 可用。
- Firebase Authorized domains 已加入裸網域。
- n8n owner gate 等其他公開服務條件已依總手冊通過。
- 已列出即將修改的 DNS records、firewall rule、public bind 並取得 `go`。

### 10.2 DNS

即時取得 IP，不從舊文件複製：

```bash
export PUBLIC_IP="$(
  gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
    --region="${REGION}" \
    --format='value(address)'
)"
printf '%s\n' "${PUBLIC_IP}"
```

DNS provider 設定：

| Name | Type | Value |
|---|---|---|
| `@` | A | 目前 `PUBLIC_IP` |
| `www` | CNAME | `ucmarket.online` |

公開 resolver 驗證：

```bash
dig +short A ucmarket.online @1.1.1.1
dig +short A ucmarket.online @8.8.8.8
dig +short A www.ucmarket.online @8.8.8.8
```

### 10.3 Firewall 80/443

已有 `ucmarket-allow-public-web` 時只讀核對，不重建：

```bash
gcloud compute firewall-rules describe ucmarket-allow-public-web \
  --format='yaml(name,direction,priority,sourceRanges,allowed,targetTags,disabled)'
```

首次建立必須已有 Gate A 核可：

```bash
gcloud compute firewall-rules create ucmarket-allow-public-web \
  --network=default \
  --direction=INGRESS \
  --priority=1000 \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=ucmarket-demo \
  --project="${PROJECT_ID}"
```

不得公開 22、5678、8025、1025、8080、8081 或 5432。

### 10.4 切 production Caddy

VM 端：

```bash
cd "${DEPLOY_DIR}"
sudoedit deploy.env
```

設定：

```dotenv
CADDYFILE_PATH=./Caddyfile.production
WEB_BIND_ADDRESS=0.0.0.0:80
WEB_TLS_BIND_ADDRESS=0.0.0.0:443
```

保留同一個已驗收的 `WEB_IMAGE@sha256`，再重建 web：

```bash
sudo docker compose --env-file deploy.env up -d web
sudo docker compose --env-file deploy.env ps
sudo docker compose --env-file deploy.env logs --tail=100 web
```

Caddy 取得公開 certificate 的必要條件：authoritative DNS 已指向 VM、外部 80/443 可達、Caddy
可 bind ports、`caddy_data` volume 可持久寫入。失敗時先查前置條件，不要高頻重啟撞 ACME
rate limit。

### 10.5 強制 IP 驗證

本機先繞過 DNS cache：

```bash
curl --resolve "ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'web=%{http_code}\n' \
  https://ucmarket.online/

curl --resolve "www.ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'www=%{http_code}\n' \
  https://www.ucmarket.online/

curl --resolve "ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'api=%{http_code}\n' \
  https://ucmarket.online/api/health
```

確認後 `unset PUBLIC_IP`。

## 11. 日常網站發版 SOP

### 11.1 發版步驟

1. 記錄 branch、Git SHA、working tree 與現行 web digest。
2. `npm ci`、frontend tests、帶正式 Firebase config 的 build 全部成功。
3. staging/production Caddy validate 成功。
4. 用唯一 tag build/push `linux/amd64` web image。
5. 解析新 digest，VM 備份 `deploy.env`。
6. `WEB_IMAGE` 只改成新 digest；production Caddy/bind 維持不變。
7. VM 用 metadata 短效 token login、pull web、logout。
8. 只 recreate web，等待 running。
9. read-back container image digest。
10. 驗證首頁、www、SPA route、API proxy、Firebase login 與本次變更。
11. 記錄結果與 rollback env path。

### 11.2 VM 更新

VM 新 SSH session 先設定 4.2 變數及本次 tag：

```bash
export RELEASE_TAG="APPROVED_RELEASE_TAG"
cd "${DEPLOY_DIR}"
sudo cp deploy.env "deploy.env.pre-${RELEASE_TAG}"
sudo chmod 0600 "deploy.env.pre-${RELEASE_TAG}"
sudoedit deploy.env
```

production 只改：

```dotenv
WEB_IMAGE=asia-east1-docker.pkg.dev/PROJECT_ID/ucmarket/web@sha256:NEW_WEB_DIGEST
```

以下值必須保持：

```dotenv
CADDYFILE_PATH=./Caddyfile.production
WEB_BIND_ADDRESS=0.0.0.0:80
WEB_TLS_BIND_ADDRESS=0.0.0.0:443
```

read-back 後 pull/recreate：

```bash
sudo awk -F= '$1 ~ /^(WEB_IMAGE|CADDYFILE_PATH|WEB_BIND_ADDRESS|WEB_TLS_BIND_ADDRESS)$/ {print}' deploy.env

VM_REGISTRY_TOKEN="$(
  curl -fsS \
    -H 'Metadata-Flavor: Google' \
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' |
    jq -er '.access_token'
)"
printf '%s' "${VM_REGISTRY_TOKEN}" | \
  sudo docker login \
    -u oauth2accesstoken \
    --password-stdin \
    "https://${REGISTRY_HOST}"
unset VM_REGISTRY_TOKEN

sudo docker compose --env-file deploy.env pull web
sudo docker logout "${REGISTRY_HOST}"
sudo docker compose --env-file deploy.env up -d web
sudo docker compose --env-file deploy.env ps
sudo docker inspect --format '{{.Name}} {{.Config.Image}}' ucmarket-web-1
```

`docker inspect` 必須顯示剛核准的新 digest。

## 12. Production 驗收矩陣

### 12.1 HTTP 與 route

本機：

```bash
for web_url in \
  https://ucmarket.online/ \
  https://www.ucmarket.online/ \
  https://ucmarket.online/home \
  https://ucmarket.online/login \
  https://ucmarket.online/api/health
do
  status_code="$(
    curl -sS -o /dev/null -w '%{http_code}' \
      --connect-timeout 5 --max-time 15 "${web_url}"
  )"
  printf '%s\t%s\n' "${status_code}" "${web_url}"
done
```

預期所有 URL 回 200。若應用 route 名稱日後改變，改用當時存在且已核准的 SPA deep link。

### 12.2 Browser 驗收

- 首頁首次載入及 hard refresh 正常。
- 登入/登出、一般使用者與管理員導覽正常。
- Google OAuth popup/redirect 成功，回到 production domain。
- 若 GitHub provider 已正式完成，另做一次 GitHub 真實登入；沒有 provider/E2E 證據時不得標 PASS。
- 市場列表、詳情、交易與管理頁對本次 release 沒有 regression。
- Console 無 CORS、mixed content、chunk 404、Firebase unauthorized-domain 或 runtime exception。
- Network 的 `/api/*` 指向同源 HTTPS，不直接暴露 backend port。
- 桌面與行動 viewport 通過本次變更的視覺驗收。

### 12.3 TLS 與外部 port

```bash
export PUBLIC_IP="$(
  gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
    --region="${REGION}" \
    --format='value(address)'
)"

for port_number in 22 80 443 5678 8025 1025 8080 8081 5432
do
  if nc -z -G 3 "${PUBLIC_IP}" "${port_number}" >/dev/null 2>&1; then
    port_state=open
  else
    port_state=closed_or_filtered
  fi
  printf '%s\t%s\n' "${port_number}" "${port_state}"
done
unset PUBLIC_IP
```

成功條件：80/443 open；其餘 closed/filtered。

## 13. Rollback

### 13.1 觸發條件

以下任一情況先 rollback，不在 production 即席修 image：

- web container 無法 running。
- 首頁/API health/主要 SPA route 無法使用。
- Firebase OAuth 因 build config 失效。
- 新版出現阻斷性 JavaScript exception、chunk 404 或 CORS regression。
- image digest 與核准 release 不一致。
- 15 分鐘內無法確認故障來源，且前版已知正常。

### 13.2 還原前版 `deploy.env`

VM 端先設定失敗 release tag，read-back 備份：

```bash
export RELEASE_TAG="FAILED_RELEASE_TAG"
cd /opt/ucmarket
sudo awk -F= '$1 ~ /^(WEB_IMAGE|CADDYFILE_PATH|WEB_BIND_ADDRESS|WEB_TLS_BIND_ADDRESS)$/ {print}' \
  "deploy.env.pre-${RELEASE_TAG}"
```

確認是預期前版後才覆蓋：

若前版 image 不在 VM cache，先依 9.2 使用 metadata 短效 token 登入 Artifact Registry；若已
存在本機則不需連 registry。以下範例假設已完成登入：

```bash
sudo cp "deploy.env.pre-${RELEASE_TAG}" deploy.env
sudo chmod 0600 deploy.env
sudo docker compose --env-file deploy.env pull web
sudo docker logout "${REGISTRY_HOST}"
sudo docker compose --env-file deploy.env up -d web
sudo docker compose --env-file deploy.env ps
sudo docker inspect --format '{{.Name}} {{.Config.Image}}' ucmarket-web-1
```

前版 image 已存在本機時 `pull` 仍可確認 registry digest。若 registry 無法連線但本機有前版
image，先停止擴大操作並依 incident 核准流程決定是否用本機 digest recreate，不要改用 `latest`。

### 13.3 Rollback 後驗證

重跑第 12 章的 HTTP、browser、TLS 與 port 驗收。只有 image digest 回到前版且功能恢復，
才能宣告 rollback 完成。

網站-only rollback 不修改 DNS、firewall、backend、DB 或 n8n。若故障根因是 Caddy/DNS/
firewall，先依總手冊的精確資源 rollback；不得用 web image rollback 假裝修復。

## 14. 常見故障

| 症狀 | 優先檢查 | 處理 |
|---|---|---|
| `docker pull` Unauthenticated | VM SA Reader、metadata login | 短效 token login，pull 後 logout |
| 首頁 200、deep link 404 | production Caddy SPA handler | 確認 `try_files {path} /index.html` |
| `/api/*` 404/502 | Caddy matcher、backend health | backend 先 healthy，確認 proxy 為 `backend:8080` |
| OAuth `auth/unauthorized-domain` | Firebase Authorized domains | 加裸網域；不是 backend Admin SDK 問題 |
| OAuth 仍連舊 project | image build args/digest | 重新確認 Firebase Web App config 與 deployed digest |
| Caddy certificate 失敗 | DNS、80/443、bind、Caddy data | 修前置條件，避免 ACME 高頻 retry |
| macOS 仍連舊 IP | public resolvers/local cache | 用 `curl --resolve` 驗 VM，不急著回退 DNS |
| container image 不是新 digest | `deploy.env`、pull、inspect | 固定 digest並 recreate web |
| 新版 chunk 404 | browser cache/HTML 與 assets 不一致 | 驗 current image；必要時 rollback，不手改 container |
| CORS/mixed content | frontend URL、Caddy HTTPS、backend CORS | API 必須走同源 `/api` 與 HTTPS |

## 15. 日常維運

### 15.1 Health 與 image

```bash
curl -fsS https://ucmarket.online/
curl -fsS https://ucmarket.online/api/health

gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  --command='cd /opt/ucmarket && sudo docker compose --env-file deploy.env ps web && sudo docker inspect --format "{{.Name}} {{.Config.Image}}" ucmarket-web-1'
```

### 15.2 Caddy log

VM 端：

```bash
cd /opt/ucmarket
sudo docker compose --env-file deploy.env logs --tail=200 web
```

log 只在 VM 檢查。對外回報前移除可能的 query、OAuth 資料、IP 或 request body，只保留
時間、status、route 與錯誤摘要。

### 15.3 Artifact Registry

```bash
gcloud artifacts docker images list "${WEB_IMAGE_PREFIX}" \
  --include-tags \
  --sort-by='~UPDATE_TIME' \
  --limit=20 \
  --format='table(IMAGE,DIGEST,TAGS,UPDATE_TIME)'
```

刪 image 會影響 rollback 能力且不可逆，不屬於日常清理；先確認 deployed/rollback digests、
retention 與核可，再另案執行。

## 16. 發版紀錄模板

```text
Release time (Asia/Taipei):
Operator:
Branch / approved Git SHA:
Working tree status:
Frontend tests:
Frontend production build:
Caddy staging/production validation:
Web image tag:
Web image digest:
Previous web digest:
VM deploy.env backup path:
Container digest read-back:
Homepage / www / SPA route / API health status:
Firebase Google login:
Firebase GitHub login (if enabled):
Browser console/network findings:
External port result:
Rollback required: yes/no
Final result: PASS/FAIL
Open issue / stop condition:
```

不得記錄 Firebase Admin key、OAuth Client Secret、access token、password、recipient、完整 API
response 或 browser storage 內容。

## 17. 完成條件

網站發版只有在以下全部成立時才算完成：

- 核准 source 與 image digest 可追溯。
- Frontend tests/build 與兩份 Caddy validate 通過。
- VM `docker inspect` 顯示核准 digest。
- `ucmarket.online`、`www`、SPA deep link、`/api/health` 通過。
- Firebase production 登入通過，沒有 `auth/unauthorized-domain`。
- 外部只開 80/443，管理 port 未公開。
- rollback env 與前版 digest 已記錄。
- 沒有 secret 或敏感 response 留在 repo/log/交接紀錄。

## 18. 官方參考

- Artifact Registry Docker push/pull：<https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling>
- IAP TCP forwarding：<https://cloud.google.com/iap/docs/using-tcp-forwarding>
- Caddy Automatic HTTPS：<https://caddyserver.com/docs/automatic-https>
- Firebase Authorized domains：<https://firebase.google.com/docs/auth/web/redirect-best-practices>
- Docker multi-platform builds：<https://docs.docker.com/build/building/multi-platform/>

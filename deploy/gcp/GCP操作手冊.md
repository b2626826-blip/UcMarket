# UcMarket GCP 設置、部署與上線操作手冊

最後更新：2026-07-21（Asia/Taipei）

本手冊對應目前的 UcMarket 架構：Compute Engine 上以 Docker Compose 執行
Cloud SQL Auth Proxy、Spring Boot backend、Caddy web 與 n8n；PostgreSQL 使用獨立
Cloud SQL，映像存放於 Artifact Registry，秘密值存放於 Secret Manager。

這不是可直接在未知專案貼上執行的一鍵腳本。首次建置、公開上線與正式通知都會產生成本或
對外影響，必須依本文件的停等點逐階段確認。命令中的識別值可以沿用本專案預設值，所有
secret value 都必須由操作者在安全介面輸入，不得放入 Git、文件、聊天、workflow JSON、
snapshot、log 或 shell history。

## 1. 目標架構

```text
Internet
  |
  | TCP 80/443
  v
Static IPv4 -> Compute Engine: ucmarketvm
                 |
                 +-- Caddy / React web
                 |      +-- /api/* -> Spring Boot backend
                 |      +-- n8n.ucmarket.online -> n8n
                 |
                 +-- Cloud SQL Auth Proxy -> Cloud SQL PostgreSQL 16
                 |
                 +-- Secret Manager -> runtime env / Firebase service account
                 |
                 +-- Artifact Registry -> backend/web images by digest

Operator -> IAP TCP forwarding -> VM SSH / private staging ports
```

正式環境只公開 Caddy 的 TCP 80/443。以下 port 不得公開：SSH 22、backend 8080/8081、
n8n 5678、Mailpit 1025/8025、Cloud SQL Proxy 5432/9090。SSH 統一走 IAP。

## 2. 操作原則與停等點

### 2.1 每次操作前

1. 確認目前 Git branch、HEAD、remote 與 working tree。
2. 確認 `gcloud` 的 project，不只相信 shell prompt。
3. 先做唯讀查詢，再提出本次會修改的精確資源。
4. 不讀取、不回顯、不記錄 Secret Manager 的 value；驗證只看 secret 名稱、version 狀態與
   應用結果。
5. VM 檔案同步後一定 read-back；不能只相信本機檔案。
6. 映像使用唯一 tag 建置，正式 `deploy.env` 固定 digest，不使用 `latest`。

### 2.2 必須停下取得明確核可的操作

| Gate | 停等點 | 核可後才可執行 |
|---|---|---|
| A | 私有 staging 驗收完成 | DNS、公開 firewall 80/443、production Caddy、正式 HTTPS |
| B | 公開網站與 owner login 驗收完成 | Gmail/Discord 正式 smoke、n8n workflow activation |
| C | release 驗收完成 | Git push、對外公告或其他不在本手冊內的發布動作 |

任何資料刪除、Cloud SQL 還原、Secret 輪替、`docker compose down -v`、VM/SQL 重建、
force push 都不是一般部署步驟，必須另案核可。

## 3. 本專案預設識別值

先在本機 Terminal 設定非敏感操作變數：

```bash
export PROJECT_ID="project-db645bf4-fc60-49be-a75"
export REGION="asia-east1"
export ZONE="asia-east1-c"
export VM_NAME="ucmarketvm"
export VM_TAG="ucmarket-demo"
export VM_SERVICE_ACCOUNT="ucmarket-vm@${PROJECT_ID}.iam.gserviceaccount.com"
export SQL_INSTANCE="ucmarket-pg"
export SQL_DATABASE="ucmarket"
export SQL_USER="ucmarket_app"
export ARTIFACT_REPOSITORY="ucmarket"
export STATIC_ADDRESS_NAME="ucmarket-web-ip"
export REGISTRY_HOST="${REGION}-docker.pkg.dev"
export IMAGE_PREFIX="${REGISTRY_HOST}/${PROJECT_ID}/${ARTIFACT_REPOSITORY}"
```

新專案可更換以上識別值，但 `deploy/gcp/render-runtime-secrets.sh` 內的資料庫名稱、帳號、
網域與 secret 名稱也必須一起做受控修改並重新驗證；不要只換 project ID 就假設能部署。

## 4. 階段 0：本機與權限準備

### 4.1 工具

本機需要：

- Google Cloud CLI (`gcloud`)
- Docker Engine / Docker Desktop，含 `docker buildx` 與 `docker compose`
- Git、Java 21、Node.js 24、npm、`jq`、`curl`、`dig`、`nc`

驗證：

```bash
gcloud version
docker version
docker buildx version
docker compose version
java -version
node --version
npm --version
jq --version
```

### 4.2 登入與 project preflight

```bash
gcloud auth login
gcloud config set project "${PROJECT_ID}"
test "$(gcloud config get-value project)" = "${PROJECT_ID}"
gcloud projects describe "${PROJECT_ID}" --format='yaml(projectId,projectNumber,lifecycleState)'
```

Billing 必須已連結且啟用。連結 billing account 會影響計費，先取得核可，再由 GCP Console
的 Billing 頁面操作，或使用經批准的 billing account 執行：

```bash
gcloud billing projects describe "${PROJECT_ID}"
# 核可後才可執行：
# gcloud billing projects link "${PROJECT_ID}" --billing-account="BILLING_ACCOUNT_ID"
```

### 4.3 啟用 API

先查目前狀態：

```bash
gcloud services list --enabled --format='value(config.name)' | sort
```

首次建置且已核可後啟用：

```bash
gcloud services enable \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iap.googleapis.com \
  --project="${PROJECT_ID}"
```

驗收：上述 API 都出現在 `gcloud services list --enabled`。

## 5. 階段 1：建立 GCP 基礎設施（僅首次）

本章命令會建立計費資源。既有 production 不要重跑 `create`；先用相對應的 `describe`
查詢，再只補缺少的資源。

### 5.1 建立 VM service account 與最小權限

```bash
gcloud iam service-accounts create ucmarket-vm \
  --display-name="UcMarket production VM" \
  --project="${PROJECT_ID}"

for role_name in \
  roles/artifactregistry.reader \
  roles/cloudsql.client \
  roles/secretmanager.secretAccessor \
  roles/logging.logWriter \
  roles/monitoring.metricWriter
do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${VM_SERVICE_ACCOUNT}" \
    --role="${role_name}"
done
```

VM 只需要 pull image、連 Cloud SQL、讀 secrets 與寫監控資料；不授予
Artifact Registry Writer、Cloud SQL Admin 或 Secret Manager Admin。

驗收：

```bash
gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten='bindings[].members' \
  --filter="bindings.members:${VM_SERVICE_ACCOUNT}" \
  --format='table(bindings.role)'
```

### 5.2 建立 Artifact Registry

```bash
gcloud artifacts repositories create "${ARTIFACT_REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --immutable-tags \
  --description="UcMarket backend and web images" \
  --project="${PROJECT_ID}"
```

驗收：

```bash
gcloud artifacts repositories describe "${ARTIFACT_REPOSITORY}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}"
```

Immutable tags 開啟後，每次 release 必須使用新 tag，不能覆蓋既有 tag。

### 5.3 建立 Cloud SQL PostgreSQL

目前 MVP 規格為 PostgreSQL 16、`db-f1-micro`、10 GB SSD、zonal、backup enabled、
deletion protection enabled。正式負載增加時應另行評估 HA 與機型，不要在例行部署順手升級。

```bash
gcloud sql instances create "${SQL_INSTANCE}" \
  --database-version=POSTGRES_16 \
  --edition=enterprise \
  --tier=db-f1-micro \
  --region="${REGION}" \
  --availability-type=zonal \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=18:00 \
  --deletion-protection \
  --project="${PROJECT_ID}"

gcloud sql databases create "${SQL_DATABASE}" \
  --instance="${SQL_INSTANCE}" \
  --project="${PROJECT_ID}"
```

`--backup-start-time=18:00` 是 UTC，對應台北次日 02:00；如需調整備份時段，先確認對正式
流量的影響。建立 application user 前先確保 password secret 名稱存在。password 不寫入
指令歷史，由操作者互動輸入：

```bash
gcloud secrets describe ucmarket-db-password --project="${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud secrets create ucmarket-db-password \
    --replication-policy=automatic \
    --project="${PROJECT_ID}"

read -rsp "Cloud SQL application password: " SQL_PASSWORD_VALUE
echo
gcloud sql users create "${SQL_USER}" \
  --instance="${SQL_INSTANCE}" \
  --password="${SQL_PASSWORD_VALUE}" \
  --project="${PROJECT_ID}"
printf '%s' "${SQL_PASSWORD_VALUE}" | \
  gcloud secrets versions add ucmarket-db-password --data-file=- \
  --project="${PROJECT_ID}"
unset SQL_PASSWORD_VALUE
```

不要將 password 寫進 repo 內的 `.env`。若 `gcloud sql users create` 成功但加入 secret version
失敗，停止部署並先補上同一個 password version，不要產生第二組值造成兩端不一致。

驗收：

```bash
gcloud sql instances describe "${SQL_INSTANCE}" \
  --format='yaml(name,state,region,databaseVersion,connectionName,settings.tier,settings.backupConfiguration.enabled,settings.deletionProtectionEnabled)'
gcloud sql databases list --instance="${SQL_INSTANCE}"
gcloud sql users list --instance="${SQL_INSTANCE}"
```

### 5.4 保留靜態外部 IPv4

```bash
gcloud compute addresses create "${STATIC_ADDRESS_NAME}" \
  --region="${REGION}" \
  --network-tier=PREMIUM \
  --project="${PROJECT_ID}"

gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
  --region="${REGION}" \
  --format='yaml(name,address,status)'
```

記錄 `address` 供後續 DNS 使用，但公開前仍不得修改 DNS。

### 5.5 建立 Compute Engine VM

```bash
gcloud compute instances create "${VM_NAME}" \
  --zone="${ZONE}" \
  --machine-type=e2-medium \
  --image-family=debian-13 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-balanced \
  --service-account="${VM_SERVICE_ACCOUNT}" \
  --scopes=cloud-platform \
  --address="${STATIC_ADDRESS_NAME}" \
  --tags="${VM_TAG}" \
  --metadata=enable-oslogin=TRUE \
  --project="${PROJECT_ID}"
```

驗收：

```bash
gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" \
  --format='yaml(name,status,machineType.basename(),networkInterfaces[0].accessConfigs[0].natIP,tags.items,serviceAccounts.email)'
```

### 5.6 建立 Secret Manager 名稱

以下只建立空 secret，不包含 value：

```bash
for secret_name in \
  ucmarket-db-password \
  ucmarket-jwt-secret \
  ucmarket-n8n-notify-token \
  ucmarket-n8n-read-token \
  ucmarket-n8n-evidence-candidate-token \
  ucmarket-n8n-evidence-write-token \
  ucmarket-n8n-encryption-key \
  ucmarket-n8n-owner-password \
  ucmarket-demo-admin-password \
  ucmarket-demo-user-password \
  ucmarket-gmail-app-password \
  ucmarket-discord-notify-webhook \
  ucmarket-discord-heartbeat-webhook \
  ucmarket-cwa-api-key \
  ucmarket-firebase-service-account
do
  gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" >/dev/null 2>&1 || \
    gcloud secrets create "${secret_name}" \
      --replication-policy=automatic \
      --project="${PROJECT_ID}"
done
```

加入文字 secret version 的安全範例：

```bash
read -rsp "Secret value: " SECRET_VALUE_INPUT
echo
printf '%s' "${SECRET_VALUE_INPUT}" | \
  gcloud secrets versions add SECRET_NAME --data-file=- --project="${PROJECT_ID}"
unset SECRET_VALUE_INPUT
```

加入 Firebase service-account JSON 時，來源檔必須位於 repo 外且權限為 `0600`：

```bash
gcloud secrets versions add ucmarket-firebase-service-account \
  --data-file="/secure/path/firebase-service-account.json" \
  --project="${PROJECT_ID}"
```

只驗證 version metadata，不執行 `versions access`：

```bash
gcloud secrets versions list SECRET_NAME \
  --filter='state=ENABLED' \
  --format='table(name,state,createTime)' \
  --project="${PROJECT_ID}"
```

JWT、各 n8n token 與 encryption key 必須分別產生，不能共用；07 的 candidate-read 與
evidence-write token 必須不同。

### 5.7 建立 firewall：先私有、後公開

只先建立 IAP SSH rule：

```bash
gcloud compute firewall-rules create ucmarket-allow-iap-ssh \
  --network=default \
  --direction=INGRESS \
  --priority=900 \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags="${VM_TAG}" \
  --project="${PROJECT_ID}"
```

檢查 default network 是否仍有 `default-allow-ssh` 或 `default-allow-rdp`。這些 rule 可能套用
到其他 VM；不得未盤點就刪除。若專案只有此 VM，建議在取得核可後停用或改成明確 target，
使 SSH 僅能從 IAP 進入。

```bash
gcloud compute firewall-rules list \
  --format='table(name,direction,priority,sourceRanges.list(),allowed[].map().firewall_rule().list(),targetTags.list(),disabled)'
```

公開 web rule 此時不要建立，留到 Gate A。

### 5.8 驗證 IAP SSH

```bash
gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  --command='hostname; uname -a'
```

若 direct SSH timeout 但 IAP 成功，這是預期結果。不要為了方便把 port 22 對
`0.0.0.0/0` 開放。

## 6. 階段 2：Firebase OAuth 準備

若不使用 Firebase OAuth，可略過此章並同步調整 backend/frontend 設定。現行 UcMarket 使用
Firebase Web SDK 與 Admin SDK：

1. 在 Firebase Console 建立或選擇 project。
2. 建立 Web App，取得 `apiKey`、`authDomain`、`projectId`、`appId`。
3. 在 Authentication 啟用核准的 provider（目前 Google 已使用）。
4. Authorized domains 加入裸網域 `ucmarket.online`，不要填 `https://` 或 path。
5. 產生 Admin SDK service-account JSON，加入
   `ucmarket-firebase-service-account` Secret Manager；本機暫存檔安全移除。
6. 若啟用 GitHub provider，callback 使用 Firebase 提供的 handler；完成條件是 Client ID/
   Secret 已設定、provider 已啟用且真實 GitHub 登入通過，不能只以 email verification 判定完成。

Firebase Web config 會編入前端 bundle，本專案 build args 對應：

| Firebase config | Docker build arg | Vite env |
|---|---|---|
| `apiKey` | `FIREBASE_WEB_API` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `FIREBASE_WEB_DOMAIN` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `FIREBASE_WEB_PROJECT` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `FIREBASE_WEB_APP` | `VITE_FIREBASE_APP_ID` |

這些 web config 不是 backend Admin SDK key，但仍不要寫進 repo 的永久 `.env`；由受控部署環境
提供 build args。

## 7. 階段 3：release 建置、測試與推送映像

### 7.1 固定 source baseline

從 repo root 執行：

```bash
git status --short --branch
git rev-parse HEAD
git fetch origin eagle
git rev-parse origin/eagle
git diff --check
```

正式 release 應使用已核准且可識別的 source。若 working tree dirty，先停止並確認要部署的是
commit 還是未提交內容；不要默默把未提交檔案打進 image。

### 7.2 測試與 package

長輸出請導向 repo 外的 log，對話或交接只保存摘要與失敗清單。

```bash
export RELEASE_LOG_DIR="$(mktemp -d /tmp/ucmarket-release-logs.XXXXXX)"

(
  cd backend
  ./mvnw clean test package
) > "${RELEASE_LOG_DIR}/backend.log" 2>&1

(
  cd frontend
  npm ci
  npm run test -- --run
  npm run build
) > "${RELEASE_LOG_DIR}/frontend.log" 2>&1

tail -n 20 "${RELEASE_LOG_DIR}/backend.log"
tail -n 20 "${RELEASE_LOG_DIR}/frontend.log"
```

驗收：backend `BUILD SUCCESS`、frontend tests/build 成功。若 release 含 PostgreSQL migration，
必須另外跑專案規定的 PostgreSQL 測試，不能只跑 H2。

### 7.3 驗證部署檔

```bash
bash -n deploy/gcp/render-runtime-secrets.sh
bash -n deploy/gcp/provision-n8n-credentials.sh
bash -n deploy/gcp/smoke-core.sh
bash -n deploy/gcp/smoke-07.sh

export COMPOSE_CHECK_DIR="$(mktemp -d /tmp/ucmarket-compose-check.XXXXXX)"
install -m 0600 /dev/null "${COMPOSE_CHECK_DIR}/backend.env"
install -m 0600 /dev/null "${COMPOSE_CHECK_DIR}/n8n.env"
install -m 0600 /dev/null "${COMPOSE_CHECK_DIR}/web.env"
install -m 0600 /dev/null "${COMPOSE_CHECK_DIR}/firebase-service-account.json"

RUNTIME_DIR="${COMPOSE_CHECK_DIR}" docker compose \
  --env-file deploy/gcp/deploy.env.example \
  -f deploy/gcp/docker-compose.yml \
  config >/tmp/ucmarket-compose-config.txt

find "${COMPOSE_CHECK_DIR}" -type f -delete
rmdir "${COMPOSE_CHECK_DIR}"
unset COMPOSE_CHECK_DIR

docker run --rm \
  -e ACME_EMAIL=ops@example.com \
  -v "${PWD}/deploy/gcp/Caddyfile.production:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine \
  caddy validate --config /etc/caddy/Caddyfile
```

### 7.4 建置並 push backend/web

為 Apple Silicon 開發機明確指定 VM 使用的 `linux/amd64`。tag 使用 Git SHA 加 release 序號，
不可覆寫。

```bash
export RELEASE_TAG="$(git rev-parse --short=7 HEAD)-release1"
gcloud auth configure-docker "${REGISTRY_HOST}"

docker buildx build \
  --platform=linux/amd64 \
  -f deploy/gcp/backend.Dockerfile \
  -t "${IMAGE_PREFIX}/backend:${RELEASE_TAG}" \
  --push \
  .
```

以互動方式讀入 Firebase Web config，再建置 web：

```bash
read -rsp "Firebase web apiKey: " FIREBASE_WEB_API_VALUE
echo
read -rp "Firebase authDomain: " FIREBASE_WEB_DOMAIN_VALUE
read -rp "Firebase projectId: " FIREBASE_WEB_PROJECT_VALUE
read -rp "Firebase appId: " FIREBASE_WEB_APP_VALUE

docker buildx build \
  --platform=linux/amd64 \
  -f deploy/gcp/web.Dockerfile \
  --build-arg FIREBASE_WEB_API="${FIREBASE_WEB_API_VALUE}" \
  --build-arg FIREBASE_WEB_DOMAIN="${FIREBASE_WEB_DOMAIN_VALUE}" \
  --build-arg FIREBASE_WEB_PROJECT="${FIREBASE_WEB_PROJECT_VALUE}" \
  --build-arg FIREBASE_WEB_APP="${FIREBASE_WEB_APP_VALUE}" \
  -t "${IMAGE_PREFIX}/web:${RELEASE_TAG}" \
  --push \
  .

unset FIREBASE_WEB_API_VALUE FIREBASE_WEB_DOMAIN_VALUE \
  FIREBASE_WEB_PROJECT_VALUE FIREBASE_WEB_APP_VALUE
```

查出 digest 並記錄：

```bash
gcloud artifacts docker images list "${IMAGE_PREFIX}/backend" \
  --include-tags --filter="tags:${RELEASE_TAG}" \
  --format='table(IMAGE,DIGEST,TAGS,UPDATE_TIME)'

gcloud artifacts docker images list "${IMAGE_PREFIX}/web" \
  --include-tags --filter="tags:${RELEASE_TAG}" \
  --format='table(IMAGE,DIGEST,TAGS,UPDATE_TIME)'
```

後續 `BACKEND_IMAGE`、`WEB_IMAGE` 使用
`IMAGE_PREFIX/name@sha256:...`，不使用 tag 或 `latest`。

## 8. 階段 4：VM 初始安裝與私有 staging

### 8.1 安裝 VM 工具

透過 IAP 進入 VM：

```bash
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --tunnel-through-iap
```

依 Docker 官方 Debian 安裝說明安裝 Docker Engine 與 Compose plugin，再安裝 `jq`、`curl`。
完成後：

```bash
docker --version
docker compose version
jq --version
curl --version | head -1
```

建立 runtime 目錄：

```bash
sudo install -d -m 0755 /opt/ucmarket
sudo install -d -m 0700 /run/ucmarket
```

### 8.2 同步部署檔

從本機 repo root 建立唯一 remote staging 目錄並上傳：

```bash
export REMOTE_RELEASE_DIR="/tmp/ucmarket-release-${RELEASE_TAG}"

gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  --command="install -d '${REMOTE_RELEASE_DIR}/workflows'"

gcloud compute scp \
  deploy/gcp/docker-compose.yml \
  deploy/gcp/Caddyfile.staging \
  deploy/gcp/Caddyfile.production \
  deploy/gcp/deploy.env.example \
  deploy/gcp/render-runtime-secrets.sh \
  deploy/gcp/provision-n8n-credentials.sh \
  deploy/gcp/smoke-core.sh \
  deploy/gcp/smoke-07.sh \
  "${VM_NAME}:${REMOTE_RELEASE_DIR}/" \
  --zone="${ZONE}" \
  --tunnel-through-iap

gcloud compute scp \
  automation/n8n/workflows/01-health-alert.json \
  automation/n8n/workflows/04-notify-webhook.json \
  automation/n8n/workflows/05-failed-alert.json \
  automation/n8n/workflows/06-heartbeat.json \
  automation/n8n/workflows/07-resolution-evidence-collector.json \
  "${VM_NAME}:${REMOTE_RELEASE_DIR}/workflows/" \
  --zone="${ZONE}" \
  --tunnel-through-iap
```

進入 VM 後先重設該次操作需要的非敏感變數；`RELEASE_TAG` 必須與本機建置時完全相同：

```bash
export PROJECT_ID="project-db645bf4-fc60-49be-a75"
export REGION="asia-east1"
export REGISTRY_HOST="${REGION}-docker.pkg.dev"
export RELEASE_TAG="APPROVED_RELEASE_TAG"
export REMOTE_RELEASE_DIR="/tmp/ucmarket-release-${RELEASE_TAG}"
```

以下標示為 VM 端的章節，在每個新的 SSH session 都要先重跑上面的變數區塊。再以 `install`
更新必要檔案，不刪除既有 runtime volume：

```bash
sudo install -d -m 0755 /opt/ucmarket/workflows
sudo install -m 0644 "${REMOTE_RELEASE_DIR}/docker-compose.yml" /opt/ucmarket/
sudo install -m 0644 "${REMOTE_RELEASE_DIR}/Caddyfile.staging" /opt/ucmarket/
sudo install -m 0644 "${REMOTE_RELEASE_DIR}/Caddyfile.production" /opt/ucmarket/
sudo install -m 0755 "${REMOTE_RELEASE_DIR}/render-runtime-secrets.sh" /opt/ucmarket/
sudo install -m 0755 "${REMOTE_RELEASE_DIR}/provision-n8n-credentials.sh" /opt/ucmarket/
sudo install -m 0755 "${REMOTE_RELEASE_DIR}/smoke-core.sh" /opt/ucmarket/
sudo install -m 0755 "${REMOTE_RELEASE_DIR}/smoke-07.sh" /opt/ucmarket/
sudo install -m 0644 "${REMOTE_RELEASE_DIR}"/workflows/*.json /opt/ucmarket/workflows/
```

以本機與 VM 的 `sha256sum` 比對，再繼續。至少 read-back production Caddy、Compose 與
script mode：

```bash
cd /opt/ucmarket
sudo sha256sum docker-compose.yml Caddyfile.staging Caddyfile.production \
  render-runtime-secrets.sh provision-n8n-credentials.sh
sudo sed -n '1,160p' Caddyfile.production
sudo find workflows -maxdepth 1 -type f -printf '%f\n' | sort
```

清單只能包含 01、04、05、06、07；02/03 由 Java 排程負責，必須不存在。

### 8.3 建立 staging `deploy.env`

`deploy.env` 不放 secret，只放資源識別值、image digest 與 bind 設定：

```dotenv
CLOUD_SQL_CONNECTION_NAME=PROJECT_ID:REGION:SQL_INSTANCE
BACKEND_IMAGE=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/backend@sha256:BACKEND_DIGEST
WEB_IMAGE=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/web@sha256:WEB_DIGEST
RUNTIME_DIR=/run/ucmarket
CADDYFILE_PATH=./Caddyfile.staging
WEB_BIND_ADDRESS=127.0.0.1:8080
WEB_TLS_BIND_ADDRESS=127.0.0.1:8443
```

在 VM 以 `sudoedit /opt/ucmarket/deploy.env` 輸入真實非敏感值，設定 `0600`：

```bash
sudo chmod 0600 /opt/ucmarket/deploy.env
sudo awk -F= '{print $1}' /opt/ucmarket/deploy.env
```

### 8.4 從 VM 登入 Artifact Registry 並 pull

VM service account 只有 Reader。用 metadata server 取得短效 token，不建立 service-account
key，也不輸出 token：

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

cd /opt/ucmarket
sudo docker compose --env-file deploy.env pull
sudo docker logout "${REGISTRY_HOST}"
```

### 8.5 渲染 runtime secrets

`render-runtime-secrets.sh` 由 metadata token 直接讀 Secret Manager，在 `/run/ucmarket` 建立
`backend.env`、`n8n.env`、`web.env` 與 Firebase JSON。只驗證 owner/mode/key name，禁止
`cat` 內容或執行會展開 value 的 `docker compose config` 分享到外部。

```bash
cd /opt/ucmarket
sudo env \
  PROJECT_ID="${PROJECT_ID}" \
  DEPLOY_MODE=staging \
  RUNTIME_DIR=/run/ucmarket \
  bash ./render-runtime-secrets.sh

sudo find /run/ucmarket -maxdepth 1 -type f -printf '%f %m %u:%g\n' | sort
sudo awk -F= '{print $1}' /run/ucmarket/backend.env
sudo awk -F= '{print $1}' /run/ucmarket/n8n.env
sudo awk -F= '{print $1}' /run/ucmarket/web.env
```

### 8.6 啟動私有 staging

```bash
cd /opt/ucmarket
sudo docker compose \
  --env-file deploy.env \
  --profile staging \
  up -d

sudo docker compose --env-file deploy.env ps
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS http://127.0.0.1:8080/ >/dev/null
curl -fsS http://127.0.0.1:5678/healthz
curl -fsS http://127.0.0.1:8025/ >/dev/null
```

成功條件：Cloud SQL Proxy、backend、n8n healthy，web 與 Mailpit running。Flyway 應依序套用
現行 migration；若 migration 失敗，不得改已套用的舊 migration，應停止並依 forward-only
流程處理。

### 8.7 透過 IAP 在本機驗收 staging

保持以下 SSH process 執行：

```bash
gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  -- \
  -N \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  -L 15678:127.0.0.1:5678 \
  -L 18025:127.0.0.1:8025
```

本機入口：

- Web：`http://127.0.0.1:18080`
- n8n：`http://127.0.0.1:15678`
- Mailpit：`http://127.0.0.1:18025`

先建立 n8n owner account，再匯入 credential 與 workflow。owner password 只能由安全介面輸入，
不得記錄 value。

### 8.8 匯入 n8n credentials 與 workflows

staging token credentials：

```bash
cd /opt/ucmarket
sudo env \
  PROJECT_ID="${PROJECT_ID}" \
  N8N_CONTAINER=ucmarket-n8n-1 \
  bash ./provision-n8n-credentials.sh
```

匯入 workflow 前先確認 UI 未有待匯出的 production 修改。匯入會依 ID 覆蓋，且匯入後一律
inactive：

```bash
cd /opt/ucmarket
sudo docker compose exec -T -u root n8n rm -rf /tmp/wfimport
sudo docker compose cp workflows n8n:/tmp/wfimport
sudo docker compose exec -T n8n \
  n8n import:workflow --separate --input=/tmp/wfimport
```

確認只有 01、04、05、06、07，且先保持 inactive。正式 credential binding、啟用順序、
credential 隔離與災難復原細節見：

- `automation/n8n/workflows/README.md`
- `automation/n8n/runbook.md`

`n8n execute` 會輸出完整 runData；正式驗收不得把 stdout/stderr 顯示或保存，只保留 exit code
與安全聚合結果。

### 8.9 私有 smoke 驗收

`smoke-core.sh` 會建立 demo data 並修改測試資料狀態，不是純讀操作。只可在已核准的 staging
資料庫執行，先確認不會碰正式資料。`smoke-07.sh` 同樣會建立 fixture 並暫時匯入 workflow，
失敗時必須確認原 Schedule Trigger 已還原。

最少人工驗收矩陣：

| 項目 | 成功條件 |
|---|---|
| Backend | `/api/health` HTTP 200 |
| Web | 首頁 HTTP 200、SPA route 可刷新 |
| DB | Cloud SQL Proxy healthy、Flyway 全部成功 |
| Auth | 一般登入、管理員登入成功；Firebase Google 登入成功 |
| Core | browse、trade、idempotency replay、resolve、wallet 金額正確 |
| n8n | `/healthz` 200、owner account 已建立、未登入 API 401 |
| 04 staging | wrong token 403、缺欄 400、有效請求成功、Mailpit +1 |
| 07 | candidate/write token 交叉使用皆 403、分頁與冪等通過 |
| Network | 外部 22/5678/8025/1025/8080/8081/5432 關閉 |

全部通過後記錄 Git SHA、image digest、Cloud SQL connection name、VM 檔案 hash 與測試摘要。
不得記錄 secret、recipient、完整 API body 或 n8n raw execution。

到此停在 Gate A，列出將修改的 DNS records、firewall rule 與 Caddy bind，等待明確 `go`。

## 9. 階段 5：公開上線（Gate A 核可後）

### 9.1 上線前唯讀重驗

以下 `gcloud` 命令從本機執行；VM 內容透過 IAP SSH read-back。

```bash
gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" \
  --format='yaml(name,status,tags.items,networkInterfaces[0].accessConfigs[0].natIP)'

gcloud sql instances describe "${SQL_INSTANCE}" \
  --format='yaml(name,state,connectionName,settings.backupConfiguration.enabled,settings.deletionProtectionEnabled)'

gcloud compute firewall-rules list \
  --format='table(name,priority,sourceRanges.list(),allowed[].map().firewall_rule().list(),targetTags.list(),disabled)'
```

在 VM read-back `Caddyfile.production`，確認：

- 網站沒有未核准的 `basic_auth`。
- `/api/*` 只 reverse proxy 到 backend。
- n8n 使用 `n8n.ucmarket.online`。
- Caddy data/config 使用 persistent named volumes。
- n8n owner login 已完成，未登入 workflow API 回 401。

若 release 含 Flyway migration，先建立 on-demand backup 並等成功：

```bash
gcloud sql backups create \
  --instance="${SQL_INSTANCE}" \
  --project="${PROJECT_ID}"
gcloud sql backups list \
  --instance="${SQL_INSTANCE}" \
  --limit=3 \
  --format='table(id,status,startTime,endTime,type)'
```

### 9.2 DNS

到 DNS provider 設定：

| Name | Type | Value |
|---|---|---|
| `@` | A | `ucmarket-web-ip` 的目前 IPv4 |
| `www` | CNAME | apex / `ucmarket.online` |
| `n8n` | A | 同一個目前 IPv4 |

不要從舊文件複製 IP，必須即時查詢：

```bash
gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
  --region="${REGION}" \
  --format='value(address)'
```

公開 resolver 驗證：

```bash
dig +short A ucmarket.online @1.1.1.1
dig +short A ucmarket.online @8.8.8.8
dig +short A www.ucmarket.online @8.8.8.8
dig +short A n8n.ucmarket.online @8.8.8.8
```

macOS local cache 與 public resolver 不一致時，先用 public resolver 與 `curl --resolve` 驗證，
不要立刻回退 DNS。

### 9.3 開放 public 80/443

```bash
gcloud compute firewall-rules create ucmarket-allow-public-web \
  --network=default \
  --direction=INGRESS \
  --priority=1000 \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags="${VM_TAG}" \
  --project="${PROJECT_ID}"
```

驗收 rule 的 priority、source range、target tag 與 ports。不得建立 5678/8025/1025/8080/
8081/5432 的 public allow rule。

### 9.4 切換 production Caddy

以下從 VM 執行；若是新的 SSH session，先重跑 8.2 的 VM 變數區塊。

先備份非敏感 `deploy.env`：

```bash
cd /opt/ucmarket
sudo cp deploy.env "deploy.env.pre-${RELEASE_TAG}"
sudo chmod 0600 "deploy.env.pre-${RELEASE_TAG}"
sudoedit deploy.env
```

production 的 bind 必須是：

```dotenv
CADDYFILE_PATH=./Caddyfile.production
WEB_BIND_ADDRESS=0.0.0.0:80
WEB_TLS_BIND_ADDRESS=0.0.0.0:443
```

重新渲染 production runtime env 並重建服務：

```bash
sudo env \
  PROJECT_ID="${PROJECT_ID}" \
  DEPLOY_MODE=production \
  RUNTIME_DIR=/run/ucmarket \
  bash ./render-runtime-secrets.sh

sudo docker compose --env-file deploy.env up -d --remove-orphans
sudo docker compose --env-file deploy.env ps
sudo docker compose --env-file deploy.env logs --tail=100 web
```

Caddy 自動 HTTPS 需要 authoritative DNS 指向此 VM、外部 80/443 可達、Caddy 能 bind ports，
以及 `/data` 可持久寫入。若 certificate 失敗，不要連續重試撞 ACME rate limit；先檢查 DNS、
firewall、port bind 與 Caddy log。

### 9.5 強制 IP 與正式網址驗證

回到本機執行，先繞過 local DNS cache：

```bash
export PUBLIC_IP="$(
  gcloud compute addresses describe "${STATIC_ADDRESS_NAME}" \
    --region="${REGION}" \
    --format='value(address)'
)"

curl --resolve "ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'web=%{http_code}\n' \
  https://ucmarket.online/

curl --resolve "ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'health=%{http_code}\n' \
  https://ucmarket.online/api/health

curl --resolve "n8n.ucmarket.online:443:${PUBLIC_IP}" \
  -fsS -o /dev/null -w 'n8n=%{http_code}\n' \
  https://n8n.ucmarket.online/healthz

```

再用一般 DNS 驗證：

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://ucmarket.online/
curl -fsS -o /dev/null -w '%{http_code}\n' https://ucmarket.online/api/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://n8n.ucmarket.online/healthz
```

外部 port 驗證：

```bash
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

成功條件：80/443 open，其餘 closed/filtered。

### 9.6 公開功能驗收

至少驗證：

- `ucmarket.online` 與 `www.ucmarket.online` HTTPS 正常。
- `/api/health` 200。
- SPA routes 直接刷新不會 404。
- 一般登入、管理員登入與 owner 權限正確。
- Google OAuth 真實登入成功，callback 回正式站。
- n8n editor 未登入不能讀 workflow/API；owner login 正常。
- `/webhook/notify` 的 wrong token 403。
- backend、Cloud SQL Proxy、n8n healthy；Caddy 無持續 ACME error。

公開網站成功後停在 Gate B。正式 Email/Discord smoke 與 workflows activation 必須另行核可。

## 10. 階段 6：正式通知與 n8n activation（Gate B 核可後）

### 10.1 核可前 inventory

先唯讀確認：

- notification queue 沒有意外待送項目。
- n8n 只有一組 01、04、05、06、07；02/03 不存在。
- owner login、backend health、n8n health 正常。
- Gmail App Password 與兩個 Discord webhook 的 Secret Manager version 已 enabled。
- 不讀取、不輸出任何 credential value。

### 10.2 production credentials

透過 n8n owner UI 或受控匯入流程建立：

| Credential | 用途 |
|---|---|
| production SMTP | 04 Email node |
| `discord-ucmarket-通知` | 01、05 |
| `discord-ucmarket-心跳` | 06 |
| `ucmarket-notify-webhook-token` | 04 webhook auth |
| `ucmarket-n8n-service-token` | 05 backend read |
| candidate-read token | 07 candidate API only |
| evidence-write token | 07 evidence write API only |

workflow export 是單元素 JSON array；若用 `jq` 檢查或 patch，必須使用 `.[0]` 或 `.[]`，
不能把 export 當 object。credential value 只存在 n8n credential store，不進 workflow JSON。

### 10.3 smoke 原則

1. 先確認 queue/執行次數基線。
2. 每個外部通知只送一個已核准的 smoke，不自動 retry。
3. Gmail 需要 HTTP/worker 結果成功、指定收件匣實收、Mailpit count 不增加。
4. Discord notification 與 heartbeat 各一次，期望 HTTP 204。
5. 任一步失敗或結果不明確，立即停止，不重送、不 activation。
6. 紀錄只保留時間、HTTP status、execution ID 與成功/失敗；不留 recipient/body/webhook。

### 10.4 activation 順序

1. 先啟用 04，驗證 production SMTP。
2. 驗證 Discord 兩個 credentials。
3. 只在 production 這一台啟用 01、05、06、07。
4. 02/03 必須保持不存在。
5. restart n8n，檢查 health、active inventory、logs 與排程 execution。
6. 07 必須是 `field: hours`、`hoursInterval: 1`；failure execution 保存為 `all`，success
   保存為 `none`。

active list 不是充分證據。曾出現 workflow 顯示 active、logs 卻持續 `Invalid interval`；因此每次
activation 都要同時檢查 n8n logs、health、trigger schema 與第一次正式排程結果。

## 11. 日常發版 SOP

日常發版不重建 GCP 資源，只執行以下流程：

1. 鎖定已核准 Git SHA，確認 working tree 與 remote。
2. 完成 backend/frontend/migration tests。
3. 用唯一 tag build/push backend 與 web。
4. 解析並記錄兩個 image digest。
5. 若有 migration，建立並驗證 Cloud SQL backup。
6. 同步必要 deploy files 到 VM，read-back hash/content。
7. 備份目前 `deploy.env`。
8. 將 `BACKEND_IMAGE`、`WEB_IMAGE` 改為新 digest。
9. VM 用短效 metadata token 登入 Artifact Registry、pull、logout。
10. 重渲染 runtime secrets。
11. `docker compose up -d`，等待 backend healthy。
12. 驗證內部 health、外部 HTTPS、登入與本次變更對應 smoke。
13. 記錄 release SHA、digests、時間、驗收結果與 rollback env 路徑。

VM 更新範例：

以下從 VM 執行；先重跑 8.2 的 VM 變數區塊，並在 pull 前以 metadata 短效 token 登入：

```bash
cd /opt/ucmarket
sudo cp deploy.env "deploy.env.pre-${RELEASE_TAG}"
sudo chmod 0600 "deploy.env.pre-${RELEASE_TAG}"
sudoedit deploy.env

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

sudo docker compose --env-file deploy.env pull backend web
sudo docker logout "${REGISTRY_HOST}"

sudo env \
  PROJECT_ID="${PROJECT_ID}" \
  DEPLOY_MODE=production \
  RUNTIME_DIR=/run/ucmarket \
  bash ./render-runtime-secrets.sh

sudo docker compose --env-file deploy.env up -d backend web
sudo docker compose --env-file deploy.env ps
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS https://ucmarket.online/api/health
```

正式 image 固定 digest，`docker compose pull` 後應用 `docker inspect` read-back：

```bash
sudo docker inspect --format '{{.Name}} {{.Config.Image}}' \
  ucmarket-backend-1 ucmarket-web-1
```

## 12. Rollback

### 12.1 應用 image rollback

適用於新 image 啟動或功能驗收失敗，且資料庫 migration 與舊版相容：

以下從 VM 執行。新的 SSH session 先設定 `RELEASE_TAG` 為失敗 release 的實際 tag；
`deploy.env.pre-${RELEASE_TAG}` 必須先 read-back 確認是預期前版，不能猜檔名。

```bash
cd /opt/ucmarket
sudo cp "deploy.env.pre-${RELEASE_TAG}" deploy.env
sudo chmod 0600 deploy.env
sudo docker compose --env-file deploy.env pull backend web
sudo docker compose --env-file deploy.env up -d backend web
sudo docker compose --env-file deploy.env ps
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS https://ucmarket.online/api/health
```

read-back `docker inspect`，確認 image digest 確實回到前版。

### 12.2 migration 相關停止條件

Flyway migration 是 forward-only。若新版已套用破壞性或不相容 schema，不能只切回舊 image
就宣稱 rollback 完成，也不得修改已套用 migration。應立即停止流量擴大、保存 logs 與 migration
version，依已核准的 forward fix 或 Cloud SQL restore 計畫處理。Cloud SQL restore 會改變資料，
必須另案核可。

### 12.3 Caddy/DNS rollback

- Caddy config 錯誤：先恢復上版 `deploy.env`/Caddyfile，重建 web 並驗 HTTPS。
- DNS 錯誤：先以 public resolvers 確認 authoritative 結果，再按核准值回退。
- Certificate 問題：保留 Caddy `/data` volume，不執行 `down -v`；先查 DNS、80/443 與 log。
- Firewall 錯誤：只回退本次新增/修改的精確 rule，不做廣域刪除。

## 13. 日常維運

### 13.1 每日/事件檢查

```bash
gcloud compute instances describe "${VM_NAME}" \
  --zone="${ZONE}" --format='value(status)'
gcloud sql instances describe "${SQL_INSTANCE}" --format='value(state)'

gcloud compute ssh "${VM_NAME}" \
  --zone="${ZONE}" \
  --tunnel-through-iap \
  --command='cd /opt/ucmarket && sudo docker compose --env-file deploy.env ps'

curl -fsS https://ucmarket.online/api/health
curl -fsS https://n8n.ucmarket.online/healthz
```

### 13.2 Logs

```bash
cd /opt/ucmarket
sudo docker compose --env-file deploy.env logs --tail=200 backend
sudo docker compose --env-file deploy.env logs --tail=200 web
sudo docker compose --env-file deploy.env logs --tail=200 n8n
sudo docker compose --env-file deploy.env logs --tail=200 cloud-sql-proxy
```

log 只在 VM 本機檢查。若可能含 token、recipient、request/response body 或 OAuth 資料，不貼到
聊天、issue 或公開報告；先做安全摘要。

### 13.3 Backup 與 restore 演練

- Cloud SQL automated backup 必須保持 enabled。
- migration release 前建立 on-demand backup。
- 定期驗證最近 backup `SUCCESSFUL`；只有 backup 清單不等於可還原。
- restore 演練應在隔離 instance 執行，不能直接覆寫 production。
- n8n volume 備份、checksum 與還原步驟依 `automation/n8n/runbook.md`；archive 視同 secret。

### 13.4 Secret 輪替

一般順序：Deactivate 使用者 → 新增 Secret Manager version → 重渲染 runtime → restart 使用者 →
更新 n8n credential binding → smoke → Activate → 禁用舊 version。不得先禁用舊 version 造成
服務中斷，也不得同時輪替多組 token 而無法定位失敗。

### 13.5 成本與容量

至少定期檢查：Compute Engine、Cloud SQL、Artifact Registry storage、static IP、egress 與 backup
storage。`db-f1-micro` 與 `e2-medium` 是 MVP 規格，不是效能保證；升級前以 CPU、memory、DB
connections、latency 與 disk usage 證據決策。

## 14. 常見故障

| 症狀 | 優先檢查 | 處理方向 |
|---|---|---|
| VM pull `Unauthenticated request` | VM SA Reader role、registry login | 用 metadata 短效 token login，pull 後 logout |
| backend 無法連 DB | Proxy health、connection name、VM SA Cloud SQL Client | 讀 `/run/ucmarket/backend.env` 的 key name；不猜 host/user |
| Firebase `auth/unauthorized-domain` | Firebase Authorized domains | 加裸網域，不改 backend Admin SDK key |
| 本機 DNS 還是舊 IP | 1.1.1.1、8.8.8.8、authoritative DNS | 用 `curl --resolve` 分離 cache 與 production routing |
| Caddy 無法簽憑證 | DNS、80/443、bind、Caddy `/data` | 修前置條件，避免高頻 ACME retry |
| n8n 顯示 active 但未執行 | logs、trigger schema、第一次排程 | active list 不算通過；07 檢查 hours/1 |
| n8n import 權限錯誤 | `/tmp` file owner | root `chown`/清 temp，再以 node 執行 CLI |
| workflow patch jq 錯誤 | export shape | export 是 array，使用 `.[0]`/`.[]` |
| backend image rollback 後仍失敗 | Flyway schema version | 停止；評估 forward fix/restore，不改舊 migration |

## 15. 驗收與交接紀錄模板

```text
Release time (Asia/Taipei):
Operator:
Approved Git SHA:
Working tree clean: yes/no + reason
Backend image digest:
Web image digest:
VM file checksum read-back: pass/fail
Cloud SQL backup ID/status (if migration):
Compose services/health:
Public DNS (1.1.1.1 / 8.8.8.8):
External ports (80/443 open; others closed):
Web / API / n8n health HTTP status:
Auth smoke:
Feature smoke:
Notification smoke count/status (no recipient/body):
n8n active inventory and first schedule result:
Rollback deploy.env path:
Open issues / stop condition:
```

交接紀錄不得包含 password、token、webhook URL、Firebase service-account JSON、完整 OAuth
config、recipient、Email body、API response body 或 n8n raw execution。

## 16. 2026-07-21 唯讀現況快照

此節只是寫作當下的查詢結果，不是未來操作依據；每次操作仍須重跑 `describe`、DNS、port
與 health checks。

- GCP project：`project-db645bf4-fc60-49be-a75`
- VM：`ucmarketvm`，`e2-medium`，Debian 13，30 GB，`RUNNING`
- Cloud SQL：`ucmarket-pg`，PostgreSQL 16，`db-f1-micro`，10 GB，backup/deletion protection enabled
- Artifact Registry：`asia-east1/ucmarket`，Docker standard repository
- Static address：`ucmarket-web-ip`，`IN_USE`
- Public DNS：apex、www、n8n 都解析到目前 static address
- HTTPS：web、`/api/health`、n8n `/healthz` 都回 HTTP 200
- 外部 port：80/443 open；22/5678/8025/1025 實測 closed/filtered
- VM runtime：Cloud SQL Proxy、backend、n8n healthy；web running
- production image：backend/web 均以 Artifact Registry digest 固定
- n8n：`2.29.11`

## 17. 官方參考

- Google Cloud CLI 啟用 API：<https://cloud.google.com/sdk/gcloud/reference/services/enable>
- Artifact Registry Docker push/pull：<https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling>
- Cloud SQL 從 Compute Engine 連線：<https://cloud.google.com/sql/docs/postgres/connect-compute-engine>
- IAP TCP forwarding：<https://cloud.google.com/iap/docs/using-tcp-forwarding>
- Secret Manager best practices：<https://cloud.google.com/secret-manager/docs/best-practices>
- Cloud SQL deletion protection：<https://cloud.google.com/sql/docs/postgres/deletion-protection>
- Caddy Automatic HTTPS：<https://caddyserver.com/docs/automatic-https>
- Docker Engine on Debian：<https://docs.docker.com/engine/install/debian/>

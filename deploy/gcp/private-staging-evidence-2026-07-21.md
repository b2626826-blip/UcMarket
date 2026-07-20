# UcMarket GCP private staging evidence

日期：2026-07-21（Asia/Taipei）

## Scope

- 架構：B，Compute Engine / Docker Compose + 獨立 Cloud SQL。
- 目前階段：private staging。
- 尚未執行：公開 80/443、GoDaddy DNS 修改、Gmail 正式寄信、Discord 正式通知。
- 所有 secret 僅記錄 Secret Manager reference，不記錄 value。

## Git baseline

- Branch：`eagle`
- HEAD：`7e6b596b1b65fbd5b111a6dd1c9d5a8ecfe0321a`
- `origin/eagle`：`5a99c551f9a78365f45dd2846652f54a34b3ad1d`
- Ahead/behind：ahead 8、behind 0。
- 沒有 push、force push、commit。
- 工作樹因部署必要修改而 dirty。
- `automation/n8n/install/credentials.json` 已從 index 移除、保留本機 ignored copy；
  公開 Git 歷史中的既有 Discord webhook 仍必須輪替。

## GCP resources

- Project：`project-db645bf4-fc60-49be-a75`
- Region / zone：`asia-east1` / `asia-east1-c`
- Billing：enabled。
- VM：`ucmarketvm`
  - Status：`RUNNING`
  - Machine：`e2-medium`
  - Boot disk：30 GB
  - Static IPv4：`35.201.185.156`
  - Service account：`ucmarket-vm@project-db645bf4-fc60-49be-a75.iam.gserviceaccount.com`
- Cloud SQL：`ucmarket-pg`
  - PostgreSQL 16
  - Tier：`db-f1-micro`
  - Storage：10 GB SSD
  - Availability：zonal
  - Backup：enabled
  - Deletion protection：enabled
  - Connection：`project-db645bf4-fc60-49be-a75:asia-east1:ucmarket-pg`
- Artifact Registry：`asia-east1/ucmarket`
  - Immutable tags：enabled
- Static address：`ucmarket-web-ip` / `35.201.185.156` / `IN_USE`
- SSH：僅允許 IAP `35.235.240.0/20`。
- 公開 port 22、80、443、5678、8025、1025：均為 closed/filtered。

## Application images

- Backend：
  - Tag：`7e6b596-deploy1`
  - Digest：`sha256:242feae43d64d8aaa3f772c9b66b24195ff8269598313c402800c9802952a9d6`
- Web：
  - Tag：`7e6b596-deploy1`
  - Digest：`sha256:9217eca8500a6cbbe7d66985fb1dcaa1c6aac547759734bb42f6b0f4a525cd3b`

## Runtime

- `cloud-sql-proxy`：running / healthy。
- `backend`：running / healthy；host bind `127.0.0.1:8081`。
- `web`：running；host bind `127.0.0.1:8080`、`127.0.0.1:8443`。
- `n8n`：running / healthy；host bind `127.0.0.1:5678`。
- `mailpit`：running / healthy；host bind `127.0.0.1:1025`、`127.0.0.1:8025`。
- n8n data 與 Caddy data/config 使用 named volumes。
- n8n encryption key 由 Secret Manager 注入。
- Flyway 在空 Cloud SQL schema 成功依序套用 V1–V13。

## n8n inventory

- 存在：01、04、05、06、07。
- 不存在：02、03。
- Active：只有 `04-notify-webhook`。
- Inactive：01、05、06、07。
- 07 使用 candidate-read / evidence-write 兩個不同 credential reference。
- 07 fetch 上限：`size=50`、`maxRequests=4`，單輪最多 200。
- 07 write retry 與 execution save-none 設定保留。

## Secret references

已具 enabled version：

- `ucmarket-db-password`
- `ucmarket-jwt-secret`
- `ucmarket-n8n-notify-token`
- `ucmarket-n8n-read-token`
- `ucmarket-n8n-evidence-candidate-token`
- `ucmarket-n8n-evidence-write-token`
- `ucmarket-n8n-encryption-key`
- `ucmarket-n8n-owner-password`
- `ucmarket-demo-admin-password`
- `ucmarket-demo-user-password`

已建立但尚無 version：

- `ucmarket-gmail-app-password`
- `ucmarket-discord-notify-webhook`
- `ucmarket-discord-heartbeat-webhook`
- `ucmarket-cwa-api-key`
- `ucmarket-firebase-service-account`

## Test evidence

- Backend full test：389 tests；0 failures；0 errors；15 skipped；BUILD SUCCESS。
- PostgreSQL / `WALLET_PG_TEST=true`：15 tests；0 failures；0 errors；BUILD SUCCESS。
- Frontend Vitest：82 passed；14 skipped。
- Frontend build：success。
- Backend package：BUILD SUCCESS。
- Dockerfile checks：backend / web pass。
- Compose config：pass。
- Staging / production Caddy validation：pass。
- Shell scripts：`bash -n` pass。
- `git diff --check`：pass。
- Sensitive-file ignore 與 secret-pattern scan：pass。

## Smoke evidence

- Health：
  - Backend 200
  - Web 200
  - n8n `/healthz` 200
  - Mailpit 200
- IAP SSH forwarding：
  - Web 200
  - n8n health 200
  - Mailpit 200
- Core lifecycle：
  - Admin login 200
  - User login 200
  - Market browse 200
  - Trade create 200
  - Same idempotency key replay 200，trade ID 不變
  - Market resolve 200
  - Wallet：`10000.00 -> 9980.00 -> 10016.66`
- 04 / Mailpit contract：
  - Wrong token 403
  - Missing field 400
  - Valid request 200
  - Mailpit count `0 -> 1`
- Java notification worker -> 04 -> Mailpit：
  - Mailpit count `1 -> 5`
  - DB job statuses：`SENT=4`
  - DB attempt statuses：`SENT=4`
  - Next scheduler cycle：Mailpit `5 -> 5`，duplicate delta 0
- 07：
  - Candidate-read 與 evidence-write 交叉使用皆 403
  - Candidate page 0 / page 1（size=1）皆 200 且 market ID 不同
  - First execution exit 0，evidence `0 -> 2`
  - Second execution exit 0，evidence仍為 2
  - 07 execution total 2、visible 0、visible data 0
  - 驗收後已還原 Schedule Trigger，07 維持 inactive

## Private access

本機執行以下命令後，僅該 SSH process 存續期間可使用：

```bash
gcloud compute ssh ucmarketvm \
  --zone=asia-east1-c \
  --tunnel-through-iap \
  -- \
  -N \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  -L 15678:127.0.0.1:5678 \
  -L 18025:127.0.0.1:8025
```

- Web：`http://127.0.0.1:18080`
- n8n：`http://127.0.0.1:15678`
- Mailpit：`http://127.0.0.1:18025`

## Second approval gate

取得外部 secret versions 後，仍需使用者再次確認下列精確動作：

1. GoDaddy apex A：移除 parking IP `13.248.243.5`、`76.223.105.230`，
   改為 `35.201.185.156`。
2. 保留 `www` CNAME 指向 apex。
3. 新增 `n8n` A 指向 `35.201.185.156`。
4. 新增 target `ucmarket-demo` 的 public firewall：TCP 80/443 from `0.0.0.0/0`。
5. 切換 production Caddy 並取得 HTTPS certificate；依使用者決定不啟用網站 Basic Auth。
6. 以 Secret Manager 的 Gmail App Password 建立 `b2626826@gmail.com` SMTP credential。
7. 將 04 從 staging Mailpit 切到 Gmail production credential。
8. 以全新 Discord webhook 建立 01/05/06 credentials。
9. 啟用唯一的 01、05、06、07 instance；02/03 仍不存在。
10. 正式 Email 只寄 `b2626826@gmail.com`，驗 SENT/RETRY/FAILED、重送與不重複。

影響：`ucmarket.online`、`www.ucmarket.online`、`n8n.ucmarket.online` 將可從 Internet
連線；網站不設入口密碼，n8n editor 仍須以 n8n owner login 保護，
`/webhook/notify` 只以專用 header token 保護。公開前必須確認 n8n owner login 已完成設定。

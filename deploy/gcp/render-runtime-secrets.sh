#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
DEPLOY_MODE="${DEPLOY_MODE:-staging}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/ucmarket}"
SECRET_API="https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets"
FIREBASE_RUNTIME_UID="${FIREBASE_RUNTIME_UID:-999}"
FIREBASE_RUNTIME_GID="${FIREBASE_RUNTIME_GID:-999}"
CADDY_HASH_IMAGE="${CADDY_HASH_IMAGE:-caddy:2.11.4-alpine}"

umask 077
install -d -m 0700 "${RUNTIME_DIR}"

ACCESS_TOKEN="$(
  curl -fsS \
    -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    | jq -er '.access_token'
)"

access_secret() {
  local secret_name="$1"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${SECRET_API}/${secret_name}/versions/latest:access" \
    | jq -er '.payload.data' \
    | base64 --decode
}

write_secret_env() {
  local output_file="$1"
  local key="$2"
  local secret_name="$3"
  printf '%s=' "${key}" >> "${output_file}"
  access_secret "${secret_name}" >> "${output_file}"
  printf '\n' >> "${output_file}"
}

BACKEND_ENV="${RUNTIME_DIR}/backend.env"
N8N_ENV="${RUNTIME_DIR}/n8n.env"
WEB_ENV="${RUNTIME_DIR}/web.env"

: > "${BACKEND_ENV}"
cat >> "${BACKEND_ENV}" <<'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://cloud-sql-proxy:5432/ucmarket
SPRING_DATASOURCE_USERNAME=ucmarket_app
PORT=8080
APP_FRONTEND_BASE_URL=https://ucmarket.online
CORS_ALLOWED_ORIGINS=https://ucmarket.online,https://www.ucmarket.online
FIREBASE_SERVICE_ACCOUNT_PATH=file:/run/secrets/firebase-service-account.json
NOTIFICATION_WORKER_ENABLED=true
N8N_NOTIFY_WEBHOOK_URL=http://n8n:5678/webhook/notify
EOF
write_secret_env "${BACKEND_ENV}" SPRING_DATASOURCE_PASSWORD ucmarket-db-password
write_secret_env "${BACKEND_ENV}" APP_JWT_SECRET ucmarket-jwt-secret
write_secret_env "${BACKEND_ENV}" N8N_NOTIFY_WEBHOOK_TOKEN ucmarket-n8n-notify-token
write_secret_env "${BACKEND_ENV}" N8N_SERVICE_TOKEN ucmarket-n8n-read-token
write_secret_env "${BACKEND_ENV}" N8N_RESOLUTION_EVIDENCE_CANDIDATE_SERVICE_TOKEN ucmarket-n8n-evidence-candidate-token
write_secret_env "${BACKEND_ENV}" N8N_RESOLUTION_EVIDENCE_SERVICE_TOKEN ucmarket-n8n-evidence-write-token

: > "${N8N_ENV}"
cat >> "${N8N_ENV}" <<'EOF'
GENERIC_TIMEZONE=Asia/Taipei
TZ=Asia/Taipei
N8N_HOST=n8n.ucmarket.online
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.ucmarket.online/
N8N_EDITOR_BASE_URL=https://n8n.ucmarket.online/
N8N_LISTEN_ADDRESS=0.0.0.0
N8N_PROXY_HOPS=1
N8N_DIAGNOSTICS_ENABLED=false
N8N_PERSONALIZATION_ENABLED=false
N8N_VERSION_NOTIFICATIONS_ENABLED=false
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
EOF
if [[ "${DEPLOY_MODE}" == "staging" ]]; then
  printf 'N8N_SECURE_COOKIE=false\n' >> "${N8N_ENV}"
else
  printf 'N8N_SECURE_COOKIE=true\n' >> "${N8N_ENV}"
fi
write_secret_env "${N8N_ENV}" N8N_ENCRYPTION_KEY ucmarket-n8n-encryption-key

: > "${WEB_ENV}"
cat >> "${WEB_ENV}" <<'EOF'
ACME_EMAIL=b2626826@gmail.com
DEMO_AUTH_USERNAME=ucmarket
EOF
if [[ "${DEPLOY_MODE}" == "production" ]]; then
  demo_auth_password_hash="$(
    {
      access_secret ucmarket-demo-web-password
      printf '\n'
    } | docker run --rm -i "${CADDY_HASH_IMAGE}" \
      caddy hash-password --algorithm bcrypt
  )"
  printf "DEMO_AUTH_PASSWORD_HASH='%s'\n" \
    "${demo_auth_password_hash}" >> "${WEB_ENV}"
else
  printf 'DEMO_AUTH_PASSWORD_HASH=\n' >> "${WEB_ENV}"
fi

if curl -fsS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${SECRET_API}/ucmarket-firebase-service-account/versions/latest:access" \
  | jq -er '.payload.data' \
  | base64 --decode > "${RUNTIME_DIR}/firebase-service-account.json"; then
  chown "${FIREBASE_RUNTIME_UID}:${FIREBASE_RUNTIME_GID}" \
    "${RUNTIME_DIR}/firebase-service-account.json"
  chmod 0400 "${RUNTIME_DIR}/firebase-service-account.json"
else
  : > "${RUNTIME_DIR}/firebase-service-account.json"
  chown root:root "${RUNTIME_DIR}/firebase-service-account.json"
  chmod 0600 "${RUNTIME_DIR}/firebase-service-account.json"
  sed -i '\|^FIREBASE_SERVICE_ACCOUNT_PATH=|d' "${BACKEND_ENV}"
fi

if cwa_value="$(access_secret ucmarket-cwa-api-key 2>/dev/null)"; then
  printf 'CWA_API_KEY=%s\n' "${cwa_value}" >> "${BACKEND_ENV}"
  printf 'WEATHER_MOCK_ENABLED=false\n' >> "${BACKEND_ENV}"
else
  printf 'WEATHER_MOCK_ENABLED=true\n' >> "${BACKEND_ENV}"
fi

chmod 0600 "${BACKEND_ENV}" "${N8N_ENV}" "${WEB_ENV}"

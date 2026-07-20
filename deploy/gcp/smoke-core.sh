#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080/api}"
RUNTIME_DIR="${RUNTIME_DIR:-/run/ucmarket}"
SECRET_API="https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets"
TMP_DIR="$(mktemp -d "${RUNTIME_DIR}/core-smoke.XXXXXX")"
STAGE="initialize"

cleanup() {
  find "${TMP_DIR}" -type f -exec shred -u {} + 2>/dev/null || true
  rmdir "${TMP_DIR}" 2>/dev/null || true
}
trap cleanup EXIT
trap 'printf "smoke_failed_stage=%s\n" "${STAGE}" >&2' ERR
umask 077

ACCESS_TOKEN="$(
  curl -fsS \
    -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    | jq -er '.access_token'
)"

access_secret_to_file() {
  local secret_name="$1"
  local output_file="$2"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${SECRET_API}/${secret_name}/versions/latest:access" \
    | jq -er '.payload.data' \
    | base64 --decode > "${output_file}"
}

STAGE="fetch_secrets"
access_secret_to_file ucmarket-demo-admin-password "${TMP_DIR}/admin-password"
access_secret_to_file ucmarket-demo-user-password "${TMP_DIR}/user-password"
access_secret_to_file ucmarket-db-password "${TMP_DIR}/db-password"
unset ACCESS_TOKEN

build_auth_payload() {
  local email="$1"
  local password_file="$2"
  local output_file="$3"
  local username="${4:-}"

  if [[ -n "${username}" ]]; then
    jq -n \
      --arg username "${username}" \
      --arg email "${email}" \
      --rawfile password "${password_file}" \
      '{
        username: $username,
        email: $email,
        password: ($password | rtrimstr("\n"))
      }' > "${output_file}"
  else
    jq -n \
      --arg email "${email}" \
      --rawfile password "${password_file}" \
      '{
        email: $email,
        password: ($password | rtrimstr("\n"))
      }' > "${output_file}"
  fi
}

register_account() {
  local email="$1"
  local username="$2"
  local password_file="$3"
  local idempotency_key="$4"
  local response_file="$5"

  build_auth_payload "${email}" "${password_file}" "${TMP_DIR}/register.json" "${username}"
  curl -sS -o "${response_file}" -w '%{http_code}' \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${idempotency_key}" \
    --data-binary "@${TMP_DIR}/register.json" \
    "${BASE_URL}/auth/register"
}

login_account() {
  local email="$1"
  local password_file="$2"
  local response_file="$3"

  build_auth_payload "${email}" "${password_file}" "${TMP_DIR}/login.json"
  curl -sS -o "${response_file}" -w '%{http_code}' \
    -H "Content-Type: application/json" \
    --data-binary "@${TMP_DIR}/login.json" \
    "${BASE_URL}/auth/login"
}

ADMIN_EMAIL="b2626826+ucmarket-admin@gmail.com"
USER_EMAIL="b2626826+ucmarket-demo@gmail.com"

STAGE="register_accounts"
admin_register="$(
  register_account \
    "${ADMIN_EMAIL}" \
    ucmarket_admin_demo \
    "${TMP_DIR}/admin-password" \
    gcp-smoke-admin-20260720-v1 \
    "${TMP_DIR}/admin-register-response.json"
)"
user_register="$(
  register_account \
    "${USER_EMAIL}" \
    ucmarket_demo \
    "${TMP_DIR}/user-password" \
    gcp-smoke-user-20260720-v1 \
    "${TMP_DIR}/user-register-response.json"
)"
printf 'register_admin_http=%s\n' "${admin_register}"
printf 'register_user_http=%s\n' "${user_register}"
if [[ "${admin_register}" -ge 400 ]]; then
  jq -r '"register_admin_error=" + (.message // .error // "unknown")' \
    "${TMP_DIR}/admin-register-response.json"
fi
if [[ "${user_register}" -ge 400 ]]; then
  jq -r '"register_user_error=" + (.message // .error // "unknown")' \
    "${TMP_DIR}/user-register-response.json"
fi
[[ "${admin_register}" == 200 \
  || "${admin_register}" == 201 \
  || ("${admin_register}" == 400 \
    && "$(jq -r '.message' "${TMP_DIR}/admin-register-response.json")" == "此 Email 已被註冊") ]]
[[ "${user_register}" == 200 \
  || "${user_register}" == 201 \
  || ("${user_register}" == 400 \
    && "$(jq -r '.message' "${TMP_DIR}/user-register-response.json")" == "此 Email 已被註冊") ]]

{
  printf 'PGPASSWORD='
  tr -d '\r\n' < "${TMP_DIR}/db-password"
  printf '\n'
} > "${TMP_DIR}/psql.env"

docker pull postgres:16-alpine >/dev/null
STAGE="promote_admin"
admin_role="$(
  docker run --rm \
    --network ucmarket_default \
    --env-file "${TMP_DIR}/psql.env" \
    postgres:16-alpine \
    psql \
      --host=cloud-sql-proxy \
      --username=ucmarket_app \
      --dbname=ucmarket \
      --no-align \
      --tuples-only \
      --set=ON_ERROR_STOP=1 \
      --command="UPDATE users SET role = 'ADMIN' WHERE email = '${ADMIN_EMAIL}'; SELECT role FROM users WHERE email = '${ADMIN_EMAIL}';"
)"
[[ "${admin_role}" == "UPDATE 1"$'\n'"ADMIN" || "${admin_role}" == "ADMIN" ]]

STAGE="login_accounts"
admin_login="$(
  login_account \
    "${ADMIN_EMAIL}" \
    "${TMP_DIR}/admin-password" \
    "${TMP_DIR}/admin-login-response.json"
)"
user_login="$(
  login_account \
    "${USER_EMAIL}" \
    "${TMP_DIR}/user-password" \
    "${TMP_DIR}/user-login-response.json"
)"
[[ "${admin_login}" == 200 ]]
[[ "${user_login}" == 200 ]]

jq -er '"header = \"Authorization: Bearer " + .accessToken + "\""' \
  "${TMP_DIR}/admin-login-response.json" > "${TMP_DIR}/admin-curl.conf"
jq -er '"header = \"Authorization: Bearer " + .accessToken + "\""' \
  "${TMP_DIR}/user-login-response.json" > "${TMP_DIR}/user-curl.conf"

STAGE="verify_sessions"
admin_me="$(
  curl -sS -o "${TMP_DIR}/admin-me.json" -w '%{http_code}' \
    --config "${TMP_DIR}/admin-curl.conf" \
    "${BASE_URL}/auth/me"
)"
user_me="$(
  curl -sS -o "${TMP_DIR}/user-me.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    "${BASE_URL}/auth/me"
)"
[[ "${admin_me}" == 200 ]]
[[ "${user_me}" == 200 ]]
[[ "$(jq -r '.role' "${TMP_DIR}/admin-me.json")" == "ADMIN" ]]
[[ "$(jq -r '.role' "${TMP_DIR}/user-me.json")" == "USER" ]]

jq -n '{
  title: "Will the UcMarket GCP staging smoke test complete?",
  description: "Deployment acceptance market for the private 2026-08-06 demonstration.",
  category: "CURRENT_AFFAIRS",
  marketType: "BINARY",
  sourceUrl: "https://ucmarket.online/deployment-acceptance",
  imageUrl: "",
  tradingViewSymbol: "",
  resolutionRule: "Resolve YES after all private staging smoke checks pass.",
  closeAt: "2026-08-07T00:00:00"
}' > "${TMP_DIR}/market-request.json"

if [[ -n "${EXISTING_MARKET_ID:-}" ]]; then
  market_id="${EXISTING_MARKET_ID}"
  market_create="existing"
  market_submit="existing"
  market_approve="existing"
  STAGE="verify_existing_market"
  existing_market="$(
    curl -sS -o "${TMP_DIR}/market-existing.json" -w '%{http_code}' \
      "${BASE_URL}/markets/${market_id}"
  )"
  [[ "${existing_market}" == 200 ]]
  [[ "$(jq -r '.status' "${TMP_DIR}/market-existing.json")" == "ACTIVE" ]]
else
  STAGE="create_market"
  market_create="$(
    curl -sS -o "${TMP_DIR}/market.json" -w '%{http_code}' \
      --config "${TMP_DIR}/user-curl.conf" \
      -H "Content-Type: application/json" \
      --data-binary "@${TMP_DIR}/market-request.json" \
      "${BASE_URL}/markets"
  )"
  [[ "${market_create}" == 201 ]]
  market_id="$(jq -er '.id' "${TMP_DIR}/market.json")"

  STAGE="submit_market"
  market_submit="$(
    curl -sS -o "${TMP_DIR}/market-submit.json" -w '%{http_code}' \
      --config "${TMP_DIR}/user-curl.conf" \
      -X POST \
      "${BASE_URL}/markets/${market_id}/submit"
  )"
  [[ "${market_submit}" == 200 ]]
  [[ "$(jq -r '.status' "${TMP_DIR}/market-submit.json")" == "PENDING" ]]

  STAGE="approve_market"
  market_approve="$(
    curl -sS -o "${TMP_DIR}/market-approve.json" -w '%{http_code}' \
      --config "${TMP_DIR}/admin-curl.conf" \
      -X POST \
      "${BASE_URL}/admin/markets/${market_id}/approve"
  )"
  [[ "${market_approve}" == 200 ]]
  [[ "$(jq -r '.status' "${TMP_DIR}/market-approve.json")" == "ACTIVE" ]]
fi

STAGE="browse_market"
market_browse="$(
  curl -sS -o "${TMP_DIR}/markets.json" -w '%{http_code}' \
    "${BASE_URL}/markets?status=ACTIVE&page=0&size=100"
)"
[[ "${market_browse}" == 200 ]]
jq -e --arg id "${market_id}" '(.content? // .) | any(.id == $id)' \
  "${TMP_DIR}/markets.json" >/dev/null

STAGE="wallet_before_trade"
wallet_before_status="$(
  curl -sS -o "${TMP_DIR}/wallet-before.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    "${BASE_URL}/wallets/me/balance"
)"
[[ "${wallet_before_status}" == 200 ]]
wallet_before="$(jq -er '.balance' "${TMP_DIR}/wallet-before.json")"

jq -n --arg marketId "${market_id}" '{
  marketId: $marketId,
  side: "YES",
  amount: 20
}' > "${TMP_DIR}/trade-request.json"

STAGE="create_and_replay_trade"
trade_create="$(
  curl -sS -o "${TMP_DIR}/trade.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: gcp-smoke-trade-20260720-v1" \
    --data-binary "@${TMP_DIR}/trade-request.json" \
    "${BASE_URL}/trades"
)"
[[ "${trade_create}" == 201 || "${trade_create}" == 200 ]]
trade_id="$(jq -er '.id' "${TMP_DIR}/trade.json")"

trade_replay="$(
  curl -sS -o "${TMP_DIR}/trade-replay.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: gcp-smoke-trade-20260720-v1" \
    --data-binary "@${TMP_DIR}/trade-request.json" \
    "${BASE_URL}/trades"
)"
[[ "${trade_replay}" == 200 || "${trade_replay}" == 201 ]]
[[ "$(jq -er '.id' "${TMP_DIR}/trade-replay.json")" == "${trade_id}" ]]

STAGE="wallet_after_trade"
wallet_after_trade_status="$(
  curl -sS -o "${TMP_DIR}/wallet-after-trade.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    "${BASE_URL}/wallets/me/balance"
)"
[[ "${wallet_after_trade_status}" == 200 ]]
wallet_after_trade="$(jq -er '.balance' "${TMP_DIR}/wallet-after-trade.json")"

jq -n '{result: "YES"}' > "${TMP_DIR}/resolve-request.json"
STAGE="resolve_market"
market_resolve="$(
  curl -sS -o "${TMP_DIR}/market-resolve.json" -w '%{http_code}' \
    --config "${TMP_DIR}/admin-curl.conf" \
    -H "Content-Type: application/json" \
    --data-binary "@${TMP_DIR}/resolve-request.json" \
    "${BASE_URL}/admin/markets/${market_id}/resolve"
)"
[[ "${market_resolve}" == 200 ]]
[[ "$(jq -r '.status' "${TMP_DIR}/market-resolve.json")" == "RESOLVED" ]]
[[ "$(jq -r '.result' "${TMP_DIR}/market-resolve.json")" == "YES" ]]

STAGE="wallet_after_settlement"
wallet_settled_status="$(
  curl -sS -o "${TMP_DIR}/wallet-settled.json" -w '%{http_code}' \
    --config "${TMP_DIR}/user-curl.conf" \
    "${BASE_URL}/wallets/me/balance"
)"
[[ "${wallet_settled_status}" == 200 ]]
wallet_settled="$(jq -er '.balance' "${TMP_DIR}/wallet-settled.json")"

STAGE="complete"
printf 'register_admin_http=%s\n' "${admin_register}"
printf 'register_user_http=%s\n' "${user_register}"
printf 'login_admin_http=%s\n' "${admin_login}"
printf 'login_user_http=%s\n' "${user_login}"
printf 'market_create_http=%s\n' "${market_create}"
printf 'market_submit_http=%s\n' "${market_submit}"
printf 'market_approve_http=%s\n' "${market_approve}"
printf 'market_browse_http=%s\n' "${market_browse}"
printf 'trade_create_http=%s\n' "${trade_create}"
printf 'trade_replay_http=%s\n' "${trade_replay}"
printf 'market_resolve_http=%s\n' "${market_resolve}"
printf 'market_id=%s\n' "${market_id}"
printf 'trade_id=%s\n' "${trade_id}"
printf 'wallet_before=%s\n' "${wallet_before}"
printf 'wallet_after_trade=%s\n' "${wallet_after_trade}"
printf 'wallet_settled=%s\n' "${wallet_settled}"

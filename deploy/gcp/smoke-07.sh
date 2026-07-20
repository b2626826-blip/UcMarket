#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080/api}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/ucmarket}"
SECRET_API="https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets"
TMP_DIR="$(mktemp -d /tmp/ucmarket-smoke-07.XXXXXX)"
STAGE="initialize"
N8N_RESTORE_NEEDED=0

cleanup() {
  if [[ "${N8N_RESTORE_NEEDED}" == 1 ]]; then
    docker compose \
      --project-directory "${DEPLOY_DIR}" \
      --env-file "${DEPLOY_DIR}/deploy.env" \
      -f "${DEPLOY_DIR}/docker-compose.yml" \
      run --rm --no-deps \
      -v "${DEPLOY_DIR}/workflows/07-resolution-evidence-collector.json:/tmp/original-07.json:ro" \
      n8n import:workflow --input=/tmp/original-07.json >/dev/null 2>&1 || true
  fi
  docker compose \
    --project-directory "${DEPLOY_DIR}" \
    --env-file "${DEPLOY_DIR}/deploy.env" \
    -f "${DEPLOY_DIR}/docker-compose.yml" \
    up -d n8n >/dev/null 2>&1 || true
  find "${TMP_DIR}" -type f -exec shred -u {} + 2>/dev/null || true
  rmdir "${TMP_DIR}" 2>/dev/null || true
}
trap cleanup EXIT
trap 'printf "smoke_07_failed_stage=%s\n" "${STAGE}" >&2' ERR
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
access_secret_to_file ucmarket-n8n-evidence-candidate-token "${TMP_DIR}/candidate-token"
access_secret_to_file ucmarket-n8n-evidence-write-token "${TMP_DIR}/write-token"
unset ACCESS_TOKEN

build_login_payload() {
  local email="$1"
  local password_file="$2"
  local output_file="$3"
  jq -n \
    --arg email "${email}" \
    --rawfile password "${password_file}" \
    '{
      email: $email,
      password: ($password | rtrimstr("\n"))
    }' > "${output_file}"
}

login_to_curl_config() {
  local email="$1"
  local password_file="$2"
  local prefix="$3"
  build_login_payload "${email}" "${password_file}" "${TMP_DIR}/${prefix}-login.json"
  local status
  status="$(
    curl -sS -o "${TMP_DIR}/${prefix}-login-response.json" -w '%{http_code}' \
      -H "Content-Type: application/json" \
      --data-binary "@${TMP_DIR}/${prefix}-login.json" \
      "${BASE_URL}/auth/login"
  )"
  [[ "${status}" == 200 ]]
  jq -er '"header = \"Authorization: Bearer " + .accessToken + "\""' \
    "${TMP_DIR}/${prefix}-login-response.json" > "${TMP_DIR}/${prefix}-curl.conf"
}

make_header_config() {
  local header_name="$1"
  local value_file="$2"
  local output_file="$3"
  {
    printf 'header = "%s: ' "${header_name}"
    tr -d '\r\n' < "${value_file}"
    printf '"\n'
  } > "${output_file}"
}

STAGE="login"
login_to_curl_config \
  b2626826+ucmarket-admin@gmail.com \
  "${TMP_DIR}/admin-password" \
  admin
login_to_curl_config \
  b2626826+ucmarket-demo@gmail.com \
  "${TMP_DIR}/user-password" \
  user
make_header_config \
  X-N8N-Service-Token \
  "${TMP_DIR}/candidate-token" \
  "${TMP_DIR}/candidate-curl.conf"
make_header_config \
  X-N8N-Service-Token \
  "${TMP_DIR}/write-token" \
  "${TMP_DIR}/write-curl.conf"

create_closed_candidate() {
  local suffix="$1"
  local request_file="${TMP_DIR}/market-${suffix}-request.json"
  local response_file="${TMP_DIR}/market-${suffix}.json"

  jq -n --arg suffix "${suffix}" '{
    title: ("UcMarket 07 deployment evidence candidate " + $suffix),
    description: "Private deployment fixture for candidate paging and evidence idempotency.",
    category: "CURRENT_AFFAIRS",
    marketType: "BINARY",
    sourceUrl: ("https://example.com/ucmarket-evidence-" + ($suffix | ascii_downcase)),
    imageUrl: "",
    tradingViewSymbol: "",
    resolutionRule: "Collect the objective source before an administrator resolves the market.",
    closeAt: "2026-08-07T00:00:00"
  }' > "${request_file}"

  local create_status
  create_status="$(
    curl -sS -o "${response_file}" -w '%{http_code}' \
      --config "${TMP_DIR}/user-curl.conf" \
      -H "Content-Type: application/json" \
      --data-binary "@${request_file}" \
      "${BASE_URL}/markets"
  )"
  [[ "${create_status}" == 201 ]]
  local market_id
  market_id="$(jq -er '.id' "${response_file}")"

  local submit_status
  submit_status="$(
    curl -sS -o "${TMP_DIR}/market-${suffix}-submit.json" -w '%{http_code}' \
      --config "${TMP_DIR}/user-curl.conf" \
      -X POST \
      "${BASE_URL}/markets/${market_id}/submit"
  )"
  [[ "${submit_status}" == 200 ]]

  local approve_status
  approve_status="$(
    curl -sS -o "${TMP_DIR}/market-${suffix}-approve.json" -w '%{http_code}' \
      --config "${TMP_DIR}/admin-curl.conf" \
      -X POST \
      "${BASE_URL}/admin/markets/${market_id}/approve"
  )"
  [[ "${approve_status}" == 200 ]]
  printf '%s' "${market_id}"
}

STAGE="create_candidates"
candidate_a="$(create_closed_candidate A)"
candidate_b="$(create_closed_candidate B)"

{
  printf 'PGPASSWORD='
  tr -d '\r\n' < "${TMP_DIR}/db-password"
  printf '\n'
} > "${TMP_DIR}/psql.env"

STAGE="close_candidates"
close_result="$(
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
      --command="UPDATE markets SET status = 'CLOSED', close_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id IN ('${candidate_a}', '${candidate_b}'); SELECT count(*) FROM markets WHERE id IN ('${candidate_a}', '${candidate_b}') AND status = 'CLOSED';"
)"
[[ "${close_result}" == "UPDATE 2"$'\n'"2" || "${close_result}" == "2" ]]

CANDIDATE_URL="${BASE_URL}/internal/current-affairs/resolution-evidence-candidates"

STAGE="verify_token_isolation"
wrong_status="$(
  curl -sS -o /dev/null -w '%{http_code}' \
    -H "X-N8N-Service-Token: wrong" \
    "${CANDIDATE_URL}?page=0&size=1"
)"
write_reads_status="$(
  curl -sS -o /dev/null -w '%{http_code}' \
    --config "${TMP_DIR}/write-curl.conf" \
    "${CANDIDATE_URL}?page=0&size=1"
)"
candidate_writes_status="$(
  curl -sS -o /dev/null -w '%{http_code}' \
    --config "${TMP_DIR}/candidate-curl.conf" \
    -H "Content-Type: application/json" \
    --data-binary '{"sourceUrl":"https://example.com/forbidden","sourceTitle":"forbidden","publishedAt":null,"fetchedAt":"2026-07-20T00:00:00Z"}' \
    "${BASE_URL}/internal/current-affairs/markets/${candidate_a}/resolution-evidence"
)"
[[ "${wrong_status}" == 403 ]]
[[ "${write_reads_status}" == 403 ]]
[[ "${candidate_writes_status}" == 403 ]]

STAGE="verify_pagination"
page_zero_status="$(
  curl -sS -o "${TMP_DIR}/page-zero.json" -w '%{http_code}' \
    --config "${TMP_DIR}/candidate-curl.conf" \
    "${CANDIDATE_URL}?page=0&size=1"
)"
page_one_status="$(
  curl -sS -o "${TMP_DIR}/page-one.json" -w '%{http_code}' \
    --config "${TMP_DIR}/candidate-curl.conf" \
    "${CANDIDATE_URL}?page=1&size=1"
)"
[[ "${page_zero_status}" == 200 ]]
[[ "${page_one_status}" == 200 ]]
page_zero_id="$(
  jq -er 'if (.content | length) == 1 then .content[0].marketId else error("unexpected page size") end' \
    "${TMP_DIR}/page-zero.json"
)"
page_one_id="$(
  jq -er 'if (.content | length) == 1 then .content[0].marketId else error("unexpected page size") end' \
    "${TMP_DIR}/page-one.json"
)"
[[ "${page_zero_id}" != "${page_one_id}" ]]
[[ "$(jq -er '.size' "${TMP_DIR}/page-zero.json")" == 1 ]]
[[ "$(jq -er '.totalElements >= 2' "${TMP_DIR}/page-zero.json")" == true ]]

evidence_count() {
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
      --command="SELECT count(*) FROM market_resolution_evidence WHERE market_id IN ('${candidate_a}', '${candidate_b}');"
}

MANUAL_WORKFLOW="${TMP_DIR}/07-manual.json"
jq \
  '(.nodes[] | select(.name == "Schedule Trigger") | .type) = "n8n-nodes-base.manualTrigger"
    | (.nodes[] | select(.name == "Schedule Trigger") | .typeVersion) = 1
    | (.nodes[] | select(.name == "Schedule Trigger") | .parameters) = {}
    | .active = false' \
  "${DEPLOY_DIR}/workflows/07-resolution-evidence-collector.json" \
  > "${MANUAL_WORKFLOW}"

STAGE="execute_07_first"
docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  stop n8n >/dev/null
docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  run --rm --no-deps \
  -v "${MANUAL_WORKFLOW}:/tmp/07-manual.json:ro" \
  n8n import:workflow --input=/tmp/07-manual.json >/dev/null 2>&1
N8N_RESTORE_NEEDED=1

if docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  run --rm --no-deps \
  n8n execute --id=07ResolutionEvidenceCollectorV1 >/dev/null 2>&1; then
  first_exit=0
else
  first_exit=$?
fi
[[ "${first_exit}" == 0 ]]
first_count="$(evidence_count)"
[[ "${first_count}" == 2 ]]

STAGE="execute_07_second"
if docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  run --rm --no-deps \
  n8n execute --id=07ResolutionEvidenceCollectorV1 >/dev/null 2>&1; then
  second_exit=0
else
  second_exit=$?
fi
[[ "${second_exit}" == 0 ]]
second_count="$(evidence_count)"
[[ "${second_count}" == 2 ]]

STAGE="restore_07_schedule"
docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  run --rm --no-deps \
  -v "${DEPLOY_DIR}/workflows/07-resolution-evidence-collector.json:/tmp/original-07.json:ro" \
  n8n import:workflow --input=/tmp/original-07.json >/dev/null 2>&1
N8N_RESTORE_NEEDED=0
docker compose \
  --project-directory "${DEPLOY_DIR}" \
  --env-file "${DEPLOY_DIR}/deploy.env" \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  up -d n8n >/dev/null

STAGE="complete"
printf 'wrong_token_http=%s\n' "${wrong_status}"
printf 'write_token_candidate_read_http=%s\n' "${write_reads_status}"
printf 'candidate_token_evidence_write_http=%s\n' "${candidate_writes_status}"
printf 'candidate_page_0_http=%s\n' "${page_zero_status}"
printf 'candidate_page_1_http=%s\n' "${page_one_status}"
printf 'candidate_page_0_id=%s\n' "${page_zero_id}"
printf 'candidate_page_1_id=%s\n' "${page_one_id}"
printf 'workflow_07_first_exit=%s\n' "${first_exit}"
printf 'workflow_07_second_exit=%s\n' "${second_exit}"
printf 'evidence_count_after_first=%s\n' "${first_count}"
printf 'evidence_count_after_second=%s\n' "${second_count}"

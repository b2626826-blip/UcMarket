#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
N8N_CONTAINER="${N8N_CONTAINER:-ucmarket-n8n-1}"
SECRET_API="https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets"
TMP_DIR="$(mktemp -d /run/ucmarket/n8n-credential-import.XXXXXX)"
IMPORT_FILE="${TMP_DIR}/credentials.json"
CONTAINER_IMPORT_FILE="/tmp/ucmarket-credentials.json"

cleanup() {
  docker exec --user root "${N8N_CONTAINER}" \
    rm -f "${CONTAINER_IMPORT_FILE}" >/dev/null 2>&1 || true
  find "${TMP_DIR}" -type f -exec shred -u {} + 2>/dev/null || true
  rmdir "${TMP_DIR}" 2>/dev/null || true
}
trap cleanup EXIT

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

access_secret_to_file ucmarket-n8n-notify-token "${TMP_DIR}/notify"
access_secret_to_file ucmarket-n8n-read-token "${TMP_DIR}/read"
access_secret_to_file ucmarket-n8n-evidence-candidate-token "${TMP_DIR}/candidate"
access_secret_to_file ucmarket-n8n-evidence-write-token "${TMP_DIR}/write"
unset ACCESS_TOKEN

jq -n \
  --rawfile notify "${TMP_DIR}/notify" \
  --rawfile read "${TMP_DIR}/read" \
  --rawfile candidate "${TMP_DIR}/candidate" \
  --rawfile write "${TMP_DIR}/write" \
  '[
    {
      id: "eCxRQu4TNE1q0dI3",
      name: "smtp-mailpit",
      type: "smtp",
      data: {
        user: "",
        password: "",
        host: "mailpit",
        port: 1025,
        secure: false
      }
    },
    {
      id: "fa56a3d8586aaf2e",
      name: "ucmarket-notify-webhook-token",
      type: "httpHeaderAuth",
      data: {
        name: "X-Webhook-Token",
        value: ($notify | rtrimstr("\n"))
      }
    },
    {
      id: "bind-in-local-n8n",
      name: "ucmarket-n8n-service-token",
      type: "httpHeaderAuth",
      data: {
        name: "X-N8N-Service-Token",
        value: ($read | rtrimstr("\n"))
      }
    },
    {
      id: "bind-candidate-read-in-local-n8n",
      name: "ucmarket-resolution-evidence-candidate-read-token",
      type: "httpHeaderAuth",
      data: {
        name: "X-N8N-Service-Token",
        value: ($candidate | rtrimstr("\n"))
      }
    },
    {
      id: "bind-evidence-write-in-local-n8n",
      name: "ucmarket-resolution-evidence-write-token",
      type: "httpHeaderAuth",
      data: {
        name: "X-N8N-Service-Token",
        value: ($write | rtrimstr("\n"))
      }
    }
  ]' > "${IMPORT_FILE}"

docker cp "${IMPORT_FILE}" "${N8N_CONTAINER}:${CONTAINER_IMPORT_FILE}"
docker exec --user root "${N8N_CONTAINER}" \
  chown node:node "${CONTAINER_IMPORT_FILE}"
docker exec --user root "${N8N_CONTAINER}" \
  chmod 0600 "${CONTAINER_IMPORT_FILE}"
docker exec --user node "${N8N_CONTAINER}" \
  n8n import:credentials --input="${CONTAINER_IMPORT_FILE}"

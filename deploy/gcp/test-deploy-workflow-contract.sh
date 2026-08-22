#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workflow="${1:-${script_dir}/../../.github/workflows/deploy-gcp.yml}"

if [[ ! -f "${workflow}" ]]; then
  printf 'workflow not found: %s\n' "${workflow}" >&2
  exit 1
fi

assert_contains() {
  local expected="$1"
  if ! grep -Fq -- "${expected}" "${workflow}"; then
    printf 'missing workflow contract: %s\n' "${expected}" >&2
    exit 1
  fi
}

assert_contains 'workflow_dispatch:'
assert_contains 'rollback_env=\"deploy.env.pre-${GITHUB_SHA}\"'
assert_contains 'trap rollback EXIT'
assert_contains 'trap - EXIT'
assert_contains 'if [ \$original_status -eq 0 ]; then'
assert_contains 'if [ ! -f \"\$rollback_env\" ]; then'
assert_contains 'if ! sudo cp \"\$rollback_env\" deploy.env; then'
assert_contains "echo 'rollback completed' >&2"
assert_contains "echo 'rollback health check failed after 30 attempts' >&2"
assert_contains 'exit \$original_status'
assert_contains 'attempt=\$((attempt + 1))'
assert_contains 'if [ \$attempt -ge 30 ]; then'

backup_line="$(grep -nF 'sudo cp deploy.env \"\$rollback_env\"' "${workflow}" | cut -d: -f1 | head -n1 || true)"
trap_line="$(grep -nF 'trap rollback EXIT' "${workflow}" | head -n1 | cut -d: -f1 || true)"

if [[ -z "${backup_line}" ]]; then
  printf 'workflow never backs up deploy.env for rollback\n' >&2
  exit 1
fi
if [[ -z "${trap_line}" ]]; then
  printf 'workflow never installs the rollback trap\n' >&2
  exit 1
fi
if [[ "${trap_line}" -ge "${backup_line}" ]]; then
  printf 'rollback trap must be installed before the deployment backup\n' >&2
  exit 1
fi

# guard 必須是緊鄰 backup 的那一行。這個字串在 workflow 出現不只一次（rollback
# 函式內也有一個），所以直接讀 backup 的前一行，不依賴出現順序。
guard_line_text="$(sed -n "$((backup_line - 1))p" "${workflow}")"
if [[ "${guard_line_text}" != *'if [ ! -f \"\$rollback_env\" ]; then'* ]]; then
  printf 'the deploy.env backup must be guarded by an existence check on the line directly above it, found: %s\n' "${guard_line_text}" >&2
  exit 1
fi

up_count="$(grep -Fc -- 'sudo docker compose --env-file deploy.env up -d backend web' "${workflow}")"
if [[ "${up_count}" -lt 2 ]]; then
  printf 'expected deployment and rollback compose up commands\n' >&2
  exit 1
fi

# grep 只看得到文字在不在。內嵌在 gcloud --command 裡的那段 shell 還必須是「單一參數」，
# 而且本身語法要正確——未跳脫的引號會把它切碎，而文字比對完全看不出來。
python_bin="$(command -v python3 || command -v python || true)"
if [[ -z "${python_bin}" ]]; then
  printf 'python not available; skipping embedded shell probe\n' >&2
else
  probe_dir="$(mktemp -d)"
  trap 'rm -rf "${probe_dir}"' EXIT

  "${python_bin}" - "${workflow}" "${probe_dir}/step.sh" <<'PYPROBE'
import re, sys, yaml
workflow, out = sys.argv[1], sys.argv[2]
doc = yaml.safe_load(open(workflow, encoding="utf-8"))
step = [s for s in doc["jobs"]["deploy"]["steps"]
        if s.get("name", "").startswith("Deploy to Compute Engine")][0]
# GitHub 在執行前先做 ${{ }} 的文字替換
run = re.sub(r"\$\{\{[^}]*\}\}", "staging", step["run"])
open(out, "w", encoding="utf-8", newline="\n").write(run)
PYPROBE

  (
    gcloud() {
      printf '%s' "$#" > "${probe_dir}/argc"
      while [[ $# -gt 0 ]]; do
        if [[ "$1" == "--command" ]]; then printf '%s' "$2" > "${probe_dir}/remote.sh"; fi
        shift
      done
    }
    GCE_ZONE=probe-zone GCE_INSTANCE=probe-instance GITHUB_SHA=probe-sha \
      BACKEND_IMAGE=probe/backend@sha256:aa WEB_IMAGE=probe/web@sha256:bb \
      GCP_PROJECT_ID=probe-project source "${probe_dir}/step.sh"
  ) >/dev/null 2>&1

  argc="$(cat "${probe_dir}/argc" 2>/dev/null || true)"
  if [[ "${argc}" != "8" ]]; then
    printf 'gcloud received %s arguments, expected 8: unescaped quotes are splitting the remote script\n' "${argc:-0}" >&2
    exit 1
  fi
  if ! bash -n "${probe_dir}/remote.sh"; then
    printf 'embedded remote script is not valid shell\n' >&2
    exit 1
  fi
  for expected in 'trap rollback EXIT' 'rollback completed'; do
    if ! grep -Fq -- "${expected}" "${probe_dir}/remote.sh"; then
      printf 'remote script lost its rollback contract: %s\n' "${expected}" >&2
      exit 1
    fi
  done
fi

printf 'deployment rollback contract: ok\n'

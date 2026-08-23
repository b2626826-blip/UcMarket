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
assert_contains 'google-github-actions/auth@v3'
assert_contains 'google-github-actions/setup-gcloud@v3'
assert_contains 'failure_injection:'
assert_contains 'default: none'
assert_contains 'after_up_before_health'
assert_contains 'validate-inputs:'
assert_contains 'name: Validate deployment inputs'
assert_contains 'permissions: {}'
assert_contains 'needs: validate-inputs'
assert_contains "if: \${{ inputs.failure_injection != 'none' && inputs.environment != 'staging' }}"
assert_contains 'failure_injection is only allowed for environment=staging'
assert_contains "if: \${{ inputs.failure_injection == 'none' || inputs.environment == 'staging' }}"
assert_contains 'deployment_environment='
assert_contains 'if [ \"\$failure_injection\" != none ] && [ \"\$deployment_environment\" != staging ]; then'
assert_contains "echo 'failure injection is only allowed in staging' >&2"
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
assert_contains "Metadata-Flavor: Google"
assert_contains 'docker login'
assert_contains 'docker logout'
assert_contains 'registry_login()'
assert_contains 'pull_images()'
assert_contains "echo 'rollback restored deploy.env image refs:' >&2"
assert_contains "if ! sudo grep -E '^(BACKEND_IMAGE|WEB_IMAGE)=' deploy.env >&2; then"
assert_contains "echo 'rollback could not read restored deploy.env' >&2"
assert_contains "echo 'rollback container images:' >&2"
assert_contains "sudo docker inspect --format '{{.Name}} {{.Config.Image}}' ucmarket-backend-1 ucmarket-web-1 >&2"
assert_contains "echo 'failure injection: after_up_before_health' >&2"

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

injection_line="$(grep -nF "echo 'failure injection: after_up_before_health' >&2" "${workflow}" | cut -d: -f1 | head -n1 || true)"
deploy_up_line="$(grep -nF 'sudo docker compose --env-file deploy.env up -d backend web' "${workflow}" | tail -n1 | cut -d: -f1 || true)"
deploy_health_line="$(grep -nF 'until curl -fsS http://127.0.0.1:8081/api/health' "${workflow}" | tail -n1 | cut -d: -f1 || true)"
if [[ -z "${injection_line}" || -z "${deploy_up_line}" || -z "${deploy_health_line}" ]]; then
  printf 'failure injection ordering markers are missing\n' >&2
  exit 1
fi
if [[ "${injection_line}" -le "${deploy_up_line}" || "${injection_line}" -ge "${deploy_health_line}" ]]; then
  printf 'failure injection must run after deploy up and before deploy health check\n' >&2
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
    GCE_ZONE=probe-zone GCE_INSTANCE=probe-instance GCP_REGION=probe-region GITHUB_SHA=probe-sha \
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
  for expected in 'trap rollback EXIT' 'rollback completed' 'registry_login()' 'pull_images()' \
                  'Metadata-Flavor: Google' 'docker login' 'docker logout'; do
    if ! grep -Fq -- "${expected}" "${probe_dir}/remote.sh"; then
      printf 'remote script lost its rollback contract: %s\n' "${expected}" >&2
      exit 1
    fi
  done

  # 第二道 staging guard 只有在任何副作用之前執行才有意義：晚於 trap／備份／sed 的話，
  # 遠端已經動過 deploy.env 才發現不該部署。文字比對看不出位置，所以比行號。
  guard_line="$(grep -nF 'failure injection is only allowed in staging' "${probe_dir}/remote.sh" | head -n1 | cut -d: -f1 || true)"
  effect_line="$(grep -nE 'trap rollback EXIT|sudo cp deploy\.env|sudo sed -i' "${probe_dir}/remote.sh" | head -n1 | cut -d: -f1 || true)"
  if [[ -z "${guard_line}" ]]; then
    printf 'remote script lost the staging-only failure injection guard\n' >&2
    exit 1
  fi
  if [[ -z "${effect_line}" ]]; then
    printf 'remote script lost the rollback trap and the deploy.env mutation\n' >&2
    exit 1
  fi
  if [[ "${guard_line}" -ge "${effect_line}" ]]; then
    printf 'the staging-only guard must run before the rollback trap and any deploy.env mutation\n' >&2
    exit 1
  fi
fi

# image publish 必須對同一個 commit 具備 idempotency：tag 已發布時要重用既有 digest，
# 不能重 build 再 push（registry 的 tag immutability 會拒絕不同的 manifest）。
# 一樣用實際執行來驗，而不是比對文字。
if [[ -n "${python_bin}" ]]; then
  "${python_bin}" - "${workflow}" "${probe_dir}/publish.sh" <<'PYPUBLISH'
import re, sys, yaml
workflow, out = sys.argv[1], sys.argv[2]
doc = yaml.safe_load(open(workflow, encoding="utf-8"))
step = [s for s in doc["jobs"]["deploy"]["steps"]
        if s.get("name", "").startswith("Build and publish")][0]
run = re.sub(r"\$\{\{[^}]*\}\}", "probe", step["run"])
open(out, "w", encoding="utf-8", newline="\n").write(run)
PYPUBLISH

  # $1/$2: backend / web 的 tag 是否「已經發布過」。registry 以檔案模擬，push 之後
  # 該 tag 就查得到 digest——這樣才能驗到 push 後仍會正確取回 digest。
  publish_probe() {
    rm -f "${probe_dir}/reg-backend" "${probe_dir}/reg-web"
    : > "${probe_dir}/docker.log"
    : > "${probe_dir}/output"
    [[ "$1" == "yes" ]] && printf 'sha256:existingbackend' > "${probe_dir}/reg-backend"
    [[ "$2" == "yes" ]] && printf 'sha256:existingweb' > "${probe_dir}/reg-web"
    (
      gcloud() {
        if [[ "$1" == "artifacts" ]]; then
          case "$*" in
            */backend:*) [[ -f "${probe_dir}/reg-backend" ]] && cat "${probe_dir}/reg-backend" ;;
            */web:*)     [[ -f "${probe_dir}/reg-web" ]] && cat "${probe_dir}/reg-web" ;;
          esac
          return 0
        fi
        return 0
      }
      docker() {
        case "$1" in
          build) printf 'build %s\n' "${*: -2:1}" >> "${probe_dir}/docker.log" ;;
          push)
            printf 'push %s\n' "$2" >> "${probe_dir}/docker.log"
            case "$2" in
              */backend:*) printf 'sha256:builtbackend' > "${probe_dir}/reg-backend" ;;
              */web:*)     printf 'sha256:builtweb'     > "${probe_dir}/reg-web" ;;
            esac
            ;;
        esac
        return 0
      }
      GCP_PROJECT_ID=probe-project GCP_REGION=probe-region ARTIFACT_REPOSITORY=probe-repo \
        GITHUB_SHA=probe-sha GITHUB_OUTPUT="${probe_dir}/output" \
        source "${probe_dir}/publish.sh"
    ) >/dev/null 2>&1
  }

  probe_fail() {
    printf '%s\n  docker calls: %s\n  outputs: %s\n' "$1" \
      "$(tr '\n' ' ' < "${probe_dir}/docker.log")" "$(tr '\n' ' ' < "${probe_dir}/output")" >&2
    exit 1
  }

  # 兩個 tag 都已發布：不得有任何 build 或 push，且必須沿用既有 digest
  publish_probe yes yes || probe_fail 'image publish failed when both tags were already published'
  [[ -s "${probe_dir}/docker.log" ]] && probe_fail 'image publish rebuilt tags that were already published'
  grep -q 'backend=.*@sha256:existingbackend' "${probe_dir}/output" \
    || probe_fail 'image publish did not reuse the published backend digest'
  grep -q 'web=.*@sha256:existingweb' "${probe_dir}/output" \
    || probe_fail 'image publish did not reuse the published web digest'

  # 兩個都未發布：兩個都要 build 並 push
  publish_probe no no || probe_fail 'image publish failed when neither tag was published'
  grep -Fq -- 'push probe-region-docker.pkg.dev/probe-project/probe-repo/backend:probe-sha' "${probe_dir}/docker.log" \
    || probe_fail 'image publish did not publish the backend tag'
  grep -Fq -- 'push probe-region-docker.pkg.dev/probe-project/probe-repo/web:probe-sha' "${probe_dir}/docker.log" \
    || probe_fail 'image publish did not publish the web tag'
  grep -q 'backend=.*@sha256:builtbackend' "${probe_dir}/output" \
    || probe_fail 'image publish did not record the freshly built backend digest'

  # 部分完成：backend 已發布、web 尚未——只能動 web，backend 沿用既有 digest
  publish_probe yes no || probe_fail 'image publish failed on a partially published tag pair'
  grep -Fq -- '/backend:probe-sha' "${probe_dir}/docker.log" \
    && probe_fail 'image publish rebuilt the backend even though its tag was already published'
  grep -Fq -- 'push probe-region-docker.pkg.dev/probe-project/probe-repo/web:probe-sha' "${probe_dir}/docker.log" \
    || probe_fail 'image publish did not publish the missing web tag'
  grep -q 'backend=.*@sha256:existingbackend' "${probe_dir}/output" \
    || probe_fail 'image publish lost the published backend digest while publishing web'
  grep -q 'web=.*@sha256:builtweb' "${probe_dir}/output" \
    || probe_fail 'image publish did not record the freshly built web digest'
fi


# 遠端腳本整段包在 gcloud --command "..." 的雙引號裡，所以裡面每一個 " 都必須跳脫。
# 沒跳脫時 runner 會把外層引號狀態翻掉：引號內有空白就會切碎參數（argc 探針抓得到），
# 沒空白則只是靜默把引號吃掉——secret 因此變成未加引號、會被 word splitting 影響，
# 而 argc 仍然正常。所以這裡直接檢查不變量本身。
unescaped="$("${python_bin:-python}" - "${workflow}" <<'PYQUOTES'
import io, sys
BS, Q = chr(92), chr(34)
lines = io.open(sys.argv[1], encoding="utf-8").read().split("\n")
inside, bad = False, []
for n, line in enumerate(lines, 1):
    if "gcloud compute ssh" in line:
        inside = True
        continue
    if inside and line.strip() == Q:
        inside = False
        continue
    if inside:
        for i, ch in enumerate(line):
            if ch == Q and (i == 0 or line[i - 1] != BS):
                bad.append("%d: %s" % (n, line.strip()))
                break
print("\n".join(bad))
PYQUOTES
)"
if [[ -n "${unescaped}" ]]; then
  printf 'every double quote inside the gcloud --command block must be escaped:\n%s\n' "${unescaped}" >&2
  exit 1
fi


# permissions 與 fail-fast 是 YAML 結構層的不變量：grep 看不出 permissions 掛在哪個 job
# （'permissions: {}' 在任何 job 上都能比中），也看不出 reject step 究竟真的 exit 1，
# 還是只印了一行 ::error:: 就讓整個 run 通過。
permission_problems="$("${python_bin:-python}" - "${workflow}" <<'PYPERMS'
import sys, yaml
doc = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
workflow_permissions = doc.get("permissions")
jobs = doc["jobs"]
problems = []


def effective(job):
    # job 沒宣告 permissions 就繼承 workflow 層的那一份
    return jobs[job].get("permissions", workflow_permissions)


deploy = effective("deploy")
if (not isinstance(deploy, dict)
        or deploy.get("id-token") != "write"
        or deploy.get("contents") != "read"):
    problems.append(
        "deploy must end up with contents: read and id-token: write for WIF, found: %r" % (deploy,))

expected_deploy_if = "${{ inputs.failure_injection == 'none' || inputs.environment == 'staging' }}"
if jobs["deploy"].get("if") != expected_deploy_if:
    problems.append(
        "deploy must skip non-staging failure injection, found if: %r" % (jobs["deploy"].get("if"),))

validator = effective("validate-inputs")
if validator != {}:
    problems.append("validate-inputs must declare empty permissions, found: %r" % (validator,))

reject = [s for s in jobs["validate-inputs"]["steps"]
          if "failure_injection is only allowed" in s.get("run", "")]
if not reject:
    problems.append("validate-inputs never rejects a non-staging failure injection")
elif "exit 1" not in reject[0]["run"]:
    problems.append("the reject step must fail the run, not only log: %r" % (reject[0]["run"],))
elif reject[0].get("if") != "${{ inputs.failure_injection != 'none' && inputs.environment != 'staging' }}":
    problems.append(
        "the reject step must target non-staging failure injection, found if: %r" % (reject[0].get("if"),))

print("\n".join(problems))
PYPERMS
)"
if [[ -n "${permission_problems}" ]]; then
  printf '%s\n' "${permission_problems}" >&2
  exit 1
fi


printf 'deployment rollback contract: ok\n'

#!/usr/bin/env bash
set -euo pipefail

# Only modify disposable GitHub-hosted Linux jobs, never a developer machine.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo "This setup is only for GitHub Actions Linux runners." >&2
  exit 1
fi

# The initial hosted run could not resolve the image's preferred Azure mirror.
# Keep the image's official HTTPS Ubuntu archives and normal signature checks.
sudo --preserve-env=TMPDIR,TMP,TEMP sed -i '/azure\.archive\.ubuntu\.com/d' /etc/apt/apt-mirrors.txt
cat /etc/apt/apt-mirrors.txt

# apt update otherwise succeeds with stale indexes after transient failures.
# A config file also applies these bounds to Playwright's apt subprocess.
printf '%s\n' \
  'APT::Update::Error-Mode "any";' \
  'Acquire::Retries "1";' \
  'Acquire::http::Timeout "30";' \
  'Acquire::https::Timeout "30";' \
  | sudo --preserve-env=TMPDIR,TMP,TEMP tee /etc/apt/apt.conf.d/99eigenvista-ci

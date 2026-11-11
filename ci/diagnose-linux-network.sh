#!/usr/bin/env bash
set -euo pipefail

probe() {
  local context=$1 variable host route status
  local -a curl_options
  printf '\nNetwork probe context: %s\n' "$context"
  for variable in HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY http_proxy https_proxy all_proxy no_proxy; do
    if [[ -n ${!variable:-} ]]; then
      printf '%s: set\n' "$variable"
    else
      printf '%s: unset or empty\n' "$variable"
    fi
  done
  for host in archive.ubuntu.com security.ubuntu.com mirrors.edge.kernel.org packages.microsoft.com; do
    printf '\ngetent: %s\n' "$host"
    if timeout 5s getent ahosts "$host"; then
      printf 'getent exit: 0\n'
    else
      status=$?
      printf 'getent exit: %s\n' "$status"
    fi
    for route in environment direct; do
      curl_options=()
      if [[ $route == direct ]]; then
        curl_options+=(--noproxy '*')
      fi
      printf 'curl: %s (%s)\n' "$host" "$route"
      # Suppress headers and error strings, which may contain proxy values.
      # Only status, timings and exit codes enter the diagnostic artifact.
      if curl --disable --silent --head --location --output /dev/null \
        --connect-timeout 4 --max-time 8 \
        --write-out 'http=%{http_code} dns=%{time_namelookup} connect=%{time_connect} total=%{time_total}\n' \
        "${curl_options[@]}" "https://$host/"; then
        printf 'curl exit: 0\n'
      else
        status=$?
        printf 'curl exit: %s\n' "$status"
      fi
    done
  done
}

if [[ ${1:-} == --probe ]]; then
  probe "${2:?Missing probe context}"
  exit 0
fi
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo "This diagnostic is only for GitHub Actions Linux runners." >&2
  exit 1
fi

script=$(realpath "${BASH_SOURCE[0]}")
probe runner
for account in root _apt; do
  # Feed the script through stdin: the runner's workspace may not be traversable
  # by _apt, and diagnostics must not broaden its filesystem permissions.
  if sudo --preserve-env=TMPDIR,TMP,TEMP -u "$account" bash -s -- --probe "$account" < "$script"; then
    continue
  else
    status=$?
    printf 'Could not run %s probe: exit %s\n' "$account" "$status"
  fi
done

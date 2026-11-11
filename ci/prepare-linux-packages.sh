#!/usr/bin/env bash
set -euo pipefail

# Only modify disposable GitHub-hosted Linux jobs, never a developer machine.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo "This setup is only for GitHub Actions Linux runners." >&2
  exit 1
fi

# Preserve provider-specific sources: the observed AWS image has a working EC2
# mirror, while several Azure jobs could not resolve their Ubuntu mirror hosts.
mirror_list=/etc/apt/apt-mirrors.txt
fallback_uri=https://mirrors.edge.kernel.org/ubuntu/
if [[ -f $mirror_list ]]; then
  preferred_uri=$(awk '
    /^[[:space:]]*#/ || NF == 0 { next }
    {
      priority = 18446744073709551615
      for (i = 2; i <= NF; i++)
        if ($i ~ /^priority:[0-9]+$/) {
          split($i, metadata, ":")
          priority = metadata[2] + 0
        }
      if (!found || priority < best) {
        preferred = $1
        best = priority
        found = 1
      }
    }
    END { print preferred }
  ' "$mirror_list")
  if [[ $preferred_uri =~ ^https?://([a-zA-Z0-9.-]+)(:[0-9]+)?/ ]]; then
    preferred_host=${BASH_REMATCH[1]}
    case "$preferred_host" in
      archive.ubuntu.com|*.archive.ubuntu.com|security.ubuntu.com|mirrors.edge.kernel.org)
        printf 'Preferred Ubuntu package host: %s\n' "$preferred_host"
        if ! timeout 5s getent ahosts "$preferred_host" > /dev/null; then
          echo "Preferred host DNS failed; probing mirrors.edge.kernel.org with normal TLS."
          if ! curl --disable --fail --silent --head --location \
            --connect-timeout 5 --max-time 10 --output /dev/null \
            "${fallback_uri}dists/noble/InRelease"; then
            echo "Kernel.org InRelease probe failed; package setup cannot continue." >&2
            exit 1
          fi
          # APT accepts zero as an explicit priority and tries lower values first.
          # Keep every existing entry/priority; only add the verified fallback.
          if ! awk -v uri="$fallback_uri" '$1 == uri { found = 1 } END { exit !found }' "$mirror_list"; then
            printf '%s\tpriority:0\n' "$fallback_uri" \
              | sudo --preserve-env=TMPDIR,TMP,TEMP tee -a "$mirror_list" > /dev/null
          fi
          echo "Selected DNS fallback package host: mirrors.edge.kernel.org"
        fi
        ;;
      *) echo "Preserving unrecognized provider package sources unchanged." ;;
    esac
  else
    echo "Preserving provider package sources unchanged."
  fi
else
  echo "No image mirrorlist; preserving provider package sources unchanged."
fi

# apt update otherwise succeeds with stale indexes after transient failures.
# A config file also applies these bounds to Playwright's apt subprocess.
printf '%s\n' \
  'APT::Update::Error-Mode "any";' \
  'Acquire::Retries "1";' \
  'Acquire::http::Timeout "30";' \
  'Acquire::https::Timeout "30";' \
  | sudo --preserve-env=TMPDIR,TMP,TEMP tee /etc/apt/apt.conf.d/99eigenvista-ci

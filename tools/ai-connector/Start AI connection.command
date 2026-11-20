#!/bin/bash
# Runs only the installed binaries; no source checkout or development tools.
set -eu
umask 077
export PATH=/usr/bin:/bin:/usr/sbin:/sbin

fail() { printf 'EigenVista AI connection: %s\n' "$*" >&2; exit 1; }
help() {
  printf '%s\n' \
    'Start AI connection.command (macOS) / Start AI connection.sh (Linux)' \
    '  [--workspace DIR] [--input DIR ...]' \
    '' \
    'Starts one new connected EigenVista window in this terminal.' \
    'No compiler, source checkout, Node.js or model installation is needed.' \
    '' \
    'Default workspace: $HOME/Documents/EigenVista' \
    '  Inputs/                         your molecular input files' \
    '  Sessions/session.XXXXXX/Results/ new output files for this session' \
    '' \
    '--workspace DIR  Use a different persistent workspace.' \
    '--input DIR      Also allow an existing input directory; repeat as needed.' \
    '--help           Show this help without starting the app or creating files.' \
    '' \
    'The bundled examples and palettes are always available.' \
    'Inputs remains available when additional --input directories are supplied.' \
    'Existing apps and files are left in place. Keep this terminal open.' \
    'Give your agent the printed session-note filename; never share connection contents.'
}

# Reject symlinks in every component before creating or granting directories.
checked_directory() {
  local candidate="$1" component current=""
  local -a parts=()
  case "$candidate" in /*) ;; *) candidate="$(pwd -P)/$candidate" ;; esac
  case "$candidate" in *$'\n'*|*$'\r'*) fail 'Directory names must not contain line breaks.' ;; esac
  IFS=/ read -r -a parts <<< "$candidate"
  for component in ${parts[@]+"${parts[@]}"}; do
    case "$component" in ''|.) continue ;; ..) fail 'Directory paths must not contain .. traversal.' ;; esac
    current="$current/$component"
    [ ! -L "$current" ] || fail "Symlink directory is not allowed: $current"
    if [ -e "$current" ] && [ ! -d "$current" ]; then fail "Not a directory: $current"; fi
  done
  printf '%s\n' "${current:-/}"
}

workspace="${HOME:?HOME must identify your user folder}/Documents/EigenVista"
workspace_set=false
extra_inputs=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --help) help; exit 0 ;;
    --workspace)
      [ "$#" -ge 2 ] && [ -n "$2" ] || fail '--workspace needs a directory.'
      [ "$workspace_set" = false ] || fail 'Specify --workspace only once.'
      workspace="$2"; workspace_set=true; shift 2 ;;
    --input)
      [ "$#" -ge 2 ] && [ -n "$2" ] || fail '--input needs a directory.'
      extra_inputs+=("$2"); shift 2 ;;
    *) fail "Unknown argument: $1 (use --help)." ;;
  esac
done

[ ! -L "$0" ] || fail 'Run the launcher inside the installed EigenVista package, not a symlink to it.'
script_dir="$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd -P)"
case "$script_dir" in
  */Contents/Resources/AI-connector)
    contents="$(CDPATH= cd -P -- "$script_dir/../.." && pwd -P)"
    bundle="$(dirname -- "$contents")"
    case "$bundle" in *.app) ;; *) fail 'Keep this launcher inside EigenVista.app/Contents/Resources/AI-connector.' ;; esac
    desktop="$contents/MacOS/eigenvista-desktop"
    client="$contents/MacOS/eigenvista-ctl"
    ;;
  */share/eigenvista/AI-connector)
    bundle="$(CDPATH= cd -P -- "$script_dir/../../.." && pwd -P)"
    desktop="$bundle/bin/eigenvista"
    client="$bundle/bin/eigenvista-ctl"
    ;;
  *) fail 'Keep this launcher inside the installed EigenVista app or Linux package.' ;;
esac
for executable in "$desktop" "$client"; do
  [ -f "$executable" ] && [ -x "$executable" ] && [ ! -L "$executable" ] || fail "Missing bundled executable: $executable"
done
for directory in "$script_dir/examples" "$script_dir/palettes"; do
  [ -d "$directory" ] || fail "Missing bundled input directory: $directory"
  checked_directory "$directory" >/dev/null
done

workspace="$(checked_directory "$workspace")"
inputs="$workspace/Inputs"
sessions="$workspace/Sessions"
checked_directory "$inputs" >/dev/null
checked_directory "$sessions" >/dev/null
approved=("$inputs" "$script_dir/examples" "$script_dir/palettes")
for directory in ${extra_inputs[@]+"${extra_inputs[@]}"}; do
  directory="$(checked_directory "$directory")"
  [ -d "$directory" ] || fail "Input directory does not exist: $directory"
  found=false
  for existing in "${approved[@]}"; do [ "$directory" != "$existing" ] || found=true; done
  if [ "$found" = false ]; then approved+=("$directory"); fi
done
mkdir -p -- "$inputs" "$sessions"
session="$(mktemp -d "$sessions/session.XXXXXX")"
chmod 700 "$session"
results="$session/Results"
mkdir -m 700 "$results" "$session/Temporary"
export TMPDIR="$session/Temporary" TMP="$session/Temporary" TEMP="$session/Temporary"
connection="$session/connection.json"
[ ! -e "$connection" ] && [ ! -L "$connection" ] || fail 'The fresh connection destination already exists.'
note="$session/session-note.txt"
set -o noclobber
{
  printf '%s\n' 'EigenVista AI connection (nonsecret paths only)'
  printf 'App: %s\nClient: %s\nConnection file: %s\nInstructions: %s\n' "$bundle" "$client" "$connection" "$script_dir/SKILL.md"
  for directory in "${approved[@]}"; do printf 'Input folder: %s\n' "$directory"; done
  printf 'Output folder: %s\n' "$results"
} > "$note"
printf 'EigenVista app: %s\nControl client: %s\nConnection file: %s\nAgent instructions: %s\n' "$bundle" "$client" "$connection" "$script_dir/SKILL.md"
for directory in "${approved[@]}"; do printf 'Input folder: %s\n' "$directory"; done
printf 'Output folder: %s\nSession note: %s\n' "$results" "$note"
printf '%s\n' 'Keep this terminal open. Give your agent these paths, never the connection file contents.'
arguments=(--control-file "$connection")
for directory in "${approved[@]}" "$results"; do arguments+=(--control-root "$directory"); done
exec "$desktop" "${arguments[@]}"

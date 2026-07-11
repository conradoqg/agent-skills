#!/usr/bin/env bash
# Launch Windows Chrome with the remote-debugging endpoint that the
# chrome-devtools MCP attaches to, from inside WSL2.
#
# Usage:
#   launch-chrome-debug.sh [temp|active] [URL]
#
# Arguments:
#   mode  temp   -> isolated throwaway profile (default). Clean state, safe.
#         active -> your real Chrome profile. Keeps logins/cookies/extensions.
#   URL   page to open (default: about:blank)
#
# Environment overrides:
#   CHROME_DEBUG_PORT   debugging port (default: 9222)
#   CHROME_EXE          explicit path to chrome.exe
#   CHROME_TEMP_PROFILE Windows path for the temp profile
#                       (default: C:\Temp\chrome-debug-profile)
#   CHROME_FORCE_CLOSE  set to 1 to auto-close running Chrome in active mode
#
# Exit codes: 0 ready | 1 usage/env error | 2 chrome not found | 3 timeout
set -euo pipefail

MODE="${1:-temp}"
URL="${2:-about:blank}"
PORT="${CHROME_DEBUG_PORT:-9222}"

log()  { printf '%s\n' "$*" >&2; }
die()  { log "error: $*"; exit "${2:-1}"; }

endpoint_up() {
  curl -s --connect-timeout 3 "http://localhost:${PORT}/json/version" >/dev/null 2>&1
}

# --- 1. Confirm we are on WSL2 ------------------------------------------------
if ! { grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null || [ -n "${WSL_DISTRO_NAME:-}" ]; }; then
  die "this script targets WSL2. On native Linux, launch google-chrome directly with --remote-debugging-port=${PORT}."
fi

# --- 2. If a debuggable Chrome is already listening, reuse it ------------------
if endpoint_up; then
  log "Chrome debugging endpoint already available on http://localhost:${PORT}. Reusing it."
  exit 0
fi

# --- 3. Locate chrome.exe -----------------------------------------------------
find_chrome() {
  if [ -n "${CHROME_EXE:-}" ] && [ -x "${CHROME_EXE}" ]; then
    printf '%s' "${CHROME_EXE}"; return 0
  fi
  local c
  for c in \
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
    [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}
CHROME="$(find_chrome)" || die "chrome.exe not found. Set CHROME_EXE to its path." 2

# --- 4. Resolve the user-data-dir per mode ------------------------------------
case "$MODE" in
  temp)
    USER_DATA_DIR="${CHROME_TEMP_PROFILE:-C:\\Temp\\chrome-debug-profile}"
    log "Mode: temp  -> isolated profile at ${USER_DATA_DIR}"
    ;;
  active)
    # Resolve the Windows username without the UNC-path warning cmd.exe emits
    # when the working directory is a Linux path.
    WIN_USER="$(cd /mnt/c && cmd.exe /c 'echo %USERNAME%' 2>/dev/null | tr -d '\r\n')"
    [ -n "$WIN_USER" ] || die "could not resolve Windows username for the active profile."
    USER_DATA_DIR="C:\\Users\\${WIN_USER}\\AppData\\Local\\Google\\Chrome\\User Data"
    log "Mode: active -> live profile at ${USER_DATA_DIR}"

    # Chrome cannot enable remote debugging on a profile that another Chrome
    # process is already using. Detect and handle a running instance.
    if tasklist.exe 2>/dev/null | grep -qi 'chrome.exe'; then
      if [ "${CHROME_FORCE_CLOSE:-0}" = "1" ]; then
        log "Closing running Chrome instances (CHROME_FORCE_CLOSE=1)..."
        taskkill.exe /IM chrome.exe /F >/dev/null 2>&1 || true
        sleep 2
      else
        die "Chrome is already running with the live profile. Close ALL Chrome windows first, or re-run with CHROME_FORCE_CLOSE=1 to close them automatically."
      fi
    fi
    ;;
  *)
    die "unknown mode '${MODE}'. Use 'temp' or 'active'."
    ;;
esac

# --- 5. Launch Chrome detached ------------------------------------------------
log "Launching: ${CHROME##*/} --remote-debugging-port=${PORT}"
nohup "$CHROME" \
  --remote-debugging-port="${PORT}" \
  --user-data-dir="${USER_DATA_DIR}" \
  --no-first-run \
  --no-default-browser-check \
  "$URL" >/dev/null 2>&1 &
disown || true

# --- 6. Wait for the endpoint to come up --------------------------------------
for _ in $(seq 1 20); do
  if endpoint_up; then
    log "Ready. chrome-devtools MCP can attach to http://localhost:${PORT}."
    exit 0
  fi
  sleep 1
done

die "timed out waiting for http://localhost:${PORT}. See references/troubleshooting.md (WSL2 networking / firewall)." 3

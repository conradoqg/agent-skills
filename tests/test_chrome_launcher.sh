#!/usr/bin/env bash
set -euo pipefail

script="skills/chrome-devtools-wsl2/scripts/launch-chrome-debug.sh"
bash -n "$script"

if CHROME_DEBUG_PORT=0 bash "$script" invalid-mode about:blank >/dev/null 2>&1; then
  echo "expected the launcher to reject an invalid mode" >&2
  exit 1
fi

echo "chrome launcher checks passed"

#!/usr/bin/env bash
# Double-click in Finder to start the server and open the default browser.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

rm -f "$ROOT/prospectus-port.txt"

osascript -e 'tell application "Terminal" to do script "cd '"'"''"$ROOT"''"'"' && ./start-prospectus-ui.sh"' >/dev/null 2>&1 || {
  # Fallback if Terminal automation is denied: run in background and log.
  nohup "$ROOT/start-prospectus-ui.sh" > "$ROOT/prospectus-server.log" 2>&1 &
}

for _ in $(seq 1 60); do
  if [[ -f "$ROOT/prospectus-port.txt" ]]; then
    PORT="$(tr -d '[:space:]' < "$ROOT/prospectus-port.txt")"
    if [[ -n "$PORT" ]]; then
      open "http://127.0.0.1:${PORT}/workspace"
      exit 0
    fi
  fi
  sleep 1
done

open "http://127.0.0.1:3000/workspace"

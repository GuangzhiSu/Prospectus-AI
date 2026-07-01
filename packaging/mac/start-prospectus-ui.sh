#!/usr/bin/env bash
# Start the Prospectus AI local web server (Next.js standalone + Python agents).
# Used by the Mac portable bundle; expects node/ and venv/ beside this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export PROSPECTUS_ROOT="$ROOT"

if [[ ! -f "$ROOT/ensure-python-venv.sh" ]]; then
  echo "ERROR: Missing ensure-python-venv.sh next to this file." >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$ROOT/ensure-python-venv.sh"

export AGENT1_PYTHON="$ROOT/venv/bin/python3"
export PATH="$ROOT/venv/bin:$PATH"

NEXT_ROOT=""
if [[ -f "$ROOT/web/server.js" ]]; then
  NEXT_ROOT="$ROOT/web"
elif [[ -f "$ROOT/server.js" ]]; then
  NEXT_ROOT="$ROOT"
else
  echo "ERROR: web/server.js not found." >&2
  exit 1
fi

export HOSTNAME="${HOSTNAME:-127.0.0.1}"

find_free_port() {
  if [[ -n "${PORT:-}" ]]; then
    echo "$PORT"
    return 0
  fi
  "$AGENT1_PYTHON" - <<'PY'
import socket
for port in range(3000, 3100):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", port))
        print(port)
        break
    except OSError:
        pass
    finally:
        s.close()
else:
    raise SystemExit("No free TCP port from 3000 to 3099 on 127.0.0.1")
PY
}

PORT="$(find_free_port)"
export PORT

NODE_EXE=""
if [[ -x "$ROOT/node/bin/node" ]]; then
  NODE_EXE="$ROOT/node/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_EXE="$(command -v node)"
else
  echo "ERROR: node not found in node/bin/ and not on PATH." >&2
  exit 1
fi

echo "PROSPECTUS_ROOT=$PROSPECTUS_ROOT"
echo "Starting http://${HOSTNAME}:${PORT}"
echo "$PORT" > "$ROOT/prospectus-port.txt"
echo "Open http://127.0.0.1:${PORT}/workspace in your browser. Press Ctrl+C to stop."
cd "$NEXT_ROOT"
exec "$NODE_EXE" server.js

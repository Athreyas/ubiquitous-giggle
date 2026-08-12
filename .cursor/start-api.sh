#!/usr/bin/env bash
# Start the Warren sync API (Hono on :8787).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
. "$REPO_ROOT/.cursor/env-common.sh"

cd "$REPO_ROOT/apps/api"
if [ ! -d node_modules ]; then
  npm install
fi
exec npm run dev

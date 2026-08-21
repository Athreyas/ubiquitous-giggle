#!/usr/bin/env bash
# Warren Vite client — demo mode works offline; sign in against apps/api for sync.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
. "$REPO_ROOT/.cursor/env-common.sh"

cd "$REPO_ROOT/apps/warren"
exec npm run dev -- --host 127.0.0.1

#!/usr/bin/env bash
# Idempotent dependency bootstrap for Daymark (client + API).
# Safe to run repeatedly (used as the Cloud Agent `install` step).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- Node 24 + corepack ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "== Installing nvm =="
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

echo "== Installing Node 24 =="
nvm install 24
nvm alias default 24
PATH="$(dirname "$(nvm which 24)"):$PATH"
export PATH
corepack enable
echo "node: $(node -v)"

# --- Daymark client ---
echo "== Daymark client: npm install =="
( cd apps/daymark && npm install )

# --- Daymark API (guarded for branches that lack it yet) ---
if [ -f apps/api/package.json ]; then
  echo "== Daymark API: npm install =="
  ( cd apps/api && npm install )
else
  echo "== Daymark API: skipped (apps/api not present on this revision) =="
fi

echo "== Install complete =="

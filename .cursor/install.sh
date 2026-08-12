#!/usr/bin/env bash
# Idempotent dependency bootstrap for the Daykeep + Daymark monorepo.
# Safe to run repeatedly (used as the Cloud Agent `install` step).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- Node 24 (daykeep/.nvmrc) + pnpm 11.2.1 (daykeep/package.json) ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "== Installing nvm =="
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

echo "== Installing Node $(cat daykeep/.nvmrc) =="
nvm install 24
nvm alias default 24
PATH="$(dirname "$(nvm which 24)"):$PATH"
export PATH
corepack enable
corepack prepare pnpm@11.2.1 --activate
echo "node: $(node -v) | pnpm: $(pnpm -v)"

# --- Daymark (Vite + React SPA, the daily-memory USP) ---
echo "== Daymark: npm install =="
( cd apps/daymark && npm install )

# --- Daykeep (Karakeep soft-fork monorepo) ---
echo "== Daykeep: pnpm install =="
( cd daykeep && pnpm install --frozen-lockfile )

# --- Daykeep local config + SQLite database ---
echo "== Daykeep: env + database migration =="
cd "$REPO_ROOT/daykeep"
mkdir -p .data
if [ ! -f .env ]; then
  cat > .env <<EOF
DATA_DIR=$REPO_ROOT/daykeep/.data
NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEXTAUTH_URL=http://localhost:3000
NO_COLOR=false
EOF
  echo "Wrote daykeep/.env (generated NEXTAUTH_SECRET)."
fi
set -a
# shellcheck disable=SC1091
. ./.env
set +a
export NO_COLOR=false
pnpm run db:migrate

echo "== Install complete =="

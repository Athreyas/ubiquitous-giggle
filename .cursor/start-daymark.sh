#!/usr/bin/env bash
# Daymark dev server (Vite) — the daily-memory USP. Runs in demo mode out of
# the box (no backend required); connect a Daykeep instance from its Settings.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
. "$REPO_ROOT/.cursor/env-common.sh"

cd "$REPO_ROOT/apps/daymark"
exec npm run dev

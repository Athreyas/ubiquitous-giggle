#!/usr/bin/env bash
# Daykeep background workers (crawler, inference, search indexing, feeds,
# webhooks, rule engine, backups). Runs against the local SQLite database.
# Optional external services (Meilisearch full-text search on :7700, headless
# Chrome crawling on :9222) are not required — workers run in browserless mode.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
. "$REPO_ROOT/.cursor/env-common.sh"

cd "$REPO_ROOT/daykeep"
set -a
# shellcheck disable=SC1091
. ./.env
set +a
export NO_COLOR=false

exec pnpm workers

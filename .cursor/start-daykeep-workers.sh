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

# Use the non-watch entrypoint (start:prod = `tsx index.ts`). The default
# `pnpm workers` uses `tsx watch`, whose reload/teardown intermittently trips a
# better-sqlite3 native cleanup-hook assertion on Node 24 during startup. The
# non-watch process starts reliably; restart this terminal to pick up changes.
exec pnpm --filter @karakeep/workers run start:prod

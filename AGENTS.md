# AGENTS.md

## Cursor Cloud specific instructions

Daymark is a standalone Vite + React client (`apps/daymark`) plus a Hono sync API (`apps/api`). The former AGPL soft-fork tree has been removed.

### Services

| Service | Command | URL |
|---------|---------|-----|
| Daymark client | `bash .cursor/start-daymark.sh` (or `cd apps/daymark && npm run dev`) | `http://127.0.0.1:5173/` |
| Daymark API | `bash .cursor/start-api.sh` (or `cd apps/api && npm run dev`) | `http://127.0.0.1:8787/` |

Demo mode in the client works **without** the API. Synced library / auth requires the API.

### Lint / test / build

- Client: `cd apps/daymark && npm run lint && npm run build` (and `npm test` when present)
- API: `cd apps/api && npm run lint && npm test`

### Gotchas

- Cloud shells may ship Node 22 on PATH; `.cursor/env-common.sh` / `install.sh` pin **Node 24** via nvm — source that before running services.
- API SQLite data lives in `apps/api/.data/` (gitignored).
- Do not reintroduce AGPL soft-fork packages or attribution into this tree.

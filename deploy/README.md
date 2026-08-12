# Warren deploy notes

The previous AGPL Docker library stack has been removed.

## Local development (recommended)

```bash
cd apps/api && npm install && npm run dev    # http://127.0.0.1:8787
cd apps/warren && npm install && npm run dev # http://127.0.0.1:5173
```

## Production

Containerize `apps/api` (Node 24) with a mounted volume for SQLite, or point
Drizzle at Postgres when ready. A Compose file for production will land with
the hardened cloud-sync epic; until then use the local API.

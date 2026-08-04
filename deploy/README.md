# Phase 0 — Deploy stock Karakeep

```bash
cd deploy
cp .env.example .env
openssl rand -base64 36   # NEXTAUTH_SECRET
openssl rand -base64 36   # MEILI_MASTER_KEY
docker compose up -d
```

Then open Daymark (`apps/daymark`), disable demo mode, and paste your Karakeep URL + API key (Settings → API Keys).

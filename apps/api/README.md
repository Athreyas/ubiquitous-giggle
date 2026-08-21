# Warren API

Standalone sync API for Warren. It stores auth, saves, and surfacing state in a
local SQLite database at `.data/warren.sqlite`.

## Requirements

- Node.js 24+
- npm

## Install

```bash
npm install
```

## Run

```bash
npm run db:migrate
npm run dev
```

The API listens on `http://127.0.0.1:8787` by default. Set `PORT` to override it.
CORS allows the Warren Vite origins `http://127.0.0.1:5173` and
`http://localhost:5173`.

## Scripts

- `npm run dev` - run the Hono server with `tsx watch`
- `npm start` - run the Hono server once with `tsx`
- `npm run db:migrate` - create/update local SQLite tables
- `npm run lint` - run TypeScript with `--noEmit`
- `npm test` - run vitest

## Endpoints

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/sync/stream`
- `GET /api/v1/saves`
- `POST /api/v1/saves`
- `POST /api/v1/saves/batch`
- `GET /api/v1/saves/:id`
- `PATCH /api/v1/saves/:id`
- `DELETE /api/v1/saves/:id`
- `POST /api/v1/saves/:id/links`
- `GET /api/v1/saves/:id/links`
- `GET /api/v1/surfacing`
- `PUT /api/v1/surfacing`
- `POST /api/v1/surfacing/events`

OAuth is scaffolded but not fully wired (MARK-2). Routes:

- `GET /api/v1/auth/oauth/:provider/start` (`google` | `apple`) — returns **501** until
  provider secrets are set (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` or
  `APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET`), then still 501 until the redirect flow lands.
- `POST /api/v1/auth/oauth/:provider/callback` — stub (501).

Local email/password sessions and rotating refresh tokens require no provider keys.

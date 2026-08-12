# Warren

Everything, all connected, a place you return to.

Warren is a living-memory app for things you save and almost forget — a daily resurfacing overlay plus a calm library for links, notes, screenshots, and imports.

| Piece | Role |
|-------|------|
| **Warren** (`apps/warren/`) | Vite + React client — Memories, Library, Capture, Import |
| **API** (`apps/api/`) | Hono + Drizzle sync backend — auth, saves, surfacing state |
| **Docs** (`docs/`) | Product plans and UI inspiration notes |

## Quick start (demo, offline)

```bash
cd apps/warren && npm install && npm run dev
```

Open `http://127.0.0.1:5173/` — demo library works with no backend.

## Full local stack (synced library)

```bash
# Terminal 1 — API (default http://127.0.0.1:8787)
cd apps/api && npm install && npm run dev

# Terminal 2 — client
cd apps/warren && npm install && npm run dev
```

In Settings, turn off demo mode, register/sign in, and saves + surfacing state sync through the API.

## License

MIT — see [`LICENSE`](./LICENSE).

## Cloud Agent notes

See [`AGENTS.md`](./AGENTS.md) for Cursor Cloud specifics. Install/bootstrap lives in [`.cursor/install.sh`](./.cursor/install.sh).

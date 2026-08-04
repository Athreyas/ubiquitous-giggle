# Daykeep + Daymark

Private second-brain stack:

| Piece | Role |
|-------|------|
| **Daykeep** (`daykeep/`) | Soft-fork of [Karakeep](https://github.com/karakeep-app/karakeep) — capture, auth, search, AI tags. UI rebranded; AGPL attribution kept. |
| **Daymark** (`apps/daymark/`) | **USP** — daily memory overlay that resurfaces forgotten saves |
| **Deploy** (`deploy/`) | Docker Compose for the library backend |

## Demo screenshots

See [`docs/demo/`](docs/demo/) — Today's memory overlay, shuffle, library grid, connect settings.

## Legal

Daykeep is based on Karakeep (AGPL-3.0). See [`daykeep/LICENSE`](daykeep/LICENSE) and [`daykeep/ATTRIBUTION.md`](daykeep/ATTRIBUTION.md).  
Daykeep / Daymark branding is independent — this is not an official Karakeep product.

## Run Daymark demo

```bash
cd apps/daymark && npm install && npm run dev
```

## GitHub push

This cloud environment has **no GitHub credentials**. To publish:

```bash
export GH_TOKEN=ghp_your_token   # repo + workflow scopes
gh auth login --with-token <<< "$GH_TOKEN"
gh repo create daykeep --private --source=. --remote=origin --push
```

Or reconnect this agent from a Cursor surface with GitHub linked.

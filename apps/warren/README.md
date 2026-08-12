# Warren

Everything, all connected, a place you return to.

Each day, Warren picks 1–2 forgotten saves from your synced library (or a demo set) and
presents them as calm memory cards: visual, summary, age, tags, and a one-tap reopen.

## Run

```bash
npm install
npm run dev
```

Demo mode works fully offline — no server required.

## Connect the Warren API

1. Run the API from `../api` (defaults to `http://127.0.0.1:8787`)
2. In Warren → Settings, turn off demo mode
3. Sign in / create an account, or paste an API token, then Save

## Selection (v1)

- Prefer items older than 7 days, not surfaced in the last 14 days
- Prefer rich summaries/notes and never-reopened items
- Stable picks per calendar day; “Show different ones” reshuffles with a salt

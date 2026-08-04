# Daymark

Daily Memory — the USP for this second brain.

Each day, Daymark picks 1–2 forgotten saves from your Karakeep library (or a demo set) and presents them as calm memory cards: visual, summary, age, tags, and a one-tap reopen.

## Run

```bash
npm install
npm run dev
```

## Connect Karakeep

1. Deploy Karakeep from `../../deploy`
2. Create an API key in Karakeep → Settings → API Keys
3. In Daymark → Connect Karakeep, paste URL + key and turn off demo mode

## Selection (v1)

- Prefer items older than 7 days, not surfaced in the last 14 days
- Prefer rich summaries/notes and never-reopened items
- Stable picks per calendar day; “Show different ones” reshuffles with a salt

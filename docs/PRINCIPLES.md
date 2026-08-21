# Warren product principles

Standing constraints for product and engineering. Prefer these over inventing new ranking systems.

## No decay (MARK-9)

- **Dismissed ≠ gone forever.** “Not today” only hides an item from today’s Daily Echo.
- Do **not** use spaced-repetition decay (SM-2 style) that permanently lowers eligibility based on cumulative dismissals.
- A **recency cooldown** after resurfacing (e.g. ~14 days) is fine.
- Scoring must not punish items for having been dismissed in the past.

## Calm over dashboard

- Daily Echo’s first viewport: brand + today’s Stars only — no stat strips.

## Server as source of truth when signed in

- Synced mode: API owns saves and surfacing; client caches optimistically.

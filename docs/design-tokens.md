# Warren design tokens — MARK-14 proposal

**Status:** awaiting founder approval before rolling out beyond Daily Echo  
**Direction:** [fabric.so](https://fabric.so) — clean, spacious, premium SaaS. Soft neutrals, generous whitespace, restrained color, calm motion.  
**Rejects:** dark purple aurora, glossy photo-card stacks, dashboard clutter on first paint.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#F4F3EF` | App canvas (warm paper, not cream-terracotta cliché) |
| `--surface` | `#FFFFFF` | Cards / sheets |
| `--surface-muted` | `#ECEAE4` | Secondary wells, rail |
| `--ink` | `#141414` | Primary text |
| `--ink-soft` | `#5C5A55` | Secondary text |
| `--ink-dim` | `#8A877F` | Meta / timestamps |
| `--line` | `rgba(20,20,20,0.08)` | Hairlines |
| `--accent` | `#1F4B3F` | Single brand accent (deep forest — “warren”) |
| `--accent-soft` | `#E4EEEA` | Accent wash / selected chips |
| `--focus` | `#1F4B3F` | Focus rings |

No multi-stop hero gradients. Accent is flat and rare.

## Typography

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Newsreader** | Distinctive serif for Daily Echo title only |
| UI / body | **Inter** | Proven legibility |
| Meta | Inter, tabular where useful | Timestamps / tags — no forced mono |

## Layout

- Max content width ~920px on Daily Echo; generous side padding
- Card radius `18px`; buttons `999px` only for true chips, else `12px`
- First viewport of Daily Echo: **brand + today + cards only** (no stats)

## Texture

- Faint **dot-grid** (Pattern Monster–style SVG) at ~4% opacity on `--bg`
- No ambient particle fields / aurora blobs

## Icons

- **Iconify → Lucide** only (`@iconify/react` + `lucide:` prefix)
- Stroke 1.75, optical size 18–20

## Logo

- Geometric **Warren mark**: nested arcs / burrow “W” in single ink stroke (SVG), no gradient orb
- Wordmark “Warren” beside mark; tagline only on marketing/README, not cluttering Echo chrome

## Signature motion (lexicon-tied)

| Lexicon | Motion | Timing |
| --- | --- | --- |
| **Star open** | Shared-element / layoutId card → detail | spring, reduced-motion = instant |
| **Dismiss** | Soft slide away — **not** greyed/struck (no-decay) | 280ms ease-out |
| **Arc** *(later Sky)* | SVG stroke-dash draw | 350ms ease-out |
| **Drift** *(later)* | ±3px idle loop when unpinned | 8s; off when pinned |

Daily Echo ships Star open + dismiss + reduced-motion first. Arc / Sky / Drift wait for sign-off.

## Component base

- **shadcn-style** primitives (Button, Card, Badge) via Tailwind + CVA — same API shape as shadcn
- Watermelon / daisy only as pattern references, restyled to these tokens

## Approval checkpoint

Please reply on [MARK-14](https://linear.app/37nw/issue/MARK-14) with **approve / revise**.  
Until approved, only **Daily Echo** is rebuilt to this spec; Library / Sky stay transitional.

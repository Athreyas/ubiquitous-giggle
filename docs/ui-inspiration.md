# UI inspiration — core memory

A curated, approved toolbox for building UI across our projects (Daymark,
Daykeep, and future cloud projects). This is the human-readable copy of the
always-on Cursor rule at [`.cursor/rules/ui-inspiration.mdc`](../.cursor/rules/ui-inspiration.mdc),
which is what AI agents automatically read.

**How to use:** match the task to the resource, prefer these before inventing
from scratch, and prefer MCP-enabled tools when their server is available.

## Components & UI libraries

| Resource | Link | Use when |
| --- | --- | --- |
| **shadcn/ui** | https://ui.shadcn.com | Default for building front-end components — accessible React + Radix + Tailwind, copy-paste + CLI. |
| **Watermelon UI** | https://ui.watermelon.sh | General UI component building — open-source, copy-paste, no strings attached. |
| **daisyUI (Blueprint)** | https://daisyui.com/blueprint/ | Tailwind component library; **has an MCP server** — interact via MCP for elements. |
| **HorizonX** | https://horizonx.so | Premium UI & code library with templates — starting layouts. |
| **OriginKit** | https://www.originkit.dev | Animated components for Framer/React, **via MCP** — animated backgrounds & UI. |

## Backgrounds & patterns

| Resource | Link | Use when |
| --- | --- | --- |
| **Pattern Monster** | https://pattern.monster | Custom SVG patterns/objects/backgrounds. |
| **Pryzm** | https://pryzm.design | A unique, one-off background in seconds. |

## Icons

| Resource | Link | Use when |
| --- | --- | --- |
| **Iconify** | https://iconify.design | Default source for icons — thousands of open-source sets. |

## Fonts & typography

| Resource | Link | Use when |
| --- | --- | --- |
| **Not Your Type** | https://www.notyourtype.nl/typefaces/ | Uncommon typefaces + font builder — distinctive typography. |

## Logos & brand

| Resource | Link | Use when |
| --- | --- | --- |
| **Logo Diffusion** | https://logodiffusion.com | Turn prompts/sketches/images into polished logos. |

## Image / poster / character generation

| Resource | Link | Use when |
| --- | --- | --- |
| **Ideogram** | https://ideogram.ai | Fancy posters, character art, placeholders (great text-in-image). |
| **Krea** | https://www.krea.ai | Generate/enhance/edit images, video, or 3D from existing info. |

## Animation & motion

| Resource | Link | Use when |
| --- | --- | --- |
| **Casberry Particles** | https://particles.casberry.in | Animations, movement, flow, dynamic motion; AI prompt generator. |
| **OriginKit** | https://www.originkit.dev | Animated components/backgrounds (via MCP). |

## Effects & stylization

| Resource | Link | Use when |
| --- | --- | --- |
| **Ditther** | https://www.ditther.com | Dither / ASCII / halftone effects for images & video (pixel-art). |

## Notes

- **Daymark stack:** React 19 + Vite + Motion (framer) with a hand-authored
  dark, cinematic CSS design system (aurora accent, glass, Fraunces display +
  Inter UI). It does **not** use Tailwind yet — shadcn / daisyUI / Watermelon
  are Tailwind-based, so adopting their components means adding Tailwind first,
  or porting the markup and restyling with the existing tokens.
- **Licensing:** verify each tool's license before shipping generated
  logos/art or bundling downloaded assets.
- **Maintenance:** when you find a new tool, add it here **and** in the
  `.cursor/rules/ui-inspiration.mdc` rule so agents keep seeing it.

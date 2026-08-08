import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export const IconSparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.9 2.2L22 18l-2.1.8L19 21l-.9-2.2L16 18l2.1-.8z" />
  </svg>
)

export const IconLibrary = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="7" height="16" rx="1.6" />
    <rect x="13.5" y="4" width="7" height="16" rx="1.6" />
    <path d="M6.5 8h0M17 8h0" />
  </svg>
)

export const IconGear = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
  </svg>
)

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.2-3.2" />
  </svg>
)

export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const IconExternal = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 5h5v5M19 5l-8 8" />
    <path d="M18 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18V9a1.5 1.5 0 0 1 1.5-1.5H12" />
  </svg>
)

export const IconShuffle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
    <path d="M3 7h4c2 0 3 1.5 4.5 3.5S14.5 17 17 17h4M3 17h4c1.2 0 2.1-.5 3-1.4M21 7h-4c-1.2 0-2.1.5-3 1.4" />
  </svg>
)

export const IconArrow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconImport = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v11M8 10l4 4 4-4" />
    <path d="M5 15v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-3" />
  </svg>
)

export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 16V5M8 9l4-4 4 4" />
    <path d="M5 15v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-3" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export const IconGlobe = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
  </svg>
)

export const IconBook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H5.5A1.5 1.5 0 0 1 4 15.9z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6h5.9A1.5 1.5 0 0 0 20 15.9z" />
  </svg>
)

/* ---- Platform glyphs (small, drawn to fit a 24-box) ---- */

export const GlyphPlay = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M9 7.5v9l7-4.5z" />
  </svg>
)

export const GlyphCamera = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="6" width="17" height="14" rx="4" />
    <circle cx="12" cy="13" r="3.4" />
    <circle cx="17" cy="9.5" r="0.6" fill="currentColor" />
  </svg>
)

export const GlyphMusic = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 18V6l9-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="15.5" cy="16" r="2.5" />
  </svg>
)

export const GlyphDoc = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3.5h8L18.5 8v12.5A1 1 0 0 1 17.5 21h-11a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M13.5 3.5V8h5M8.5 12.5h7M8.5 16h7" />
  </svg>
)

export const GlyphNote = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4.5h14v10l-4.5 4.5H5z" />
    <path d="M19 14.5h-3a1 1 0 0 0-1 1v3M8.5 9h7M8.5 12h4" />
  </svg>
)

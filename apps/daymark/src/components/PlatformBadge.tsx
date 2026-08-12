import type { Platform } from '../types'
import { platformMeta } from '../lib/platform'

export function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = platformMeta(platform)
  const Glyph = meta.glyph
  return (
    <span className="pill">
      <span className="dot" style={{ background: meta.swatch }}>
        <Glyph width={12} height={12} />
      </span>
      {meta.label}
    </span>
  )
}

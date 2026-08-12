import type { Platform } from '../types'
import { platformMeta } from '../lib/platform'

export function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = platformMeta(platform)
  const Glyph = meta.glyph
  return (
    <span className="badge">
      <Glyph />
      {meta.label}
    </span>
  )
}

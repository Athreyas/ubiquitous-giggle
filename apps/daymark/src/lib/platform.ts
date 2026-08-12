import type { ComponentType, SVGProps } from 'react'
import type { Platform } from '../types'
import {
  GlyphCamera,
  GlyphDoc,
  GlyphImage,
  GlyphMusic,
  GlyphNote,
  GlyphPlay,
} from '../components/Icons'

export function detectPlatform(url?: string, type?: string): Platform {
  if (type === 'text' || !url) return 'note'
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube'
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('tiktok.com')) return 'tiktok'
    return 'article'
  } catch {
    return 'other'
  }
}

export function platformLabel(platform: Platform): string {
  switch (platform) {
    case 'youtube':
      return 'YouTube'
    case 'instagram':
      return 'Instagram'
    case 'tiktok':
      return 'TikTok'
    case 'article':
      return 'Article'
    case 'note':
      return 'Note'
    case 'image':
      return 'Screenshot'
    default:
      return 'Saved'
  }
}

export interface PlatformMeta {
  label: string
  /** Background for the badge dot */
  swatch: string
  glyph: ComponentType<SVGProps<SVGSVGElement>>
}

export function platformMeta(platform: Platform): PlatformMeta {
  switch (platform) {
    case 'youtube':
      return { label: 'YouTube', swatch: '#ff4e45', glyph: GlyphPlay }
    case 'instagram':
      return {
        label: 'Instagram',
        swatch: 'linear-gradient(135deg,#f9a03c,#dd2a7b 55%,#8134af)',
        glyph: GlyphCamera,
      }
    case 'tiktok':
      return {
        label: 'TikTok',
        swatch: 'linear-gradient(135deg,#25f4ee,#000 50%,#fe2c55)',
        glyph: GlyphMusic,
      }
    case 'article':
      return { label: 'Article', swatch: 'linear-gradient(135deg,#8b6dff,#5b46c9)', glyph: GlyphDoc }
    case 'note':
      return { label: 'Note', swatch: 'linear-gradient(135deg,#ffcf7a,#e0a24a)', glyph: GlyphNote }
    case 'image':
      return { label: 'Screenshot', swatch: 'linear-gradient(135deg,#5ad1c9,#2f8f86)', glyph: GlyphImage }
    default:
      return { label: 'Saved', swatch: 'linear-gradient(135deg,#b6b5c4,#7d7c90)', glyph: GlyphDoc }
  }
}

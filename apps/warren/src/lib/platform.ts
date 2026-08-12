import type { ComponentType } from 'react'
import type { Platform } from '../types'
import {
  GlyphCamera,
  GlyphDoc,
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
    default:
      return 'Saved'
  }
}

export interface PlatformMeta {
  label: string
  swatch: string
  glyph: ComponentType<{ className?: string }>
}

export function platformMeta(platform: Platform): PlatformMeta {
  switch (platform) {
    case 'youtube':
      return { label: 'YouTube', swatch: '#1F4B3F', glyph: GlyphPlay }
    case 'instagram':
      return { label: 'Instagram', swatch: '#1F4B3F', glyph: GlyphCamera }
    case 'tiktok':
      return { label: 'TikTok', swatch: '#1F4B3F', glyph: GlyphMusic }
    case 'article':
      return { label: 'Article', swatch: '#1F4B3F', glyph: GlyphDoc }
    case 'note':
      return { label: 'Note', swatch: '#1F4B3F', glyph: GlyphNote }
    default:
      return { label: 'Saved', swatch: '#1F4B3F', glyph: GlyphDoc }
  }
}

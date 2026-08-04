import type { Platform } from '../types'

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

import type { MemoryItem } from '../types'
import { detectPlatform } from './platform'
import { enrichItem } from './extract'

/** Quick-capture builders. Each returns an enriched, library-ready item. */

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return (h >>> 0).toString(36)
}

const shortTime = () => Date.now().toString(36).slice(-5)

export function makeNote(input: {
  title?: string
  text: string
  sourceUrl?: string
  tags?: string[]
}): MemoryItem {
  const text = input.text.trim()
  const title = (input.title?.trim() || text.split('\n')[0] || 'Note').slice(0, 120)
  return enrichItem({
    id: `cap-note-${djb2(text)}-${shortTime()}`,
    type: 'text',
    title,
    url: input.sourceUrl?.trim() || undefined,
    summary: text,
    note: undefined,
    tags: normTags(input.tags),
    platform: 'note',
    createdAt: new Date().toISOString(),
    extractedText: text,
  })
}

export function makeLink(input: {
  url: string
  title?: string
  note?: string
  tags?: string[]
}): MemoryItem {
  const url = input.url.trim()
  const platform = detectPlatform(url, 'link')
  return enrichItem({
    id: `cap-link-${djb2(url)}`,
    type: 'link',
    title: input.title?.trim() || url,
    url,
    summary: input.note?.trim() || `Saved link · ${safeHost(url)}`,
    note: input.note?.trim() || undefined,
    tags: normTags(input.tags),
    platform,
    createdAt: new Date().toISOString(),
  })
}

export function makeImage(input: {
  dataUrl: string
  title?: string
  note?: string
  tags?: string[]
  extractedText?: string
}): MemoryItem {
  return enrichItem({
    id: `cap-image-${shortTime()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'asset',
    title: input.title?.trim() || 'Screenshot',
    summary: input.note?.trim() || 'Saved screenshot',
    note: input.note?.trim() || undefined,
    tags: normTags(input.tags),
    thumbnailUrl: input.dataUrl,
    platform: 'image',
    createdAt: new Date().toISOString(),
    extractedText: input.extractedText,
  })
}

function normTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))]
}

export function parseTagInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

/* -------------------------------------------------- image (browser only) */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Downscale a pasted/dropped image and return a compact data URL, so captures
 * fit comfortably in local storage. Prefers WebP, falls back to JPEG.
 */
export async function fileToDataUrl(file: Blob, max = 1600, quality = 0.85): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, max / Math.max(img.width || max, img.height || max))
    const w = Math.max(1, Math.round((img.width || max) * scale))
    const h = Math.max(1, Math.round((img.height || max) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0, w, h)
    const webp = canvas.toDataURL('image/webp', quality)
    if (webp.startsWith('data:image/webp')) return webp
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

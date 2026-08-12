import type { MemoryItem } from '../types'

/**
 * On-device extraction layer (deterministic, no network, no model).
 *
 * This turns each saved item into richer, more searchable data — the
 * foundation the "insightful search" idea builds on. Today it extracts
 * keywords, hashtags/@mentions, and URL signals entirely on-device. The same
 * `extractedText` / `keywords` fields are where heavier on-device providers
 * (OCR for screenshots, embeddings for semantic search) will write their
 * output — see enrichItem().
 */

const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','to','in','on','for','with','at','by','from','as','is','are',
  'was','were','be','been','it','its','this','that','these','those','i','you','he','she','we','they',
  'my','your','our','their','me','him','her','them','so','if','then','than','too','very','can','will',
  'just','about','into','over','after','before','how','what','why','when','where','which','who','your',
  'not','no','yes','do','does','did','have','has','had','up','out','off','down','more','most','some',
  'saved','video','post','reel','http','https','www','com','watch',
])

export function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#([\p{L}0-9_]{2,40})/gu)].map((m) => m[1].toLowerCase())
}

export function extractMentions(text: string): string[] {
  return [...text.matchAll(/@([a-z0-9_.]{2,40})/gi)].map((m) => m[1].toLowerCase())
}

export function extractKeywords(text: string, limit = 12): string[] {
  const counts = new Map<string, number>()
  for (const raw of text.toLowerCase().split(/[^\p{L}0-9]+/u)) {
    const w = raw.trim()
    if (w.length < 3 || w.length > 24) continue
    if (STOPWORDS.has(w)) continue
    if (/^\d+$/.test(w)) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w)
}

/** URL signals: host label + meaningful path/query words. */
export function extractUrlSignals(url?: string): string[] {
  if (!url) return []
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const hostLabel = host.split('.').slice(0, -1).join(' ') || host
    const pathWords = decodeURIComponent(u.pathname)
      .split(/[^\p{L}0-9]+/u)
      .filter((w) => w.length >= 3 && !/^\d+$/.test(w))
      .slice(0, 6)
    return [hostLabel.toLowerCase(), ...pathWords.map((w) => w.toLowerCase())]
  } catch {
    return []
  }
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))]
}

/**
 * Enrich a single item: derive keywords, fold hashtags/@mentions into tags,
 * and merge URL signals — all locally. Idempotent.
 */
export function enrichItem(item: MemoryItem): MemoryItem {
  const body = [item.title, item.summary, item.note, item.extractedText]
    .filter(Boolean)
    .join(' \n ')

  const hashtags = extractHashtags(body)
  const mentions = extractMentions(body)
  const tags = uniq([...item.tags, ...hashtags, ...mentions.map((m) => `@${m}`)])

  const keywords = uniq([
    ...item.tags.map((t) => t.toLowerCase()),
    ...hashtags,
    ...mentions,
    ...extractUrlSignals(item.url),
    ...extractKeywords(body),
  ]).slice(0, 24)

  return { ...item, tags, keywords }
}

export function enrichAll(items: MemoryItem[]): MemoryItem[] {
  return items.map(enrichItem)
}

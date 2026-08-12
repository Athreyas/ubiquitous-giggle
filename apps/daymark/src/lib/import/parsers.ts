import type { MemoryItem } from '../../types'
import { detectPlatform } from '../platform'

/**
 * Import pipeline parsers.
 *
 * Everything here is pure and dependency-free (no DOM / no cheerio) so it runs
 * the same in the browser and under Vitest. Each parser turns a raw export file
 * into `MemoryItem`s that drop straight into the Daymark library.
 */

export type ImportSource = 'browser' | 'instagram' | 'tiktok'

export interface ImportResult {
  source: ImportSource
  items: MemoryItem[]
  /** entries seen but skipped (no usable URL, unsupported, etc.) */
  skipped: number
}

export const SOURCE_LABELS: Record<ImportSource, string> = {
  browser: 'Browser bookmarks',
  instagram: 'Instagram saved',
  tiktok: 'TikTok saved',
}

/* ----------------------------------------------------------------- utils */

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return (h >>> 0).toString(36)
}

function makeId(source: ImportSource, key: string): string {
  return `imp-${source}-${djb2(key)}`
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim()
}

/** Normalise a bookmark timestamp (seconds / ms / WebKit µs) to ISO. */
export function normalizeTimestamp(raw: number | string | undefined): string {
  if (raw === undefined || raw === null || raw === '') return new Date().toISOString()
  let n = typeof raw === 'string' ? Number(raw) : raw
  if (!Number.isFinite(n) || n <= 0) {
    const parsed = typeof raw === 'string' ? Date.parse(raw.replace(' ', 'T') + 'Z') : NaN
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
  }
  // seconds → ms → µs heuristics
  if (n < 1e11) n *= 1000
  else if (n > 1e14) n = Math.floor(n / 1000)
  const d = new Date(n)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))]
}

const GENERIC_FOLDERS = new Set([
  'bookmarks',
  'bookmarks bar',
  'bookmarks toolbar',
  'bookmarks menu',
  'other bookmarks',
  'favorites',
  'favorites bar',
  'toolbar',
  'menu',
  'mobile bookmarks',
  'unfiled',
  'reading list',
])

/* ------------------------------------------------------------- browser */

const TOKEN_RE = /<H3[^>]*>([\s\S]*?)<\/H3>|<A\s+([^>]*?)>([\s\S]*?)<\/A>|<\/DL>/gi
const ATTR_RE = /([a-z0-9_-]+)\s*=\s*"([^"]*)"/gi

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  let m: RegExpExecArray | null
  while ((m = ATTR_RE.exec(raw)) !== null) out[m[1].toLowerCase()] = m[2]
  return out
}

/**
 * Netscape Bookmark File — the universal format exported by every major
 * browser (Chrome, Firefox, Safari, Edge, Brave, Opera, Vivaldi…).
 */
export function parseBrowserBookmarks(text: string): ImportResult {
  const items: MemoryItem[] = []
  const stack: string[] = []
  let skipped = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0

  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m[1] !== undefined) {
      stack.push(decodeEntities(m[1]))
    } else if (m[2] !== undefined) {
      const attrs = parseAttrs(m[2])
      const url = attrs.href ?? ''
      const title = decodeEntities(m[3]) || safeHost(url)
      if (!url || !isHttp(url)) {
        skipped++
        continue
      }
      const folderTags = stack.filter((f) => !GENERIC_FOLDERS.has(f.toLowerCase()))
      const attrTags = (attrs.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const platform = detectPlatform(url, 'link')
      items.push({
        id: makeId('browser', url),
        type: 'link',
        title,
        url,
        summary: folderTags.length ? `${safeHost(url)} · ${folderTags.join(' / ')}` : safeHost(url),
        tags: uniq([...attrTags, ...folderTags.map((t) => t.toLowerCase())]).slice(0, 8),
        platform,
        createdAt: normalizeTimestamp(attrs.add_date),
      })
    } else {
      stack.pop()
    }
  }

  return { source: 'browser', items, skipped }
}

/* ----------------------------------------------------------- instagram */

interface IgStringMapEntry {
  href?: string
  value?: string
  timestamp?: number
}
interface IgEntry {
  title?: string
  string_map_data?: Record<string, IgStringMapEntry>
  string_list_data?: { href?: string; timestamp?: number }[]
}

function coerceArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Instagram "Download Your Information" export — saved posts & reels.
 * Handles the JSON export (saved_posts.json / saved_collections.json) and a
 * light HTML fallback.
 */
export function parseInstagram(text: string): ImportResult {
  const items: MemoryItem[] = []
  let skipped = 0

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return parseInstagramHtml(text)
  }

  const root = json as Record<string, unknown>
  const entries = [
    ...coerceArray(root.saved_saved_media),
    ...coerceArray(root.saved_media),
    ...coerceArray(root.saved_posts),
  ] as IgEntry[]

  for (const entry of entries) {
    const map = entry.string_map_data ?? {}
    const saved = map['Saved on'] ?? map['Added Time'] ?? Object.values(map)[0]
    const href =
      saved?.href ?? entry.string_list_data?.find((d) => d.href)?.href ?? undefined
    const ts =
      saved?.timestamp ?? entry.string_list_data?.find((d) => d.timestamp)?.timestamp
    if (!href || !isHttp(href)) {
      skipped++
      continue
    }
    const creator = entry.title?.trim()
    const isReel = /\/reel(s)?\//i.test(href)
    items.push({
      id: makeId('instagram', href),
      type: 'link',
      title: creator ? `@${creator.replace(/^@/, '')}` : isReel ? 'Saved reel' : 'Saved post',
      url: href,
      summary: `Saved ${isReel ? 'reel' : 'post'} from Instagram${creator ? ` · @${creator.replace(/^@/, '')}` : ''}`,
      tags: uniq(['instagram', 'saved', isReel ? 'reel' : 'post']),
      platform: 'instagram',
      createdAt: normalizeTimestamp(ts),
    })
  }

  return { source: 'instagram', items, skipped }
}

function parseInstagramHtml(text: string): ImportResult {
  const items: MemoryItem[] = []
  const seen = new Set<string>()
  const re = /href="(https:\/\/(?:www\.)?instagram\.com\/[^"]+)"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const href = m[1]
    if (seen.has(href)) continue
    seen.add(href)
    const isReel = /\/reel(s)?\//i.test(href)
    items.push({
      id: makeId('instagram', href),
      type: 'link',
      title: isReel ? 'Saved reel' : 'Saved post',
      url: href,
      summary: `Saved ${isReel ? 'reel' : 'post'} from Instagram`,
      tags: uniq(['instagram', 'saved', isReel ? 'reel' : 'post']),
      platform: 'instagram',
      createdAt: new Date().toISOString(),
    })
  }
  return { source: 'instagram', items, skipped: 0 }
}

/* ------------------------------------------------------------- tiktok */

type TikTokKind = 'saved' | 'liked' | 'other'

function classifyTikTok(path: string): TikTokKind {
  const p = path.toLowerCase()
  // Check "like" first: TikTok nests likes under "Like List" > "ItemFavoriteList",
  // whose key confusingly also contains "favorite".
  if (/\blike/.test(p)) return 'liked'
  if (/favorit|bookmark|saved/.test(p)) return 'saved'
  return 'other'
}

/** Recursively collect {Date, Link} records, classifying by the ancestor path. */
function collectTikTok(
  node: unknown,
  path: string,
  out: { link: string; date?: string; kind: TikTokKind }[],
): void {
  if (Array.isArray(node)) {
    for (const el of node) collectTikTok(el, path, out)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const link = (obj.Link ?? obj.link) as string | undefined
    if (typeof link === 'string' && link) {
      out.push({ link, date: (obj.Date ?? obj.date) as string | undefined, kind: classifyTikTok(path) })
      return
    }
    for (const [k, v] of Object.entries(obj)) collectTikTok(v, `${path}/${k}`, out)
  }
}

/**
 * TikTok "Download your data" export — favourited / bookmarked videos.
 * Robust to schema drift: deep-scans for {Link, Date} records and infers the
 * list (favourite / bookmark / like) from the nearest key.
 */
export function parseTikTok(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { source: 'tiktok', items: [], skipped: 0 }
  }

  const collected: { link: string; date?: string; kind: TikTokKind }[] = []
  collectTikTok(json, '', collected)

  const items: MemoryItem[] = []
  const seen = new Set<string>()
  let skipped = 0

  for (const { link, date, kind } of collected) {
    const url = link.trim()
    // Only import saved/liked videos — skip browsing history and other lists.
    if (kind === 'other' || !isHttp(url) || !/tiktok/i.test(url) || seen.has(url)) {
      skipped++
      continue
    }
    seen.add(url)
    items.push({
      id: makeId('tiktok', url),
      type: 'link',
      title: kind === 'liked' ? 'Liked TikTok' : 'Saved TikTok',
      url,
      summary: `${kind === 'liked' ? 'Liked' : 'Saved'} video from TikTok`,
      tags: uniq(['tiktok', kind === 'liked' ? 'liked' : 'saved', 'video']),
      platform: 'tiktok',
      createdAt: normalizeTimestamp(date),
    })
  }

  return { source: 'tiktok', items, skipped }
}

/* ------------------------------------------------------- orchestration */

/** Best-effort source sniffing from filename + contents. */
export function detectSource(text: string, filename = ''): ImportSource | null {
  const name = filename.toLowerCase()
  const head = text.slice(0, 4000)

  if (/netscape-bookmark-file/i.test(head) || /<dl[>\s]/i.test(head)) return 'browser'
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    if (/instagram\.com/i.test(head)) return 'instagram'
    return 'browser'
  }

  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    if (/saved_saved_media|saved_media|"saved_posts"/i.test(head)) return 'instagram'
    if (/favoritevideolist|itemfavoritelist|"activity"|tiktok/i.test(head)) return 'tiktok'
    if (/instagram\.com/i.test(head)) return 'instagram'
    if (/tiktok/i.test(head)) return 'tiktok'
  }
  if (name.includes('instagram') || name.includes('saved_posts')) return 'instagram'
  if (name.includes('tiktok') || name.includes('user_data')) return 'tiktok'
  return null
}

export function parseBySource(source: ImportSource, text: string): ImportResult {
  switch (source) {
    case 'browser':
      return parseBrowserBookmarks(text)
    case 'instagram':
      return parseInstagram(text)
    case 'tiktok':
      return parseTikTok(text)
  }
}

/** Parse a file, auto-detecting the source when not given. */
export function parseImportFile(
  text: string,
  filename = '',
  source?: ImportSource,
): ImportResult {
  const resolved = source ?? detectSource(text, filename)
  if (!resolved) return { source: 'browser', items: [], skipped: 0 }
  return parseBySource(resolved, text)
}

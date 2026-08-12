import type { MemoryItem } from '../types'
import { detectPlatform } from './platform'

interface KarakeepTag {
  name?: string
  id?: string
}

interface KarakeepBookmark {
  id: string
  createdAt?: string
  modifiedAt?: string
  title?: string | null
  archived?: boolean
  note?: string | null
  summary?: string | null
  tags?: KarakeepTag[]
  content?: {
    type?: string
    url?: string
    title?: string | null
    description?: string | null
    imageUrl?: string | null
    screenshotAssetId?: string | null
    text?: string | null
  }
}

interface ListResponse {
  bookmarks?: KarakeepBookmark[]
  nextCursor?: string | null
}

function pickTitle(b: KarakeepBookmark): string {
  return (
    b.title?.trim() ||
    b.content?.title?.trim() ||
    b.content?.url ||
    'Untitled save'
  )
}

function pickSummary(b: KarakeepBookmark): string {
  const summary = b.summary?.trim()
  if (summary) return summary
  const desc = b.content?.description?.trim()
  if (desc) return desc
  const text = b.content?.text?.trim()
  if (text) return text.length > 280 ? `${text.slice(0, 277)}…` : text
  const note = b.note?.trim()
  if (note) return note
  return 'No summary yet — open it and leave a short note for future you.'
}

function toMemoryItem(b: KarakeepBookmark, baseUrl: string): MemoryItem {
  const type =
    b.content?.type === 'text'
      ? 'text'
      : b.content?.type === 'asset'
        ? 'asset'
        : 'link'
  const url = b.content?.url
  let thumbnailUrl = b.content?.imageUrl ?? undefined
  if (!thumbnailUrl && b.content?.screenshotAssetId) {
    thumbnailUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/assets/${b.content.screenshotAssetId}`
  }

  return {
    id: b.id,
    type,
    title: pickTitle(b),
    url,
    summary: pickSummary(b),
    note: b.note?.trim() || undefined,
    tags: (b.tags ?? []).map((t) => t.name).filter(Boolean) as string[],
    thumbnailUrl,
    platform: detectPlatform(url, type),
    createdAt: b.createdAt ?? new Date().toISOString(),
    archived: Boolean(b.archived),
  }
}

export interface PushProgress {
  done: number
  total: number
  created: number
  duplicates: number
  failed: number
}

/** Build the POST /api/v1/bookmarks body for a Daymark item. */
export function toCreateBookmarkPayload(item: MemoryItem): Record<string, unknown> {
  const common = {
    title: item.title,
    createdAt: item.createdAt,
    source: 'api' as const,
  }
  if (item.type === 'text' || !item.url) {
    return { ...common, type: 'text', text: item.summary || item.note || item.title }
  }
  return { ...common, type: 'link', url: item.url }
}

/**
 * Push imported items into a connected Daykeep/Karakeep library.
 * Creates each bookmark then attaches its tags. Best-effort: per-item errors
 * are counted, not thrown, so a bad row can't abort the whole import.
 */
export async function pushBookmarksToKarakeep(
  baseUrl: string,
  apiKey: string,
  items: MemoryItem[],
  onProgress?: (p: PushProgress) => void,
): Promise<PushProgress> {
  const root = baseUrl.replace(/\/$/, '')
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const progress: PushProgress = {
    done: 0,
    total: items.length,
    created: 0,
    duplicates: 0,
    failed: 0,
  }

  for (const item of items) {
    try {
      const res = await fetch(`${root}/api/v1/bookmarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(toCreateBookmarkPayload(item)),
      })
      if (!res.ok) {
        progress.failed++
      } else {
        if (res.status === 200) progress.duplicates++
        else progress.created++
        const created = (await res.json()) as { id?: string }
        if (created.id && item.tags.length) {
          await fetch(`${root}/api/v1/bookmarks/${created.id}/tags`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tags: item.tags.map((tagName) => ({ tagName })) }),
          }).catch(() => undefined)
        }
      }
    } catch {
      progress.failed++
    }
    progress.done++
    onProgress?.({ ...progress })
  }

  return progress
}

export async function fetchKarakeepBookmarks(
  baseUrl: string,
  apiKey: string,
  limit = 200,
): Promise<MemoryItem[]> {
  const root = baseUrl.replace(/\/$/, '')
  const items: MemoryItem[] = []
  let cursor: string | null = null

  while (items.length < limit) {
    const params = new URLSearchParams({
      limit: String(Math.min(50, limit - items.length)),
      includeContent: 'true',
      archived: 'false',
    })
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`${root}/api/v1/bookmarks?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `Karakeep API ${res.status}: ${body || res.statusText || 'request failed'}`,
      )
    }

    const data = (await res.json()) as ListResponse
    const batch = data.bookmarks ?? []
    for (const b of batch) items.push(toMemoryItem(b, root))
    cursor = data.nextCursor ?? null
    if (!cursor || batch.length === 0) break
  }

  return items
}

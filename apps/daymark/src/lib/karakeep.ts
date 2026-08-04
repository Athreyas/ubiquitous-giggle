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

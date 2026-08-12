import type { LibrarySettings, MemoryItem } from '../types'
import { listSaves, type Save } from './api/saves'
import { detectPlatform } from './platform'

function pickTitle(save: Save): string {
  return save.title?.trim() || save.url?.trim() || 'Untitled save'
}

function pickSummary(save: Save): string {
  const summary = save.summary?.trim()
  if (summary) return summary
  const note = save.note?.trim()
  if (note) return note
  return 'No summary yet — open it and leave a short note for future you.'
}

function toMemoryItem(save: Save): MemoryItem {
  const url = save.url?.trim() || undefined
  return {
    id: save.id,
    type: save.type,
    title: pickTitle(save),
    url,
    summary: pickSummary(save),
    note: save.note?.trim() || undefined,
    tags: save.tags ?? [],
    thumbnailUrl: save.thumbnailUrl?.trim() || undefined,
    platform: detectPlatform(url, save.type),
    createdAt: save.createdAt,
    archived: Boolean(save.archived),
  }
}

/** Fetches saves from the Daymark API (`GET /api/v1/saves`), paginating up to `limit`. */
export async function fetchLibrarySaves(
  settings: LibrarySettings,
  limit = 200,
): Promise<MemoryItem[]> {
  const items: MemoryItem[] = []
  let cursor: string | null = null

  while (items.length < limit) {
    const { items: page, nextCursor } = await listSaves(settings, {
      limit: Math.min(50, limit - items.length),
      archived: false,
      cursor,
    })
    for (const save of page) items.push(toMemoryItem(save))
    cursor = nextCursor ?? null
    if (!cursor || page.length === 0) break
  }

  return items
}

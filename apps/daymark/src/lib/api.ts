import type { LibrarySettings, MemoryItem } from '../types'
import { listSaves, type Save } from './api/saves'

const NO_SUMMARY_YET = 'No summary yet — open it and leave a short note for future you.'

function toMemoryItem(save: Save): MemoryItem {
  return {
    id: save.id,
    type: save.type,
    title: save.title,
    url: save.url,
    summary: save.summary?.trim() || save.note?.trim() || NO_SUMMARY_YET,
    note: save.note,
    tags: save.tags ?? [],
    thumbnailUrl: save.thumbnailUrl,
    platform: save.platform,
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
  let cursor: string | undefined

  while (items.length < limit) {
    const { items: page, nextCursor } = await listSaves(settings, {
      limit: Math.min(50, limit - items.length),
      archived: false,
      cursor,
    })
    for (const save of page) items.push(toMemoryItem(save))
    cursor = nextCursor
    if (!cursor || page.length === 0) break
  }

  return items
}

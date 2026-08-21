import type { LibrarySettings, MemoryItem } from '../types'
import type { Save } from './api/saves'
import { ApiSavesRepo, LocalSavesRepo } from './repos/savesRepo'

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

/** Fetches saves from the Warren API (`GET /api/v1/saves`), paginating up to `limit`. */
export async function fetchLibrarySaves(
  settings: LibrarySettings,
  limit = 200,
): Promise<MemoryItem[]> {
  const local = new LocalSavesRepo()
  const spaceId = settings.activeSpaceId
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await local.list()
    const scoped = spaceId
      ? cached.filter((save) => (save as Save & { spaceId?: string | null }).spaceId === spaceId)
      : cached
    return scoped.slice(0, limit).map(toMemoryItem)
  }

  try {
    return (await new ApiSavesRepo(settings, local).list(limit, spaceId)).map(toMemoryItem)
  } catch (error) {
    const cached = await local.list()
    if (cached.length > 0) {
      const scoped = spaceId
        ? cached.filter((save) => (save as Save & { spaceId?: string | null }).spaceId === spaceId)
        : cached
      if (scoped.length > 0) return scoped.slice(0, limit).map(toMemoryItem)
    }
    throw error
  }
}

import type { LibrarySettings, MemoryItem } from '../../types'
import { apiFetch } from './client'

export function searchSaves(
  settings: LibrarySettings,
  q: string,
  limit = 20,
): Promise<{ items: MemoryItem[] }> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  if (settings.activeSpaceId) params.set('spaceId', settings.activeSpaceId)
  return apiFetch(settings, `/api/v1/search?${params}`)
}

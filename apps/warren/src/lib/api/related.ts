import type { LibrarySettings, MemoryItem } from '../../types'
import { apiFetch } from './client'

export interface RelatedSave extends MemoryItem {
  similarity: number
}

export function fetchRelatedSaves(
  settings: LibrarySettings,
  saveId: string,
  limit = 5,
): Promise<{ items: RelatedSave[] }> {
  return apiFetch(settings, `/api/v1/saves/${saveId}/related?limit=${limit}`)
}

export function runClustering(
  settings: LibrarySettings,
): Promise<{
  suggestions: Array<{ id: string; name: string; memberIds: string[]; size: number }>
  persisted: boolean
}> {
  return apiFetch(settings, '/api/v1/clustering/run', { method: 'POST' })
}

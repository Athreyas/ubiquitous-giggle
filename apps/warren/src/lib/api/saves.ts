import type { BookmarkType, LibrarySettings, Platform } from '../../types'
import { apiFetch } from './client'

/** Wire shape for a save returned by the Warren API (`MemoryItem`). */
export interface Save {
  id: string
  type: BookmarkType
  url?: string
  title: string
  summary: string
  note?: string
  tags: string[]
  thumbnailUrl?: string
  platform: Platform
  createdAt: string
  archived?: boolean
  extractedText?: string
  keywords?: string[]
  spaceId?: string | null
}

export interface NewSave {
  id?: string
  type: BookmarkType
  url?: string
  title: string
  summary?: string
  note?: string
  tags?: string[]
  thumbnailUrl?: string
  platform: Platform
  createdAt?: string
  archived?: boolean
  extractedText?: string
  keywords?: string[]
}

export interface SavePatch {
  type?: BookmarkType
  title?: string
  url?: string
  summary?: string
  note?: string
  tags?: string[]
  thumbnailUrl?: string
  platform?: Platform
  archived?: boolean
  extractedText?: string
  keywords?: string[]
}

export interface ListSavesOptions {
  limit?: number
  cursor?: string | null
  archived?: boolean | 'all'
  spaceId?: string | null
}

export interface ListSavesResult {
  items: Save[]
  nextCursor?: string
}

export function listSaves(
  settings: LibrarySettings,
  options: ListSavesOptions = {},
): Promise<ListSavesResult> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 50) })
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.archived !== undefined) params.set('archived', String(options.archived))
  if (options.spaceId) params.set('spaceId', options.spaceId)
  return apiFetch<ListSavesResult>(settings, `/api/v1/saves?${params}`)
}

export function createSave(settings: LibrarySettings, input: NewSave): Promise<Save> {
  return apiFetch<Save>(settings, '/api/v1/saves', { method: 'POST', body: input })
}

export async function batchCreateSaves(
  settings: LibrarySettings,
  inputs: NewSave[],
): Promise<{ created: number; updated: number; ids: string[] }> {
  return apiFetch(settings, '/api/v1/saves/batch', {
    method: 'POST',
    body: { items: inputs },
  })
}

export function getSave(settings: LibrarySettings, id: string): Promise<Save> {
  return apiFetch<Save>(settings, `/api/v1/saves/${id}`)
}

export function patchSave(
  settings: LibrarySettings,
  id: string,
  patch: SavePatch,
): Promise<Save> {
  return apiFetch<Save>(settings, `/api/v1/saves/${id}`, { method: 'PATCH', body: patch })
}

export function deleteSave(settings: LibrarySettings, id: string): Promise<void> {
  return apiFetch<void>(settings, `/api/v1/saves/${id}`, { method: 'DELETE' })
}

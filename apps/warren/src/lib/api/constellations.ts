import type { LibrarySettings } from '../../types'
import { apiFetch } from './client'

export interface Constellation {
  id: string
  name: string
  spaceId: string | null
  pinned: boolean
  memberIds: string[]
  size: number
  createdAt: string
  updatedAt: string
}

export function listConstellations(
  settings: LibrarySettings,
  spaceId?: string | null,
): Promise<{ items: Constellation[] }> {
  const params = new URLSearchParams()
  if (spaceId) params.set('spaceId', spaceId)
  const qs = params.toString()
  return apiFetch(settings, `/api/v1/constellations${qs ? `?${qs}` : ''}`)
}

export function createSaveLink(
  settings: LibrarySettings,
  fromSaveId: string,
  toSaveId: string,
): Promise<{ id: string; fromSaveId: string; toSaveId: string; createdAt: string }> {
  return apiFetch(settings, `/api/v1/saves/${fromSaveId}/links`, {
    method: 'POST',
    body: { toSaveId },
  })
}

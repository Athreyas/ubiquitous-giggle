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

export interface GraphPayload {
  nodes: Array<{ id: string; title: string; platform: string; spaceId: string | null }>
  links: Array<{ id: string; source: string; target: string }>
  constellations: Array<{ id: string; name: string; pinned: boolean; memberIds: string[] }>
  focusId: string | null
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

export function patchConstellation(
  settings: LibrarySettings,
  id: string,
  patch: { name?: string; pinned?: boolean },
): Promise<Constellation> {
  return apiFetch(settings, `/api/v1/constellations/${id}`, { method: 'PATCH', body: patch })
}

export function deleteConstellation(settings: LibrarySettings, id: string): Promise<void> {
  return apiFetch(settings, `/api/v1/constellations/${id}`, { method: 'DELETE' })
}

export function addConstellationMember(
  settings: LibrarySettings,
  id: string,
  saveId: string,
): Promise<Constellation> {
  return apiFetch(settings, `/api/v1/constellations/${id}/members`, {
    method: 'POST',
    body: { saveId },
  })
}

export function removeConstellationMember(
  settings: LibrarySettings,
  id: string,
  saveId: string,
): Promise<Constellation> {
  return apiFetch(settings, `/api/v1/constellations/${id}/members/${saveId}`, {
    method: 'DELETE',
  })
}

export function mergeConstellations(
  settings: LibrarySettings,
  fromId: string,
  intoId: string,
): Promise<Constellation> {
  return apiFetch(settings, '/api/v1/constellations/merge', {
    method: 'POST',
    body: { fromId, intoId },
  })
}

export function splitConstellation(
  settings: LibrarySettings,
  id: string,
  saveIds: string[],
  name?: string,
): Promise<{ source: Constellation; created: Constellation }> {
  return apiFetch(settings, `/api/v1/constellations/${id}/split`, {
    method: 'POST',
    body: { saveIds, ...(name ? { name } : {}) },
  })
}

export function fetchGraph(
  settings: LibrarySettings,
  options: { spaceId?: string | null; focus?: string | null } = {},
): Promise<GraphPayload> {
  const params = new URLSearchParams()
  if (options.spaceId) params.set('spaceId', options.spaceId)
  if (options.focus) params.set('focus', options.focus)
  const qs = params.toString()
  return apiFetch(settings, `/api/v1/graph${qs ? `?${qs}` : ''}`)
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

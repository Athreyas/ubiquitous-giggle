import type { LibrarySettings } from '../../types'
import { apiFetch } from './client'

export interface Space {
  id: string
  name: string
  slug: string
  position: number
  createdAt: string
}

export function listSpaces(settings: LibrarySettings): Promise<{ items: Space[] }> {
  return apiFetch(settings, '/api/v1/spaces')
}

export function createSpace(settings: LibrarySettings, name: string): Promise<Space> {
  return apiFetch(settings, '/api/v1/spaces', { method: 'POST', body: { name } })
}

export function patchSpace(
  settings: LibrarySettings,
  id: string,
  patch: { name?: string; position?: number },
): Promise<Space> {
  return apiFetch(settings, `/api/v1/spaces/${id}`, { method: 'PATCH', body: patch })
}

export function deleteSpace(settings: LibrarySettings, id: string): Promise<void> {
  return apiFetch(settings, `/api/v1/spaces/${id}`, { method: 'DELETE' })
}

import type { LibrarySettings, SurfacingState } from '../../types'
import { apiFetch } from './client'

export function getSurfacing(settings: LibrarySettings): Promise<SurfacingState> {
  return apiFetch<SurfacingState>(settings, '/api/v1/surfacing')
}

export function putSurfacing(
  settings: LibrarySettings,
  state: SurfacingState,
): Promise<SurfacingState> {
  return apiFetch<SurfacingState>(settings, '/api/v1/surfacing', {
    method: 'PUT',
    body: state,
  })
}

export type SurfacingEventType = 'surfaced' | 'opened' | 'dismissed'

export interface SurfacingEvent {
  type: SurfacingEventType
  /** Prefer `id` / `ids` — `saveId` is accepted as an alias for a single id. */
  id?: string
  ids?: string[]
  saveId?: string
  at?: string
}

/** Best-effort activity log — never blocks the UI. */
export function postSurfacingEvent(
  settings: LibrarySettings,
  event: SurfacingEvent,
): Promise<SurfacingState> {
  const { saveId, ...rest } = event
  const body = {
    ...rest,
    id: event.id ?? saveId,
    ids: event.ids,
    at: event.at ?? new Date().toISOString(),
  }
  return apiFetch<SurfacingState>(settings, '/api/v1/surfacing/events', {
    method: 'POST',
    body,
  })
}

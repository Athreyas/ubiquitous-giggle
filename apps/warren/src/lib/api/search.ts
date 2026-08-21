import type { LibrarySettings, MemoryItem } from '../../types'
import { apiFetch } from './client'

export type SearchOptions = {
  q: string
  limit?: number
  spaceId?: string | null
  platform?: string | null
  tag?: string | null
  neverOpened?: boolean
  after?: string | null
  before?: string | null
}

export function searchSaves(
  settings: LibrarySettings,
  options: SearchOptions | string,
  limit = 20,
): Promise<{ items: MemoryItem[] }> {
  const opts: SearchOptions =
    typeof options === 'string' ? { q: options, limit } : { limit, ...options }
  const params = new URLSearchParams({
    q: opts.q,
    limit: String(opts.limit ?? 20),
  })
  const spaceId = opts.spaceId ?? settings.activeSpaceId
  if (spaceId) params.set('spaceId', spaceId)
  if (opts.platform) params.set('platform', opts.platform)
  if (opts.tag) params.set('tag', opts.tag)
  if (opts.neverOpened) params.set('neverOpened', 'true')
  if (opts.after) params.set('after', opts.after)
  if (opts.before) params.set('before', opts.before)
  return apiFetch(settings, `/api/v1/search?${params}`)
}

export type BookmarkType = 'link' | 'text' | 'asset'

export type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'article'
  | 'note'
  | 'other'

export interface MemoryItem {
  id: string
  type: BookmarkType
  title: string
  url?: string
  summary: string
  note?: string
  tags: string[]
  thumbnailUrl?: string
  platform: Platform
  createdAt: string
  archived?: boolean
}

export interface SurfacingState {
  /** ISO date keys → bookmark ids shown that day */
  byDay: Record<string, string[]>
  /** bookmark id → last ISO date surfaced */
  lastSurfaced: Record<string, string>
  /** bookmark id → last ISO datetime opened/revisited */
  lastOpened: Record<string, string>
  /** bookmark ids user dismissed from memory (soft skip) */
  dismissed: string[]
}

/** Signed-in Warren account. */
export interface User {
  id: string
  email: string
  name?: string
}

/**
 * Client connection + auth settings, persisted to localStorage.
 * `token` is the Bearer token for the Warren API (`apps/api`), empty when logged out.
 */
export interface LibrarySettings {
  useDemo: boolean
  apiBaseUrl: string
  token: string
}

export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8787'

export function defaultLibrarySettings(): LibrarySettings {
  return { useDemo: true, apiBaseUrl: DEFAULT_API_BASE_URL, token: '' }
}

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

export interface KarakeepSettings {
  baseUrl: string
  apiKey: string
  useDemo: boolean
}

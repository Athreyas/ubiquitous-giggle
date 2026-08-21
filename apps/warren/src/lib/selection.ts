import { differenceInCalendarDays, formatISO, parseISO, subDays } from 'date-fns'
import type { MemoryItem, SurfacingState } from '../types'

/** Mulberry32 — tiny seeded PRNG for stable daily picks. */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function daySeed(dayKey: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function hasRichMemory(item: MemoryItem): boolean {
  return Boolean(item.summary?.trim() || item.note?.trim() || item.tags.length)
}

function topTag(item: MemoryItem): string | undefined {
  return item.tags[0]?.toLowerCase()
}

function wasSurfacedRecently(
  id: string,
  state: SurfacingState,
  today: Date,
  withinDays: number,
): boolean {
  const last = state.lastSurfaced[id]
  if (!last) return false
  return differenceInCalendarDays(today, parseISO(last)) < withinDays
}

/**
 * Dismiss = "not today" only (MARK-9). Never a permanent ban.
 *
 * `state.dismissed` is a legacy pre-MARK-9 forever-list kept only for wire-shape
 * compatibility with older clients/API payloads — it is never consulted here, so
 * an item dismissed months ago is fully eligible again once its cooldown lapses.
 */
function isDismissedToday(id: string, state: SurfacingState, today: Date): boolean {
  const day = todayKey(today)
  return (state.byDay[day] ?? []).includes(`dismiss:${id}`)
}

function buildPool(
  items: MemoryItem[],
  state: SurfacingState,
  today: Date,
  minAgeDays: number,
): MemoryItem[] {
  return items.filter((item) => {
    if (item.archived) return false
    if (isDismissedToday(item.id, state, today)) return false
    const age = differenceInCalendarDays(today, parseISO(item.createdAt))
    if (age < minAgeDays) return false
    if (wasSurfacedRecently(item.id, state, today, 14)) return false
    return true
  })
}

function scoreItem(item: MemoryItem, state: SurfacingState, today: Date): number {
  let score = 0
  const age = differenceInCalendarDays(today, parseISO(item.createdAt))
  score += Math.min(age, 120) / 120
  if (hasRichMemory(item)) score += 0.35
  if (item.thumbnailUrl) score += 0.15
  if (item.platform === 'instagram' || item.platform === 'tiktok') score += 0.08
  if (!state.lastOpened[item.id]) score += 0.25
  else {
    const openedDays = differenceInCalendarDays(
      today,
      parseISO(state.lastOpened[item.id]),
    )
    score += Math.min(openedDays, 60) / 120
  }
  return score
}

export function todayKey(date = new Date()): string {
  return formatISO(date, { representation: 'date' })
}

export interface SelectOptions {
  count?: number
  /** Extra salt when user asks to shuffle */
  shuffleSalt?: number
  now?: Date
}

/**
 * Pick 1–2 forgotten bookmarks for the day.
 * Stable for a given dayKey + salt until the library/state changes.
 */
export function selectDailyMemories(
  items: MemoryItem[],
  state: SurfacingState,
  options: SelectOptions = {},
): MemoryItem[] {
  const count = options.count ?? 2
  const now = options.now ?? new Date()
  const dayKey = todayKey(now)
  const rand = mulberry32(daySeed(dayKey, options.shuffleSalt ?? 0))

  let pool = buildPool(items, state, now, 7)
  if (pool.length < count) pool = buildPool(items, state, now, 3)
  if (pool.length < count) {
    pool = items.filter((i) => !i.archived && !isDismissedToday(i.id, state, now))
  }
  if (pool.length === 0) return []

  const ranked = [...pool].sort(
    (a, b) => scoreItem(b, state, now) - scoreItem(a, state, now),
  )

  // Take a soft top band, then shuffle for variety within “forgotten + rich”
  const band = ranked.slice(0, Math.min(12, ranked.length))
  shuffleInPlace(band, rand)

  const picked: MemoryItem[] = []
  const usedTags = new Set<string>()

  for (const item of band) {
    if (picked.length >= count) break
    const tag = topTag(item)
    if (tag && usedTags.has(tag) && band.length > count) continue
    picked.push(item)
    if (tag) usedTags.add(tag)
  }

  // Fill if diversity filter was too strict
  for (const item of band) {
    if (picked.length >= count) break
    if (!picked.find((p) => p.id === item.id)) picked.push(item)
  }

  return picked.slice(0, count)
}

export function markSurfaced(
  state: SurfacingState,
  ids: string[],
  now = new Date(),
): SurfacingState {
  const day = todayKey(now)
  const lastSurfaced = { ...state.lastSurfaced }
  for (const id of ids) lastSurfaced[id] = day
  return {
    ...state,
    byDay: { ...state.byDay, [day]: ids },
    lastSurfaced,
  }
}

export function markOpened(
  state: SurfacingState,
  id: string,
  now = new Date(),
): SurfacingState {
  return {
    ...state,
    lastOpened: { ...state.lastOpened, [id]: now.toISOString() },
  }
}

/**
 * Mark as "not today" — does NOT permanently exclude the item (MARK-9 no-decay).
 * We record a dismiss sentinel in byDay for today; the legacy `dismissed` array
 * is no longer used as a forever-ban (kept for backward-compatible shape only).
 */
export function markDismissed(
  state: SurfacingState,
  id: string,
  now = new Date(),
): SurfacingState {
  const day = todayKey(now)
  const key = `dismiss:${id}`
  const todayIds = state.byDay[day] ?? []
  if (todayIds.includes(key)) return state
  return {
    ...state,
    byDay: { ...state.byDay, [day]: [...todayIds, key] },
    // Clear any legacy forever-ban entry so old state cannot permanently hide items
    dismissed: state.dismissed.filter((d) => d !== id),
  }
}

export function daysSinceSaved(item: MemoryItem, now = new Date()): number {
  return differenceInCalendarDays(now, parseISO(item.createdAt))
}

export function humanAge(item: MemoryItem, now = new Date()): string {
  const days = daysSinceSaved(item, now)
  if (days <= 0) return 'Saved today'
  if (days === 1) return 'Saved yesterday'
  if (days < 30) return `Saved ${days} days ago`
  const months = Math.round(days / 30)
  if (months === 1) return 'Saved about a month ago'
  if (months < 12) return `Saved about ${months} months ago`
  const years = Math.round(days / 365)
  return years === 1 ? 'Saved about a year ago' : `Saved about ${years} years ago`
}

/** Exported for tests / future digest windows */
export function recentWindow(days: number, now = new Date()): Date {
  return subDays(now, days)
}

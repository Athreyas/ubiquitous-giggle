import type { MemoryItem } from '../types'

const IMPORTED_KEY = 'daymark.imported.v1'

export function loadImported(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MemoryItem[]) : []
  } catch {
    return []
  }
}

export function saveImported(items: MemoryItem[]): void {
  localStorage.setItem(IMPORTED_KEY, JSON.stringify(items))
}

/** Merge new items into the store, de-duplicating by id (url-hash). */
export function addImported(newItems: MemoryItem[]): MemoryItem[] {
  const existing = loadImported()
  const byId = new Map(existing.map((i) => [i.id, i]))
  for (const item of newItems) byId.set(item.id, item)
  const merged = [...byId.values()]
  saveImported(merged)
  return merged
}

export function clearImported(): void {
  localStorage.removeItem(IMPORTED_KEY)
}

/** Merge a base library with imported items, imported first, de-duped. */
export function mergeLibrary(base: MemoryItem[], imported: MemoryItem[]): MemoryItem[] {
  const byKey = new Map<string, MemoryItem>()
  for (const item of [...imported, ...base]) {
    const key = item.url ?? item.id
    if (!byKey.has(key)) byKey.set(key, item)
  }
  return [...byKey.values()]
}

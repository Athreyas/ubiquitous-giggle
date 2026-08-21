/**
 * Shared NL / structured search query parsing (MARK-4).
 * Used by the API; mirrored on the client for local-first search.
 */

export type ParsedSearchQuery = {
  /** Remaining free-text after filter tokens are stripped. */
  text: string
  afterIso?: string
  beforeIso?: string
  platform?: string
  tag?: string
  neverOpened?: boolean
}

const PLATFORMS = new Set(['youtube', 'instagram', 'tiktok', 'article', 'note', 'other'])

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function daysAgo(n: number): string {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/**
 * Parse rough filters from a natural-language / chip-style query.
 * Supports: last week/month, yesterday, after:/before: ISO dates,
 * platform:, tag:, and "never opened".
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  let remaining = raw.trim()
  const result: ParsedSearchQuery = { text: '' }

  if (/\bnever\s+opened\b/i.test(remaining) || /\bnever:opened\b/i.test(remaining)) {
    result.neverOpened = true
    remaining = remaining.replace(/\bnever\s+opened\b/gi, ' ').replace(/\bnever:opened\b/gi, ' ')
  }

  const afterMatch = remaining.match(/\bafter:(\d{4}-\d{2}-\d{2})\b/i)
  if (afterMatch) {
    result.afterIso = new Date(`${afterMatch[1]}T00:00:00.000Z`).toISOString()
    remaining = remaining.replace(afterMatch[0], ' ')
  }

  const beforeMatch = remaining.match(/\bbefore:(\d{4}-\d{2}-\d{2})\b/i)
  if (beforeMatch) {
    result.beforeIso = new Date(`${beforeMatch[1]}T23:59:59.999Z`).toISOString()
    remaining = remaining.replace(beforeMatch[0], ' ')
  }

  const platformMatch = remaining.match(/\bplatform:([a-z]+)\b/i)
  if (platformMatch && PLATFORMS.has(platformMatch[1].toLowerCase())) {
    result.platform = platformMatch[1].toLowerCase()
    remaining = remaining.replace(platformMatch[0], ' ')
  }

  const tagMatch = remaining.match(/\btag:([^\s]+)\b/i)
  if (tagMatch) {
    result.tag = tagMatch[1].toLowerCase()
    remaining = remaining.replace(tagMatch[0], ' ')
  }

  if (/\blast\s+week\b/i.test(remaining)) {
    result.afterIso = result.afterIso ?? daysAgo(7)
    remaining = remaining.replace(/\blast\s+week\b/gi, ' ')
  } else if (/\blast\s+month\b/i.test(remaining)) {
    result.afterIso = result.afterIso ?? daysAgo(30)
    remaining = remaining.replace(/\blast\s+month\b/gi, ' ')
  } else if (/\byesterday\b/i.test(remaining)) {
    result.afterIso = result.afterIso ?? daysAgo(1)
    remaining = remaining.replace(/\byesterday\b/gi, ' ')
  } else if (/\bthis\s+week\b/i.test(remaining)) {
    const d = startOfDay(new Date())
    const day = d.getDay()
    d.setDate(d.getDate() - ((day + 6) % 7))
    result.afterIso = result.afterIso ?? d.toISOString()
    remaining = remaining.replace(/\bthis\s+week\b/gi, ' ')
  } else if (/\bthis\s+month\b/i.test(remaining)) {
    const d = startOfDay(new Date())
    d.setDate(1)
    result.afterIso = result.afterIso ?? d.toISOString()
    remaining = remaining.replace(/\bthis\s+month\b/gi, ' ')
  }

  result.text = remaining.replace(/\s+/g, ' ').trim().toLowerCase()
  return result
}

export function matchesTimeRange(
  createdAt: string,
  afterIso?: string,
  beforeIso?: string,
): boolean {
  if (afterIso && createdAt < afterIso) return false
  if (beforeIso && createdAt > beforeIso) return false
  return true
}

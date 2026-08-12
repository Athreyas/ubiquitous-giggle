import type { MemoryItem } from '../types'

/**
 * A small, fast, on-device search engine.
 *
 * Upgrades Daymark from a naive substring `includes` to a ranked, multi-term,
 * fielded search that also looks inside extracted data (OCR text, keywords,
 * captions, URL signals). Every query term must match somewhere (AND); each
 * match is scored by field weight and match quality (exact > prefix > partial).
 *
 * This is the query surface the "insightful search" idea plugs into — a future
 * semantic (embeddings) provider can blend its cosine score in via `semantic`.
 */

interface Field {
  key: keyof SearchDoc
  weight: number
}

interface SearchDoc {
  title: string
  tags: string
  keywords: string
  summary: string
  note: string
  extracted: string
  host: string
}

const FIELDS: Field[] = [
  { key: 'title', weight: 6 },
  { key: 'tags', weight: 4 },
  { key: 'keywords', weight: 3 },
  { key: 'note', weight: 2.5 },
  { key: 'summary', weight: 2 },
  { key: 'extracted', weight: 1.6 },
  { key: 'host', weight: 1.5 },
]

function host(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function buildDoc(item: MemoryItem): SearchDoc {
  return {
    title: item.title.toLowerCase(),
    tags: item.tags.join(' ').toLowerCase(),
    keywords: (item.keywords ?? []).join(' ').toLowerCase(),
    summary: item.summary.toLowerCase(),
    note: (item.note ?? '').toLowerCase(),
    extracted: (item.extractedText ?? '').toLowerCase(),
    host: host(item.url),
  }
}

export function tokenize(q: string): string[] {
  return [...new Set(q.toLowerCase().split(/[^\p{L}0-9@#]+/u).filter((t) => t.length >= 1))]
}

/** Score one field for one term: 3 exact word, 2 prefix, 1 substring, 0 none. */
function scoreField(text: string, term: string): number {
  if (!text) return 0
  const words = text.split(/\s+/)
  if (words.includes(term)) return 3
  if (words.some((w) => w.startsWith(term))) return 2
  if (text.includes(term)) return 1
  return 0
}

export interface SearchHit {
  item: MemoryItem
  score: number
}

export function searchItems(items: MemoryItem[], query: string): SearchHit[] {
  const terms = tokenize(query)
  if (terms.length === 0) return items.map((item) => ({ item, score: 0 }))

  const hits: SearchHit[] = []
  for (const item of items) {
    const doc = buildDoc(item)
    let total = 0
    let matchedAllTerms = true

    for (const term of terms) {
      let termScore = 0
      for (const field of FIELDS) {
        termScore += scoreField(doc[field.key], term) * field.weight
      }
      if (termScore === 0) {
        matchedAllTerms = false
        break
      }
      total += termScore
    }

    if (matchedAllTerms) hits.push({ item, score: total })
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return +new Date(b.item.createdAt) - +new Date(a.item.createdAt)
  })
  return hits
}

/** Convenience: just the ranked items for a query (all items if query empty). */
export function search(items: MemoryItem[], query: string): MemoryItem[] {
  return searchItems(items, query).map((h) => h.item)
}

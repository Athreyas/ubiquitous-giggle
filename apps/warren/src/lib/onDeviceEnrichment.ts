/**
 * On-device enrichment helpers (MARK-3 web path).
 * Uses a local hashed embedding with zero cloud LLM calls.
 * Swap `embedText` for transformers.js / CoreML when models are wired.
 */

const STOP = new Set([
  'and',
  'the',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'was',
  'have',
  'has',
])

export function extractKeywords(text: string, limit = 5): string[] {
  const counts = new Map<string, number>()
  for (const word of text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? []) {
    if (STOP.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w)
}

/** Fast deterministic embedding for browser — no model download. */
export async function embedText(text: string, dims = 384): Promise<{ model: string; vector: number[] }> {
  const encoder = new TextEncoder()
  const tokens = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? ['empty']
  const vector = new Array<number>(dims).fill(0)

  for (const token of tokens) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)))
    for (let i = 0; i < dims; i += 1) {
      const byte = digest[i % digest.length]
      vector[i] += ((byte / 255) * 2 - 1) / Math.sqrt(tokens.length)
    }
  }

  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm) || 1
  return {
    model: 'warren-hash-v1',
    vector: vector.map((value) => value / norm),
  }
}

export function buildEnrichmentText(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join('\n\n').slice(0, 200_000)
}

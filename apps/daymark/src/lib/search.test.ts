import { describe, expect, it } from 'vitest'
import { search, searchItems, tokenize } from './search'
import { enrichItem } from './extract'
import type { MemoryItem } from '../types'

function item(partial: Partial<MemoryItem>): MemoryItem {
  return enrichItem({
    id: Math.random().toString(36),
    type: 'link',
    title: '',
    summary: '',
    tags: [],
    platform: 'other',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  })
}

const items: MemoryItem[] = [
  item({
    id: 'pasta',
    title: 'Weeknight miso butter pasta',
    summary: 'Ten minute pasta with brown butter and miso',
    url: 'https://cooking.nytimes.com/recipes/miso-butter-pasta',
    tags: ['cooking', 'recipe'],
    platform: 'youtube',
  }),
  item({
    id: 'focaccia',
    title: 'No-knead focaccia',
    summary: 'Overnight bread with olive oil and salt',
    tags: ['baking', 'recipe'],
    platform: 'article',
  }),
  item({
    id: 'boarding',
    title: 'Screenshot',
    summary: '',
    platform: 'image',
    extractedText: 'Boarding pass Tokyo Haneda gate 42 seat 14C',
  }),
  item({
    id: 'sleep',
    title: 'How sleep shapes creative insight',
    summary: 'REM cycles and remote associations',
    tags: ['health'],
    platform: 'article',
  }),
]

describe('tokenize', () => {
  it('splits and de-dupes, keeps # and @', () => {
    expect(tokenize('Miso  miso #food @ana')).toEqual(['miso', '#food', '@ana'])
  })
})

describe('searchItems', () => {
  it('finds by title and ranks exact title matches high', () => {
    const hits = searchItems(items, 'pasta')
    expect(hits[0].item.id).toBe('pasta')
  })

  it('requires all terms to match (AND semantics)', () => {
    expect(search(items, 'miso pasta').map((i) => i.id)).toEqual(['pasta'])
    expect(search(items, 'miso focaccia')).toHaveLength(0)
  })

  it('searches inside extracted OCR text', () => {
    expect(search(items, 'haneda').map((i) => i.id)).toEqual(['boarding'])
    expect(search(items, 'boarding tokyo').map((i) => i.id)).toEqual(['boarding'])
  })

  it('matches tags and url host', () => {
    expect(search(items, 'recipe').map((i) => i.id).sort()).toEqual(['focaccia', 'pasta'])
    expect(search(items, 'nytimes').map((i) => i.id)).toEqual(['pasta'])
  })

  it('returns everything for an empty query', () => {
    expect(search(items, '')).toHaveLength(items.length)
  })

  it('returns nothing for a non-match', () => {
    expect(search(items, 'zzzznomatch')).toHaveLength(0)
  })
})

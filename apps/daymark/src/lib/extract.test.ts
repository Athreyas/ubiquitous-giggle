import { describe, expect, it } from 'vitest'
import {
  enrichItem,
  extractHashtags,
  extractKeywords,
  extractMentions,
  extractUrlSignals,
} from './extract'
import type { MemoryItem } from '../types'

const base: MemoryItem = {
  id: 't1',
  type: 'link',
  title: '',
  summary: '',
  tags: [],
  platform: 'other',
  createdAt: new Date().toISOString(),
}

describe('extractHashtags / extractMentions', () => {
  it('pulls hashtags and mentions from a caption', () => {
    const cap = 'Night market eats 🌶️ #streetfood #chiangmai by @chef_ana and @travel.diaries'
    expect(extractHashtags(cap)).toEqual(['streetfood', 'chiangmai'])
    expect(extractMentions(cap)).toEqual(['chef_ana', 'travel.diaries'])
  })
})

describe('extractKeywords', () => {
  it('drops stopwords, numbers and short tokens, keeps meaningful words', () => {
    const kw = extractKeywords('The quick brown fox jumps over the lazy dog 123 fox')
    expect(kw).toContain('fox')
    expect(kw).toContain('brown')
    expect(kw).not.toContain('the')
    expect(kw).not.toContain('123')
    // "fox" appears twice → ranked first
    expect(kw[0]).toBe('fox')
  })
})

describe('extractUrlSignals', () => {
  it('extracts host label and path words', () => {
    const s = extractUrlSignals('https://cooking.nytimes.com/recipes/1018147-miso-butter-pasta')
    expect(s).toContain('miso')
    expect(s).toContain('butter')
    expect(s).toContain('pasta')
    expect(s.some((w) => w.includes('nytimes') || w.includes('cooking'))).toBe(true)
  })
})

describe('enrichItem', () => {
  it('folds hashtags/mentions into tags and builds keywords', () => {
    const item = enrichItem({
      ...base,
      title: 'Crispy roti reel',
      summary: 'Amazing #streetfood in Chiang Mai by @chef_ana',
      url: 'https://www.instagram.com/reel/ABC/',
      tags: ['instagram'],
      platform: 'instagram',
    })
    expect(item.tags).toEqual(expect.arrayContaining(['instagram', 'streetfood', '@chef_ana']))
    expect(item.keywords).toEqual(expect.arrayContaining(['streetfood', 'chef_ana']))
  })

  it('indexes extractedText (e.g. OCR output) into keywords', () => {
    const item = enrichItem({
      ...base,
      title: 'Screenshot',
      summary: '',
      platform: 'image',
      extractedText: 'Boarding pass Tokyo Haneda gate 42 seat 14C',
    })
    expect(item.keywords).toEqual(expect.arrayContaining(['boarding', 'tokyo', 'haneda']))
  })

  it('is idempotent', () => {
    const once = enrichItem({ ...base, title: 'hello world', summary: 'hello again' })
    const twice = enrichItem(once)
    expect(twice.keywords).toEqual(once.keywords)
    expect(twice.tags).toEqual(once.tags)
  })
})

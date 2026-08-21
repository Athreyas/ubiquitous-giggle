import { describe, expect, it } from 'vitest'

import { matchesTimeRange, parseSearchQuery } from '../src/searchQuery.js'

describe('parseSearchQuery', () => {
  it('strips last week and leaves the free-text needle', () => {
    const parsed = parseSearchQuery('gardening last week')
    expect(parsed.text).toBe('gardening')
    expect(parsed.afterIso).toBeTruthy()
  })

  it('parses platform, tag, and never opened', () => {
    const parsed = parseSearchQuery('platform:note tag:ideas never opened deep work')
    expect(parsed.platform).toBe('note')
    expect(parsed.tag).toBe('ideas')
    expect(parsed.neverOpened).toBe(true)
    expect(parsed.text).toBe('deep work')
  })

  it('matches time ranges inclusively', () => {
    expect(matchesTimeRange('2024-06-01T00:00:00.000Z', '2024-05-01T00:00:00.000Z')).toBe(true)
    expect(matchesTimeRange('2024-04-01T00:00:00.000Z', '2024-05-01T00:00:00.000Z')).toBe(false)
  })
})

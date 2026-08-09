import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { MemoryItem, Platform } from '../types'
import { MemoryCard } from './MemoryCard'
import { IconSearch } from './Icons'
import { search } from '../lib/search'

interface Props {
  items: MemoryItem[]
  loading: boolean
  error?: string | null
  onOpen: (item: MemoryItem) => void
}

type Filter = 'all' | Platform

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'article', label: 'Articles' },
  { key: 'youtube', label: 'Videos' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'image', label: 'Screenshots' },
  { key: 'note', label: 'Notes' },
]

export function LibraryView({ items, loading, error, onOpen }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const byPlatform =
      filter === 'all' ? items : items.filter((item) => item.platform === filter)
    // Ranked, multi-term search across titles, tags, notes, URLs and
    // on-device–extracted text (OCR/keywords). Empty query keeps order.
    return search(byPlatform, query)
  }, [items, query, filter])

  const available = useMemo(() => {
    const set = new Set(items.map((i) => i.platform))
    return FILTERS.filter((f) => f.key === 'all' || set.has(f.key as Platform))
  }, [items])

  return (
    <div>
      <header className="view-head">
        <div className="kicker">Your library</div>
        <h1 className="display-title">
          Everything you <span className="grad">saved</span>
        </h1>
        <p className="view-lede">
          Your whole second brain in one calm, visual place. Search by word or filter by
          where it came from.
        </p>
      </header>

      <div className="toolbar">
        <label className="search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search titles, notes, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your library"
          />
        </label>
        <div className="filters">
          {available.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state">
          <div className="spinner" />
          <h3>Loading your library…</h3>
        </div>
      ) : error ? (
        <div className="state">
          <h3>Couldn&apos;t reach your library</h3>
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="state">
          <h3>Nothing here yet</h3>
          <p>No saves match that search. Try another word or clear the filter.</p>
        </div>
      ) : (
        <motion.div className="card-grid" layout>
          {filtered.map((item, i) => (
            <MemoryCard key={item.id} item={item} index={i} onOpen={onOpen} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

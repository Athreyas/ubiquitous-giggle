import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { MemoryCard } from './MemoryCard'
import { IconChevron, IconFolder } from './Icons'
import { platformLabel } from '../lib/platform'

interface Props {
  items: MemoryItem[]
  onOpen: (item: MemoryItem) => void
}

interface Collection {
  key: string
  label: string
  items: MemoryItem[]
  accent: string
}

/** Group library into elaborate, expandable collections (by top tag / platform). */
function buildCollections(items: MemoryItem[]): Collection[] {
  const byTag = new Map<string, MemoryItem[]>()
  for (const item of items) {
    const tag = item.tags[0]?.toLowerCase()
    const key = tag || `platform:${item.platform}`
    const list = byTag.get(key) ?? []
    list.push(item)
    byTag.set(key, list)
  }

  const accents = [
    'linear-gradient(135deg,#8b6dff,#e05cc0)',
    'linear-gradient(135deg,#ff8360,#ffcf7a)',
    'linear-gradient(135deg,#5ad1c9,#8b6dff)',
    'linear-gradient(135deg,#e05cc0,#ff8360)',
    'linear-gradient(135deg,#ffcf7a,#5ad1c9)',
  ]

  return [...byTag.entries()]
    .map(([key, list], i) => ({
      key,
      label: key.startsWith('platform:')
        ? platformLabel(key.slice('platform:'.length) as MemoryItem['platform'])
        : key.replace(/^@/, ''),
      items: list,
      accent: accents[i % accents.length],
    }))
    .filter((c) => c.items.length >= 1)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 8)
}

function CollectionRow({
  collection,
  open,
  onToggle,
  onOpen,
}: {
  collection: Collection
  open: boolean
  onToggle: () => void
  onOpen: (item: MemoryItem) => void
}) {
  return (
    <motion.section
      className={`collection ${open ? 'is-open' : ''}`}
      layout
      initial={false}
    >
      <motion.button
        type="button"
        className="collection-head"
        onClick={onToggle}
        aria-expanded={open}
        whileTap={{ scale: 0.995 }}
      >
        <span className="collection-mark" style={{ background: collection.accent }}>
          <IconFolder />
        </span>
        <span className="collection-meta">
          <span className="collection-name">{collection.label}</span>
          <span className="collection-count">
            {collection.items.length} {collection.items.length === 1 ? 'save' : 'saves'}
          </span>
        </span>
        {/* Peek stack of cover thumbs when closed */}
        <span className="collection-peek" aria-hidden>
          {collection.items.slice(0, 3).map((item, i) => (
            <span
              key={item.id}
              className="peek-tile"
              style={{
                zIndex: 3 - i,
                transform: `translateX(${i * -10}px) rotate(${(i - 1) * 4}deg)`,
                backgroundImage: item.thumbnailUrl ? `url(${item.thumbnailUrl})` : undefined,
              }}
            />
          ))}
        </span>
        <motion.span
          className="collection-chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <IconChevron />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            className="collection-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
          >
            <motion.div
              className="card-grid"
              layout
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {collection.items.map((item, i) => (
                <MemoryCard key={item.id} item={item} index={i} onOpen={onOpen} />
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  )
}

export function Collections({ items, onOpen }: Props) {
  const collections = useMemo(() => buildCollections(items), [items])
  const [openKey, setOpenKey] = useState<string | null>(collections[0]?.key ?? null)

  if (collections.length === 0) return null

  return (
    <section className="collections">
      <div className="section-label">
        <h3>Collections</h3>
        <span className="rule" />
        <span className="count">{collections.length} groups</span>
      </div>
      <div className="collection-list">
        {collections.map((c) => (
          <CollectionRow
            key={c.key}
            collection={c}
            open={openKey === c.key}
            onToggle={() => setOpenKey((k) => (k === c.key ? null : c.key))}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  )
}

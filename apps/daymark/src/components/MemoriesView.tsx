import { AnimatePresence, motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { SpotlightCard } from './SpotlightCard'
import { MemoryCard } from './MemoryCard'
import { IconShuffle } from './Icons'

interface Props {
  todayLabel: string
  spotlight: MemoryItem[]
  feed: MemoryItem[]
  loading: boolean
  error?: string | null
  onOpen: (item: MemoryItem) => void
  onDismiss: (item: MemoryItem) => void
  onShuffle: () => void
}

export function MemoriesView({
  todayLabel,
  spotlight,
  feed,
  loading,
  error,
  onOpen,
  onDismiss,
  onShuffle,
}: Props) {
  return (
    <div>
      <header className="view-head memories-head">
        <div>
          <div className="kicker">Today · {todayLabel}</div>
          <h1 className="display-title">
            Your <span className="grad">memories</span>
          </h1>
          <p className="view-lede">
            A calm resurfacing of things you saved and almost forgot — reels, recipes,
            places and ideas from your second brain. Swipe a card away, or open it again.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onShuffle}>
          <IconShuffle /> Show different
        </button>
      </header>

      {loading ? (
        <div className="state">
          <div className="spinner" />
          <h3>Gathering memories…</h3>
          <p>Looking through your saves for something worth a second look.</p>
        </div>
      ) : error ? (
        <div className="state">
          <h3>Couldn&apos;t reach your library</h3>
          <p>{error}</p>
        </div>
      ) : spotlight.length === 0 ? (
        <div className="state">
          <h3>Nothing forgotten yet</h3>
          <p>
            Save a few links, reels or notes, let them rest a week, and Daymark will start
            resurfacing them here.
          </p>
        </div>
      ) : (
        <>
          <section className="spotlight">
            <div className="spotlight-deck">
              <AnimatePresence mode="popLayout">
                {spotlight.map((item, i) => (
                  <SpotlightCard
                    key={item.id}
                    item={item}
                    index={i}
                    onOpen={onOpen}
                    onDismiss={onDismiss}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {feed.length > 0 ? (
            <section>
              <div className="section-label">
                <h3>More from your past</h3>
                <span className="rule" />
                <span className="count">{feed.length} resurfaced</span>
              </div>
              <motion.div className="card-grid" layout>
                {feed.map((item, i) => (
                  <MemoryCard key={item.id} item={item} index={i} onOpen={onOpen} />
                ))}
              </motion.div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

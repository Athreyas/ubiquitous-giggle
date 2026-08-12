import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
  onOpenCard: (item: MemoryItem) => void
  onDismiss: (item: MemoryItem) => void
  onShuffle: () => void
}

const EMPTY_ASCII = `    .--.
   /    \\
  |  ()  |   a quiet warren
   \\    /
    '--'`

export function MemoriesView({
  todayLabel,
  spotlight,
  feed,
  loading,
  error,
  onOpen,
  onOpenCard,
  onDismiss,
  onShuffle,
}: Props) {
  const reduce = useReducedMotion()

  return (
    <div className="echo">
      <header className="echo-head">
        <div>
          <div className="kicker">Daily Echo · {todayLabel}</div>
          <h1 className="echo-title">Today&apos;s quiet returns</h1>
          <p className="echo-lede">
            A calm resurfacing of things you saved and almost forgot. Open a Star again —
            or set it aside for another day.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onShuffle}>
          <IconShuffle /> Show different
        </button>
      </header>

      {loading ? (
        <div className="state">
          <div className="spinner" />
          <h3>Gathering today&apos;s Echo…</h3>
          <p>Looking through your saves for something worth a second look.</p>
        </div>
      ) : error ? (
        <div className="state">
          <h3>Couldn&apos;t reach your library</h3>
          <p>{error}</p>
        </div>
      ) : spotlight.length === 0 ? (
        <div className="state">
          <pre className="ascii">{EMPTY_ASCII}</pre>
          <h3>No Echo yet</h3>
          <p>
            Save a few links, reels or notes, let them rest a week, and Warren will start
            resurfacing them here.
          </p>
        </div>
      ) : (
        <>
          <section className="spotlight" aria-label="Today's Stars">
            <div className="spotlight-deck">
              <AnimatePresence mode="popLayout">
                {spotlight.map((item, i) => (
                  <SpotlightCard
                    key={item.id}
                    item={item}
                    index={i}
                    onOpen={onOpen}
                    onDismiss={onDismiss}
                    reduceMotion={Boolean(reduce)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {feed.length > 0 ? (
            <section className="echo-more">
              <div className="echo-more-head">
                <h3>More from your past</h3>
                <span>{feed.length} resurfaced</span>
              </div>
              <div className="echo-feed">
                {feed.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : 0.04 * i, duration: reduce ? 0 : 0.28 }}
                  >
                    <MemoryCard item={item} onOpen={onOpenCard} />
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

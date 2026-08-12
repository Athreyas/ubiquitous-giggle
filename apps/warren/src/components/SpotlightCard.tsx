import { motion, useMotionValue, useTransform } from 'motion/react'
import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { PlatformBadge } from './PlatformBadge'
import { IconArrow, IconExternal } from './Icons'

interface Props {
  item: MemoryItem
  index: number
  onOpen: (item: MemoryItem) => void
  onDismiss: (item: MemoryItem) => void
  reduceMotion?: boolean
}

/** Star card — Daily Echo spotlight. Swipe dismiss never greys/strikes (no-decay). */
export function SpotlightCard({ item, index, onOpen, onDismiss, reduceMotion }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-260, 260], [-5, 5])
  const opacity = useTransform(x, [-260, -90, 0, 90, 260], [0.35, 1, 1, 1, 0.35])
  const keepOpacity = useTransform(x, [40, 150], [0, 1])
  const skipOpacity = useTransform(x, [-150, -40], [1, 0])

  return (
    <motion.article
      layoutId={reduceMotion ? undefined : `star-${item.id}`}
      className="star-card"
      style={reduceMotion ? undefined : { x, rotate, opacity }}
      drag={reduceMotion ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      whileDrag={reduceMotion ? undefined : { scale: 1.01, cursor: 'grabbing' }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 500) {
          onDismiss(item)
        }
      }}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, x: 40, transition: { duration: 0.28, ease: 'easeOut' } }
      }
      transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : index * 0.06 }}
    >
      {item.thumbnailUrl ? (
        <div className="star-media" style={{ backgroundImage: `url(${item.thumbnailUrl})` }} />
      ) : (
        <div className="star-noimg" />
      )}

      {!reduceMotion ? (
        <>
          <motion.div className="swipe-hint keep" style={{ opacity: keepOpacity }}>
            <span>Keep</span>
          </motion.div>
          <motion.div className="swipe-hint skip" style={{ opacity: skipOpacity }}>
            <span>Not today</span>
          </motion.div>
        </>
      ) : null}

      <div className="star-body">
        <div className="star-meta">
          <PlatformBadge platform={item.platform} />
          <span>{humanAge(item)}</span>
        </div>
        <h2>{item.title}</h2>
        <p className="star-summary">{item.summary}</p>
        <div className="star-actions">
          <button type="button" className="btn btn-primary" onClick={() => onOpen(item)}>
            {item.url ? (
              <>
                Open again <IconExternal />
              </>
            ) : (
              <>
                Read note <IconArrow />
              </>
            )}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onDismiss(item)}>
            Not today
          </button>
        </div>
      </div>
    </motion.article>
  )
}

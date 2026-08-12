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
}

export function SpotlightCard({ item, index, onOpen, onDismiss }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-260, 260], [-7, 7])
  const opacity = useTransform(x, [-260, -90, 0, 90, 260], [0, 1, 1, 1, 0])
  const keepOpacity = useTransform(x, [40, 150], [0, 1])
  const skipOpacity = useTransform(x, [-150, -40], [1, 0])

  return (
    <motion.article
      className="spot-card"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      whileDrag={{ scale: 1.01, cursor: 'grabbing' }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 500) {
          onDismiss(item)
        }
      }}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, filter: 'blur(4px)', transition: { duration: 0.24 } }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {item.thumbnailUrl ? (
        <div className="spot-media" style={{ backgroundImage: `url(${item.thumbnailUrl})` }} />
      ) : (
        <div
          className="spot-noimg"
          style={{ background: 'linear-gradient(150deg,#241f45,#12101d 70%)' }}
        />
      )}
      <div className="spot-scrim" />

      <motion.div className="swipe-hint" style={{ opacity: keepOpacity }}>
        <span>Keep</span>
      </motion.div>
      <motion.div className="swipe-hint" style={{ opacity: skipOpacity }}>
        <span>Not today</span>
      </motion.div>

      <div className="spot-top">
        <PlatformBadge platform={item.platform} />
        <span className="spot-age">{humanAge(item)}</span>
      </div>

      <div className="spot-body">
        <h2>{item.title}</h2>
        <p className="spot-summary">{item.summary}</p>
        {item.note ? <p className="spot-note">Your note: {item.note}</p> : null}
        <div className="spot-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpen(item)}
          >
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

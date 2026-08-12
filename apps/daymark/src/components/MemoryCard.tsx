import { motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { PlatformBadge } from './PlatformBadge'

interface Props {
  item: MemoryItem
  index?: number
  onOpen: (item: MemoryItem) => void
}

export function MemoryCard({ item, index = 0, onOpen }: Props) {
  return (
    <motion.article
      className="mcard"
      layoutId={`card-${item.id}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.045, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(item)
        }
      }}
    >
      <div className={`mcard-media ${item.thumbnailUrl ? '' : 'noimg'}`}>
        <PlatformBadge platform={item.platform} />
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="mcard-noimg-glyph">{item.title.slice(0, 1)}</span>
        )}
      </div>
      <div className="mcard-body">
        <p className="mcard-age">{humanAge(item)}</p>
        <h3>{item.title}</h3>
        <p className="mcard-summary">{item.summary}</p>
        {item.tags.length > 0 ? (
          <div className="mcard-tags">
            {item.tags.slice(0, 3).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.article>
  )
}

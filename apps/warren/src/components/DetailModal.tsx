import { motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { platformMeta } from '../lib/platform'
import { PlatformBadge } from './PlatformBadge'
import { IconClose, IconExternal } from './Icons'

interface Props {
  item: MemoryItem
  onClose: () => void
  onOpen: (item: MemoryItem) => void
}

export function DetailModal({ item, onClose, onOpen }: Props) {
  const meta = platformMeta(item.platform)
  return (
    <motion.div
      className="scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="detail"
        layoutId={`card-${item.id}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        <div className={`detail-media ${item.thumbnailUrl ? '' : 'noimg'}`}>
          <PlatformBadge platform={item.platform} />
          <button
            type="button"
            className="icon-btn detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose />
          </button>
          {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : null}
        </div>
        <div className="detail-body">
          <div className="detail-meta">
            <span>{meta.label}</span>
            <span>·</span>
            <span>{humanAge(item)}</span>
          </div>
          <h2>{item.title}</h2>
          <p className="lede">{item.summary}</p>
          {item.note ? (
            <p className="detail-note">
              <b>Your note</b> — {item.note}
            </p>
          ) : null}
          {item.tags.length > 0 ? (
            <div className="mcard-tags">
              {item.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="detail-actions">
            {item.url ? (
              <a
                className="btn btn-primary"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpen(item)}
              >
                Open original <IconExternal />
              </a>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => onOpen(item)}>
                Marked as revisited
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

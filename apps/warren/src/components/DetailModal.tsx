import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { LibrarySettings, MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { platformMeta } from '../lib/platform'
import { PlatformBadge } from './PlatformBadge'
import { IconClose, IconExternal } from './Icons'
import { fetchRelatedSaves, type RelatedSave } from '../lib/api/related'
import { createSaveLink } from '../lib/api/constellations'

interface Props {
  item: MemoryItem
  settings: LibrarySettings
  onClose: () => void
  onOpen: (item: MemoryItem) => void
  onOpenRelated: (item: MemoryItem) => void
}

export function DetailModal({ item, settings, onClose, onOpen, onOpenRelated }: Props) {
  const meta = platformMeta(item.platform)
  const [related, setRelated] = useState<RelatedSave[]>([])
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const canFetchRelated = !settings.useDemo && Boolean(settings.token)

  useEffect(() => {
    if (!canFetchRelated) {
      setRelated([])
      return
    }
    let cancelled = false
    fetchRelatedSaves(settings, item.id)
      .then((res) => {
        if (!cancelled) setRelated(res.items)
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
    return () => {
      cancelled = true
    }
  }, [canFetchRelated, item.id, settings])

  const handleLink = async (target: RelatedSave) => {
    if (!canFetchRelated || linkingId) return
    setLinkingId(target.id)
    try {
      await createSaveLink(settings, item.id, target.id)
      setLinkedIds((ids) => [...ids, target.id])
    } catch {
      // Duplicate or offline — ignore for now.
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <motion.div
      className="scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="detail sheet"
        layoutId={`star-${item.id}`}
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

          {related.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <div className="lbl" style={{ marginBottom: 8 }}>
                This relates to…
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {related.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '8px 10px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ justifyContent: 'flex-start', flex: 1 }}
                      onClick={() => onOpenRelated(row)}
                    >
                      {row.title}
                      <span style={{ opacity: 0.55, marginLeft: 8 }}>
                        {Math.round(row.similarity * 100)}%
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={linkingId === row.id || linkedIds.includes(row.id)}
                      onClick={() => void handleLink(row)}
                    >
                      {linkedIds.includes(row.id) ? 'Linked' : 'Link'}
                    </button>
                  </div>
                ))}
              </div>
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

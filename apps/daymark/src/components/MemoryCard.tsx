import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { platformLabel } from '../lib/platform'

interface Props {
  item: MemoryItem
  onOpen: (item: MemoryItem) => void
  onDismiss: (item: MemoryItem) => void
}

export function MemoryCard({ item, onOpen, onDismiss }: Props) {
  return (
    <article className="memory-card">
      <div className="memory-media" aria-hidden={!item.thumbnailUrl}>
        <span className="memory-platform">{platformLabel(item.platform)}</span>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" loading="lazy" />
        ) : null}
      </div>
      <div className="memory-body">
        <p className="memory-age">{humanAge(item)}</p>
        <h2>{item.title}</h2>
        <p className="memory-summary">{item.summary}</p>
        {item.note ? <p className="memory-note">Your note: {item.note}</p> : null}
        {item.tags.length > 0 ? (
          <div className="tag-row">
            {item.tags.slice(0, 6).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="memory-actions">
          <button type="button" className="btn-primary" onClick={() => onOpen(item)}>
            {item.url ? 'Open again' : 'Read note'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onDismiss(item)}
          >
            Not today
          </button>
        </div>
      </div>
    </article>
  )
}

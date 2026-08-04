import type { MemoryItem } from '../types'
import { MemoryCard } from './MemoryCard'

interface Props {
  items: MemoryItem[]
  loading: boolean
  error?: string | null
  onOpen: (item: MemoryItem) => void
  onDismiss: (item: MemoryItem) => void
  onShuffle: () => void
  onEnterLibrary: () => void
  onOpenSettings: () => void
}

export function MemoryOverlay({
  items,
  loading,
  error,
  onOpen,
  onDismiss,
  onShuffle,
  onEnterLibrary,
  onOpenSettings,
}: Props) {
  return (
    <div className="memory-overlay" role="dialog" aria-modal="true" aria-labelledby="memory-title">
      <div className="memory-stage">
        <header className="memory-header">
          <div className="memory-kicker">Daymark</div>
          <h1 className="memory-title" id="memory-title">
            Today&apos;s memory
          </h1>
          <p className="memory-lede">
            A quiet pull from your second brain — things you saved, then almost forgot.
          </p>
        </header>

        {loading ? (
          <div className="empty-memory">
            <h2>Gathering memories…</h2>
            <p>Looking through your saves for something worth a second look.</p>
          </div>
        ) : error ? (
          <div className="empty-memory">
            <h2>Couldn&apos;t reach your library</h2>
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-memory">
            <h2>Nothing forgotten yet</h2>
            <p>
              Save a few links or notes, wait a week, and Daymark will start resurfacing them.
            </p>
          </div>
        ) : (
          <div className={`memory-rail ${items.length > 1 ? 'has-two' : ''}`}>
            {items.map((item) => (
              <MemoryCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        )}

        <div className="overlay-toolbar">
          <button type="button" className="ghost-btn" onClick={onShuffle}>
            Show different ones
          </button>
          <button type="button" className="ghost-btn" onClick={onEnterLibrary}>
            Enter library
          </button>
          <button type="button" className="ghost-btn" onClick={onOpenSettings}>
            Connect library
          </button>
        </div>
      </div>
    </div>
  )
}

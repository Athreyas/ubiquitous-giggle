import { useCallback, useEffect, useMemo, useState } from 'react'
import { MemoryOverlay } from './components/MemoryOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { DEMO_ITEMS } from './lib/demoData'
import { fetchKarakeepBookmarks } from './lib/karakeep'
import {
  markDismissed,
  markOpened,
  markSurfaced,
  selectDailyMemories,
  todayKey,
} from './lib/selection'
import {
  loadSettings,
  loadSurfacing,
  saveSettings,
  saveSurfacing,
} from './lib/storage'
import type { KarakeepSettings, MemoryItem, SurfacingState } from './types'

export default function App() {
  const [settings, setSettings] = useState<KarakeepSettings>(() => loadSettings())
  const [surfacing, setSurfacing] = useState<SurfacingState>(() => loadSurfacing())
  const [library, setLibrary] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shuffleSalt, setShuffleSalt] = useState(0)
  const [showMemory, setShowMemory] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [noteView, setNoteView] = useState<MemoryItem | null>(null)

  const persistSurfacing = useCallback((next: SurfacingState) => {
    setSurfacing(next)
    saveSurfacing(next)
  }, [])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (settings.useDemo) {
        setLibrary(DEMO_ITEMS)
        return
      }
      if (!settings.baseUrl || !settings.apiKey) {
        throw new Error('Add your Karakeep URL and API key, or enable demo mode.')
      }
      const items = await fetchKarakeepBookmarks(settings.baseUrl, settings.apiKey)
      setLibrary(items)
    } catch (err) {
      setLibrary([])
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const memories = useMemo(
    () => selectDailyMemories(library, surfacing, { count: 2, shuffleSalt }),
    [library, surfacing, shuffleSalt],
  )

  const memoryIds = memories.map((m) => m.id).join('|')

  useEffect(() => {
    if (loading || !memoryIds) return
    const day = todayKey()
    const ids = memoryIds.split('|')
    setSurfacing((prev) => {
      const current = prev.byDay[day] ?? []
      const same =
        current.length === ids.length && current.every((id, i) => id === ids[i])
      if (same) return prev
      const next = markSurfaced(prev, ids)
      saveSurfacing(next)
      return next
    })
  }, [loading, memoryIds])

  const handleOpen = (item: MemoryItem) => {
    persistSurfacing(markOpened(surfacing, item.id))
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    } else {
      setNoteView(item)
    }
  }

  const handleDismiss = (item: MemoryItem) => {
    const next = markDismissed(surfacing, item.id)
    persistSurfacing(next)
    setShuffleSalt((s) => s + 1)
  }

  const handleShuffle = () => {
    setShuffleSalt((s) => s + 1)
  }

  const handleSaveSettings = (next: KarakeepSettings) => {
    setSettings(next)
    saveSettings(next)
    setShowSettings(false)
    setShuffleSalt(0)
  }

  return (
    <div className="app-shell">
      <div className={`library-backdrop ${showMemory ? 'is-dimmed' : ''}`}>
        <header className="topbar">
          <div className="brand-mark">
            <div className="brand-orb" aria-hidden />
            <div>
              <div className="brand-name">Daymark</div>
              <p className="brand-sub">Your second brain, remembered daily</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ghost-btn" onClick={() => setShowMemory(true)}>
              Today&apos;s memory
            </button>
            <button type="button" className="ghost-btn" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </div>
        </header>

        <section className="library-grid" aria-label="Library preview">
          {(library.length ? library : DEMO_ITEMS).slice(0, 8).map((item) => (
            <article className="library-tile" key={item.id}>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </section>
      </div>

      {showMemory ? (
        <MemoryOverlay
          items={memories}
          loading={loading}
          error={error}
          onOpen={handleOpen}
          onDismiss={handleDismiss}
          onShuffle={handleShuffle}
          onEnterLibrary={() => setShowMemory(false)}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : null}

      {showSettings ? (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      ) : null}

      {noteView ? (
        <div className="settings-panel" role="dialog" aria-modal="true">
          <div className="settings-card">
            <h2>{noteView.title}</h2>
            <p>{noteView.summary}</p>
            {noteView.note ? <p className="memory-note">{noteView.note}</p> : null}
            <div className="settings-actions">
              <button type="button" className="btn-primary" onClick={() => setNoteView(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

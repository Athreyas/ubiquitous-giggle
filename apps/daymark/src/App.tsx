import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { NavRail, type ViewKey } from './components/NavRail'
import { MemoriesView } from './components/MemoriesView'
import { LibraryView } from './components/LibraryView'
import { ImportView } from './components/ImportView'
import { CaptureView } from './components/CaptureView'
import { AmbientBackground } from './components/AmbientBackground'
import { DetailModal } from './components/DetailModal'
import { SettingsPanel } from './components/SettingsPanel'
import { DEMO_ITEMS } from './lib/demoData'
import { fetchKarakeepBookmarks } from './lib/karakeep'
import { enrichAll } from './lib/extract'
import { addImported, loadImported, mergeLibrary } from './lib/importStore'
import { markDismissed, markOpened, markSurfaced, selectDailyMemories, todayKey } from './lib/selection'
import { loadSettings, loadSurfacing, saveSettings, saveSurfacing } from './lib/storage'
import type { KarakeepSettings, MemoryItem, SurfacingState } from './types'

export default function App() {
  const [settings, setSettings] = useState<KarakeepSettings>(() => loadSettings())
  const [surfacing, setSurfacing] = useState<SurfacingState>(() => loadSurfacing())
  const [baseLibrary, setBaseLibrary] = useState<MemoryItem[]>([])
  const [imported, setImported] = useState<MemoryItem[]>(() => enrichAll(loadImported()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shuffleSalt, setShuffleSalt] = useState(0)
  const [view, setView] = useState<ViewKey>('memories')
  const [showSettings, setShowSettings] = useState(false)
  const [detail, setDetail] = useState<MemoryItem | null>(null)

  const persistSurfacing = useCallback((next: SurfacingState) => {
    setSurfacing(next)
    saveSurfacing(next)
  }, [])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (settings.useDemo) {
        setBaseLibrary(enrichAll(DEMO_ITEMS))
        return
      }
      if (!settings.baseUrl || !settings.apiKey) {
        throw new Error('Add your Daykeep URL and API key, or turn on demo mode.')
      }
      setBaseLibrary(enrichAll(await fetchKarakeepBookmarks(settings.baseUrl, settings.apiKey)))
    } catch (err) {
      setBaseLibrary([])
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const library = useMemo(() => mergeLibrary(baseLibrary, imported), [baseLibrary, imported])

  const connected = !settings.useDemo && Boolean(settings.baseUrl && settings.apiKey)

  const handleImport = useCallback((items: MemoryItem[]) => {
    setImported(addImported(enrichAll(items)))
  }, [])

  const handleCapture = useCallback((item: MemoryItem) => {
    setImported(addImported([item]))
  }, [])

  const spotlight = useMemo(
    () => selectDailyMemories(library, surfacing, { count: 2, shuffleSalt }),
    [library, surfacing, shuffleSalt],
  )

  const feed = useMemo(() => {
    const ids = new Set(spotlight.map((m) => m.id))
    return selectDailyMemories(library, surfacing, { count: 12, shuffleSalt }).filter(
      (m) => !ids.has(m.id),
    )
  }, [library, surfacing, shuffleSalt, spotlight])

  const spotlightIds = spotlight.map((m) => m.id).join('|')

  useEffect(() => {
    if (loading || !spotlightIds) return
    const day = todayKey()
    const ids = spotlightIds.split('|')
    setSurfacing((prev) => {
      const current = prev.byDay[day] ?? []
      const same = current.length === ids.length && current.every((id, i) => id === ids[i])
      if (same) return prev
      const next = markSurfaced(prev, ids)
      saveSurfacing(next)
      return next
    })
  }, [loading, spotlightIds])

  const markVisited = useCallback(
    (item: MemoryItem) => persistSurfacing(markOpened(surfacing, item.id)),
    [persistSurfacing, surfacing],
  )

  const openDetail = useCallback((item: MemoryItem) => setDetail(item), [])

  const openSpotlight = useCallback(
    (item: MemoryItem) => {
      markVisited(item)
      if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
      else setDetail(item)
    },
    [markVisited],
  )

  const handleDismiss = useCallback(
    (item: MemoryItem) => {
      persistSurfacing(markDismissed(surfacing, item.id))
    },
    [persistSurfacing, surfacing],
  )

  const handleSaveSettings = (next: KarakeepSettings) => {
    setSettings(next)
    saveSettings(next)
    setShowSettings(false)
    setShuffleSalt(0)
  }

  const todayLabel = format(new Date(), 'EEE, MMM d')

  return (
    <div className="app">
      <AmbientBackground />
      <NavRail
        active={view}
        onNavigate={setView}
        onOpenSettings={() => setShowSettings(true)}
        demo={settings.useDemo}
      />

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            className="view-pane"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)', scale: 0.985 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)', scale: 0.99 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === 'memories' ? (
              <MemoriesView
                todayLabel={todayLabel}
                spotlight={spotlight}
                feed={feed}
                loading={loading}
                error={error}
                onOpen={openSpotlight}
                onOpenCard={openDetail}
                onDismiss={handleDismiss}
                onShuffle={() => setShuffleSalt((s) => s + 1)}
              />
            ) : view === 'library' ? (
              <LibraryView
                items={library}
                loading={loading}
                error={error}
                onOpen={openDetail}
              />
            ) : view === 'capture' ? (
              <CaptureView
                onCapture={handleCapture}
                onGoToLibrary={() => setView('library')}
              />
            ) : (
              <ImportView
                connected={connected}
                baseUrl={settings.baseUrl}
                apiKey={settings.apiKey}
                onImport={handleImport}
                onGoToLibrary={() => setView('library')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {detail ? (
          <DetailModal
            key="detail"
            item={detail}
            onClose={() => setDetail(null)}
            onOpen={markVisited}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings ? (
          <SettingsPanel
            key="settings"
            settings={settings}
            onClose={() => setShowSettings(false)}
            onSave={handleSaveSettings}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

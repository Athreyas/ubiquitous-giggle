import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { NavRail, type ViewKey } from './components/NavRail'
import { MemoriesView } from './components/MemoriesView'
import { LibraryView } from './components/LibraryView'
import { DetailModal } from './components/DetailModal'
import { SettingsPanel } from './components/SettingsPanel'
import { DEMO_ITEMS } from './lib/demoData'
import { fetchLibrarySaves } from './lib/api'
import { normalizeBaseUrl } from './lib/api/client'
import { ApiSurfacingRepo } from './lib/repos/surfacingRepo'
import { markDismissed, markOpened, markSurfaced, selectDailyMemories, todayKey } from './lib/selection'
import { loadSettings, loadSurfacing, saveSettings, saveSurfacing } from './lib/storage'
import type { LibrarySettings, MemoryItem, SurfacingState } from './types'

export default function App() {
  const [settings, setSettings] = useState<LibrarySettings>(() => loadSettings())
  const [surfacing, setSurfacing] = useState<SurfacingState>(() => loadSurfacing())
  const [library, setLibrary] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shuffleSalt, setShuffleSalt] = useState(0)
  const [view, setView] = useState<ViewKey>('memories')
  const [showSettings, setShowSettings] = useState(false)
  const [detail, setDetail] = useState<MemoryItem | null>(null)

  const canSync = !settings.useDemo && Boolean(settings.token)

  const emitSurfacingEvent = useCallback(
    (type: 'surfaced' | 'opened' | 'dismissed', saveId: string) => {
      if (!canSync) return
      void new ApiSurfacingRepo(settings).postEvent({ type, saveId, at: new Date().toISOString() }).catch(
        () => {
          // Best-effort telemetry — safe to drop if the API is unreachable.
        },
      )
    },
    [canSync, settings],
  )

  const persistSurfacing = useCallback(
    (next: SurfacingState) => {
      setSurfacing(next)
      if (canSync) {
        void new ApiSurfacingRepo(settings).put(next).catch(() => {})
      } else {
        saveSurfacing(next)
      }
    },
    [canSync, settings],
  )

  // Pull the synced surfacing state once per signed-in session; local cache is the fallback.
  useEffect(() => {
    if (!canSync) return
    let cancelled = false
    new ApiSurfacingRepo(settings)
      .get()
      .then((remote) => {
        if (cancelled) return
        setSurfacing(remote)
      })
      .catch(() => {
        // Keep using the local cache if the API is unreachable.
      })
    return () => {
      cancelled = true
    }
  }, [canSync, settings])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (settings.useDemo) {
        setLibrary(DEMO_ITEMS)
        return
      }
      if (!settings.token) {
        setLibrary([])
        setError(
          'Sign in or paste a token in Settings to sync your library — or turn on demo mode to explore.',
        )
        return
      }
      setLibrary(await fetchLibrarySaves(settings))
    } catch (err) {
      setLibrary([])
      setError(err instanceof Error ? err.message : 'Failed to load your saves.')
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  // Cookie-authenticated EventSource keeps multiple signed-in tabs/devices fresh.
  useEffect(() => {
    if (!canSync || typeof EventSource === 'undefined') return
    const stream = new EventSource(`${normalizeBaseUrl(settings.apiBaseUrl)}/api/v1/sync/stream`, {
      withCredentials: true,
    })
    const refreshSaves = () => void loadLibrary()
    const refreshSurfacing = () => {
      void new ApiSurfacingRepo(settings)
        .get()
        .then(setSurfacing)
        .catch(() => {})
    }
    stream.addEventListener('saves', refreshSaves)
    stream.addEventListener('surfacing', refreshSurfacing)
    return () => stream.close()
  }, [canSync, loadLibrary, settings])

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
      if (canSync) void new ApiSurfacingRepo(settings).put(next).catch(() => {})
      else saveSurfacing(next)
      for (const id of ids) emitSurfacingEvent('surfaced', id)
      return next
    })
  }, [loading, spotlightIds, canSync, settings, emitSurfacingEvent])

  const markVisited = useCallback(
    (item: MemoryItem) => {
      persistSurfacing(markOpened(surfacing, item.id))
      emitSurfacingEvent('opened', item.id)
    },
    [persistSurfacing, surfacing, emitSurfacingEvent],
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
      emitSurfacingEvent('dismissed', item.id)
    },
    [persistSurfacing, surfacing, emitSurfacingEvent],
  )

  const handleSaveSettings = (next: LibrarySettings) => {
    setSettings(next)
    saveSettings(next)
    setShowSettings(false)
    setShuffleSalt(0)
  }

  const todayLabel = format(new Date(), 'EEE, MMM d')

  return (
    <div className="app">
      <NavRail
        active={view}
        onNavigate={setView}
        onOpenSettings={() => setShowSettings(true)}
        demo={settings.useDemo}
        signedIn={!settings.useDemo && Boolean(settings.token)}
      />

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
            ) : (
              <LibraryView
                items={library}
                loading={loading}
                error={error}
                onOpen={openDetail}
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

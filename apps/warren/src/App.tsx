import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { NavRail, type ViewKey } from './components/NavRail'
import { MemoriesView } from './components/MemoriesView'
import { LibraryView } from './components/LibraryView'
import { DetailModal } from './components/DetailModal'
import { SettingsPanel } from './components/SettingsPanel'
import { CommandPalette, type PaletteCommand } from './components/CommandPalette'
import { GraphView } from './components/GraphView'
import { CaptureSheet } from './components/CaptureSheet'
import { DEMO_ITEMS } from './lib/demoData'
import { fetchLibrarySaves } from './lib/api'
import { normalizeBaseUrl } from './lib/api/client'
import { listSpaces, type Space } from './lib/api/spaces'
import { ApiSurfacingRepo } from './lib/repos/surfacingRepo'
import { markDismissed, markOpened, markSurfaced, selectDailyMemories, todayKey } from './lib/selection'
import { loadSettings, loadSurfacing, saveSettings, saveSurfacing } from './lib/storage'
import type { LibrarySettings, MemoryItem, SurfacingState } from './types'

export default function App() {
  const [settings, setSettings] = useState<LibrarySettings>(() => loadSettings())
  const [surfacing, setSurfacing] = useState<SurfacingState>(() => loadSurfacing())
  const [library, setLibrary] = useState<MemoryItem[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shuffleSalt, setShuffleSalt] = useState(0)
  const [view, setView] = useState<ViewKey>('memories')
  const [showSettings, setShowSettings] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [detail, setDetail] = useState<MemoryItem | null>(null)
  const [graphFocusId, setGraphFocusId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!canSync) {
      setSpaces([])
      return
    }
    let cancelled = false
    listSpaces(settings)
      .then((res) => {
        if (cancelled) return
        setSpaces(res.items)
      })
      .catch(() => {
        if (!cancelled) setSpaces([])
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isPalette =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)
      if (!isPalette) return
      event.preventDefault()
      setShowPalette((open) => !open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  const handleSelectSpace = useCallback(
    (spaceId: string | null) => {
      const next = {
        ...settings,
        activeSpaceId: spaceId,
        lastUsedSpaceId: spaceId ?? settings.lastUsedSpaceId,
      }
      setSettings(next)
      saveSettings(next)
      setShuffleSalt(0)
    },
    [settings],
  )

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: 'go-echo',
        label: "Today's memory (Daily Echo)",
        run: () => setView('memories'),
      },
      {
        id: 'go-library',
        label: 'Open library',
        run: () => setView('library'),
      },
      {
        id: 'go-sky',
        label: 'Open sky (graph)',
        run: () => setView('sky'),
      },
      {
        id: 'capture',
        label: 'Capture a save',
        run: () => setShowCapture(true),
      },
      {
        id: 'shuffle',
        label: 'Shuffle daily memories',
        run: () => setShuffleSalt((s) => s + 1),
      },
      {
        id: 'settings',
        label: 'Open settings',
        run: () => setShowSettings(true),
      },
      {
        id: 'all-spaces',
        label: 'Show all spaces',
        run: () => handleSelectSpace(null),
      },
      ...spaces.map((space) => ({
        id: `space-${space.id}`,
        label: `Switch to ${space.name}`,
        run: () => handleSelectSpace(space.id),
      })),
    ],
    [handleSelectSpace, spaces],
  )

  const showInGraph = useCallback((item: MemoryItem) => {
    setGraphFocusId(item.id)
    setView('sky')
  }, [])

  const todayLabel = format(new Date(), 'EEE, MMM d')

  return (
    <div className="app">
      <NavRail
        active={view}
        onNavigate={setView}
        onOpenSettings={() => setShowSettings(true)}
        demo={settings.useDemo}
        signedIn={!settings.useDemo && Boolean(settings.token)}
        spaces={spaces}
        activeSpaceId={settings.activeSpaceId}
        onSelectSpace={handleSelectSpace}
        onOpenCommandPalette={() => setShowPalette(true)}
        onOpenCapture={() => setShowCapture(true)}
      />

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}:${settings.activeSpaceId ?? 'all'}:${graphFocusId ?? ''}`}
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
            ) : view === 'library' ? (
              <LibraryView
                items={library}
                loading={loading}
                error={error}
                onOpen={openDetail}
              />
            ) : (
              <GraphView
                settings={settings}
                library={library}
                focusId={graphFocusId}
                onOpenSave={openDetail}
                onClearFocus={() => setGraphFocusId(null)}
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
            settings={settings}
            onClose={() => setDetail(null)}
            onOpen={markVisited}
            onOpenRelated={(related) => {
              setDetail(related)
              markVisited(related)
            }}
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

      <AnimatePresence>
        {showCapture ? (
          <CaptureSheet
            key="capture"
            settings={settings}
            spaces={spaces}
            onClose={() => setShowCapture(false)}
            onSaved={(next) => {
              setSettings(next)
              saveSettings(next)
              void loadLibrary()
            }}
          />
        ) : null}
      </AnimatePresence>

      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        settings={settings}
        localItems={library}
        surfacing={surfacing}
        commands={paletteCommands}
        onSelectItem={(item) => {
          openDetail(item)
          markVisited(item)
        }}
        onShowInGraph={showInGraph}
      />
    </div>
  )
}

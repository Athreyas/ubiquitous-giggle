import { useEffect, useMemo, useState } from 'react'
import type { MemoryItem, Platform, SurfacingState } from '../types'
import type { LibrarySettings } from '../types'
import { searchSaves } from '../lib/api/search'
import { composeSearchQuery, matchesTimeRange, parseSearchQuery } from '../lib/searchQuery'

export type PaletteCommand = {
  id: string
  label: string
  run: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  settings: LibrarySettings
  localItems: MemoryItem[]
  surfacing: SurfacingState
  commands: PaletteCommand[]
  onSelectItem: (item: MemoryItem) => void
  onShowInGraph?: (item: MemoryItem) => void
}

type TimePreset = 'last-week' | 'last-month' | 'yesterday' | null

function localSearch(
  items: MemoryItem[],
  rawQuery: string,
  surfacing: SurfacingState,
): MemoryItem[] {
  const parsed = parseSearchQuery(rawQuery)
  const hasFilters =
    Boolean(parsed.text) ||
    Boolean(parsed.platform) ||
    Boolean(parsed.tag) ||
    Boolean(parsed.afterIso) ||
    Boolean(parsed.beforeIso) ||
    Boolean(parsed.neverOpened)
  if (!hasFilters) return []

  const filtered = items.filter((item) => {
    if (parsed.platform && item.platform !== parsed.platform) return false
    if (parsed.tag && !item.tags.some((tag) => tag.toLowerCase() === parsed.tag)) return false
    if (!matchesTimeRange(item.createdAt, parsed.afterIso, parsed.beforeIso)) return false
    if (parsed.neverOpened && surfacing.lastOpened[item.id]) return false
    return true
  })

  if (!parsed.text) return filtered.slice(0, 20)

  const needle = parsed.text
  const parts = needle.split(/\s+/).filter(Boolean)
  return filtered
    .map((item) => {
      const hay = [item.title, item.summary, item.note, item.url, item.tags.join(' ')]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
      let score = 0
      if (item.title.toLowerCase().includes(needle)) score += 5
      if (hay.includes(needle)) score += 2
      for (const part of parts) if (hay.includes(part)) score += 1
      return { item, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((row) => row.item)
}

const PLATFORM_CHIPS: Platform[] = ['article', 'youtube', 'instagram', 'tiktok', 'note']

export function CommandPalette({
  open,
  onClose,
  settings,
  localItems,
  surfacing,
  commands,
  onSelectItem,
  onShowInGraph,
}: Props) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<MemoryItem[]>([])
  const [active, setActive] = useState(0)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [neverOpened, setNeverOpened] = useState(false)
  const [timePreset, setTimePreset] = useState<TimePreset>(null)

  const composed = useMemo(
    () => composeSearchQuery(query, { platform, neverOpened, timePreset }),
    [query, platform, neverOpened, timePreset],
  )

  const isCommand = query.trim().startsWith('>')
  const commandQuery = query.trim().slice(1).trim().toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommand) return []
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(commandQuery))
  }, [commands, commandQuery, isCommand])

  const localHits = useMemo(
    () => (isCommand ? [] : localSearch(localItems, composed, surfacing)),
    [isCommand, localItems, composed, surfacing],
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setRemote([])
      setActive(0)
      setPlatform(null)
      setNeverOpened(false)
      setTimePreset(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || isCommand || !composed.trim() || settings.useDemo || !settings.token) {
      setRemote([])
      return
    }
    const handle = window.setTimeout(() => {
      void searchSaves(settings, { q: composed })
        .then((res) => setRemote(res.items))
        .catch(() => setRemote([]))
    }, 120)
    return () => window.clearTimeout(handle)
  }, [open, isCommand, composed, settings])

  const results = useMemo(() => {
    if (isCommand) return filteredCommands.map((cmd) => ({ kind: 'cmd' as const, cmd }))
    const seen = new Set<string>()
    const merged: MemoryItem[] = []
    for (const item of [...localHits, ...remote]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
    return merged.map((item) => ({ kind: 'item' as const, item }))
  }, [filteredCommands, isCommand, localHits, remote])

  useEffect(() => {
    setActive(0)
  }, [composed, isCommand])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const row = results[active]
        if (!row) return
        if (row.kind === 'cmd') {
          row.cmd.run()
          onClose()
        } else {
          onSelectItem(row.item)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, active, onClose, onSelectItem])

  if (!open) return null

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="sheet palette-sheet"
        style={{ width: 'min(560px, 100%)', padding: 12 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search… last week, platform:note, never opened, or > commands"
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 8,
            background: 'var(--surface)',
          }}
        />

        {!isCommand ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {PLATFORM_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${platform === chip ? 'active' : ''}`}
                onClick={() => setPlatform((prev) => (prev === chip ? null : chip))}
              >
                {chip}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${timePreset === 'last-week' ? 'active' : ''}`}
              onClick={() =>
                setTimePreset((prev) => (prev === 'last-week' ? null : 'last-week'))
              }
            >
              last week
            </button>
            <button
              type="button"
              className={`chip ${timePreset === 'last-month' ? 'active' : ''}`}
              onClick={() =>
                setTimePreset((prev) => (prev === 'last-month' ? null : 'last-month'))
              }
            >
              last month
            </button>
            <button
              type="button"
              className={`chip ${neverOpened ? 'active' : ''}`}
              onClick={() => setNeverOpened((prev) => !prev)}
            >
              never opened
            </button>
          </div>
        ) : null}

        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {results.length === 0 ? (
            <p style={{ color: 'var(--ink-dim)', padding: 12, margin: 0 }}>
              {isCommand ? 'No matching commands' : 'Type to search your library'}
            </p>
          ) : (
            results.map((row, index) => (
              <div
                key={row.kind === 'cmd' ? row.cmd.id : row.item.id}
                style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 4,
                  background: index === active ? 'var(--accent-soft)' : undefined,
                  borderRadius: 10,
                }}
                onMouseEnter={() => setActive(index)}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    color: index === active ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => {
                    if (row.kind === 'cmd') {
                      row.cmd.run()
                      onClose()
                    } else {
                      onSelectItem(row.item)
                      onClose()
                    }
                  }}
                >
                  {row.kind === 'cmd' ? row.cmd.label : row.item.title}
                </button>
                {row.kind === 'item' && onShowInGraph ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    title="Show in graph"
                    onClick={() => {
                      onShowInGraph(row.item)
                      onClose()
                    }}
                  >
                    Sky
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

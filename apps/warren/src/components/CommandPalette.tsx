import { useEffect, useMemo, useState } from 'react'
import type { MemoryItem } from '../types'
import type { LibrarySettings } from '../types'
import { searchSaves } from '../lib/api/search'

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
  commands: PaletteCommand[]
  onSelectItem: (item: MemoryItem) => void
}

function localSearch(items: MemoryItem[], q: string): MemoryItem[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  const parts = needle.split(/\s+/).filter(Boolean)
  return items
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

export function CommandPalette({
  open,
  onClose,
  settings,
  localItems,
  commands,
  onSelectItem,
}: Props) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<MemoryItem[]>([])
  const [active, setActive] = useState(0)

  const isCommand = query.trim().startsWith('>')
  const commandQuery = query.trim().slice(1).trim().toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommand) return []
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(commandQuery))
  }, [commands, commandQuery, isCommand])

  const localHits = useMemo(
    () => (isCommand ? [] : localSearch(localItems, query)),
    [isCommand, localItems, query],
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setRemote([])
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    if (!open || isCommand || !query.trim() || settings.useDemo || !settings.token) {
      setRemote([])
      return
    }
    const handle = window.setTimeout(() => {
      void searchSaves(settings, query.trim())
        .then((res) => setRemote(res.items))
        .catch(() => setRemote([]))
    }, 120)
    return () => window.clearTimeout(handle)
  }, [open, isCommand, query, settings])

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
  }, [query, isCommand])

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
        className="sheet"
        style={{ width: 'min(560px, 100%)', padding: 12 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saves… or > commands"
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 8,
            background: 'var(--surface)',
          }}
        />
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {results.length === 0 ? (
            <p style={{ color: 'var(--ink-dim)', padding: 12, margin: 0 }}>
              {isCommand ? 'No matching commands' : 'Type to search your library'}
            </p>
          ) : (
            results.map((row, index) => (
              <button
                key={row.kind === 'cmd' ? row.cmd.id : row.item.id}
                type="button"
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  marginBottom: 4,
                  background: index === active ? 'var(--accent-soft)' : undefined,
                  color: index === active ? 'var(--accent)' : undefined,
                }}
                onMouseEnter={() => setActive(index)}
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}

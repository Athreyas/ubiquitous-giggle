import { useEffect, useMemo, useState } from 'react'
import type { LibrarySettings, MemoryItem } from '../types'
import {
  fetchGraph,
  listConstellations,
  mergeConstellations,
  patchConstellation,
  splitConstellation,
  type Constellation,
  type GraphPayload,
} from '../lib/api/constellations'
import { runClustering } from '../lib/api/related'

interface Props {
  settings: LibrarySettings
  library: MemoryItem[]
  focusId?: string | null
  onOpenSave: (item: MemoryItem) => void
  onClearFocus?: () => void
}

export function GraphView({ settings, library, focusId, onOpenSave, onClearFocus }: Props) {
  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [constellationList, setConstellationList] = useState<Constellation[]>([])
  const [selected, setSelected] = useState<Constellation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scale, setScale] = useState(1)
  const [mergeTargetId, setMergeTargetId] = useState('')

  const byId = useMemo(() => new Map(library.map((item) => [item.id, item])), [library])

  const load = async () => {
    setError(null)
    try {
      const [g, c] = await Promise.all([
        fetchGraph(settings, { spaceId: settings.activeSpaceId, focus: focusId }),
        listConstellations(settings, settings.activeSpaceId),
      ])
      setGraph(g)
      setConstellationList(c.items)
      if (selected) {
        setSelected(c.items.find((item) => item.id === selected.id) ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph.')
    }
  }

  useEffect(() => {
    if (settings.useDemo || !settings.token) {
      setGraph(null)
      setConstellationList([])
      return
    }
    let cancelled = false
    setError(null)
    Promise.all([
      fetchGraph(settings, { spaceId: settings.activeSpaceId, focus: focusId }),
      listConstellations(settings, settings.activeSpaceId),
    ])
      .then(([g, c]) => {
        if (cancelled) return
        setGraph(g)
        setConstellationList(c.items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load graph.')
      })
    return () => {
      cancelled = true
    }
  }, [settings, focusId])

  const layout = useMemo(() => {
    if (!graph) {
      return {
        nodes: [] as Array<{ id: string; title: string; x: number; y: number }>,
        links: [] as GraphPayload['links'],
      }
    }
    const n = Math.max(graph.nodes.length, 1)
    const nodes = graph.nodes.map((node, index) => {
      const angle = (index / n) * Math.PI * 2
      const radius = 140 + (index % 5) * 28
      return {
        id: node.id,
        title: node.title,
        x: 320 + Math.cos(angle) * radius,
        y: 260 + Math.sin(angle) * radius,
      }
    })
    return { nodes, links: graph.links }
  }, [graph])

  const handleCluster = async () => {
    setBusy(true)
    try {
      await runClustering(settings)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clustering failed.')
    } finally {
      setBusy(false)
    }
  }

  if (settings.useDemo || !settings.token) {
    return (
      <div>
        <header className="view-head">
          <div className="kicker">Sky</div>
          <h1 className="display-title">Memory graph</h1>
          <p className="view-lede">Sign in to see linked saves and constellations.</p>
        </header>
      </div>
    )
  }

  return (
    <div>
      <header className="view-head">
        <div className="kicker">Sky</div>
        <h1 className="display-title">
          Memory <span className="grad">graph</span>
        </h1>
        <p className="view-lede">
          Saves as nodes, explicit links as edges, constellations as named groups.
        </p>
      </header>

      <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => void handleCluster()} disabled={busy}>
          {busy ? 'Clustering…' : 'Run clustering'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setScale((s) => Math.min(s + 0.2, 2.4))}>
          Zoom in
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}>
          Zoom out
        </button>
        {focusId ? (
          <button type="button" className="btn btn-ghost" onClick={onClearFocus}>
            Clear focus
          </button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 16,
          overflow: 'auto',
          background: 'var(--surface)',
          marginTop: 12,
        }}
      >
        <svg width={640} height={520} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {layout.links.map((link) => {
            const source = layout.nodes.find((node) => node.id === link.source)
            const target = layout.nodes.find((node) => node.id === link.target)
            if (!source || !target) return null
            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--line)"
                strokeWidth={1.5}
              />
            )
          })}
          {layout.nodes.map((node) => {
            const focused = focusId === node.id || graph?.focusId === node.id
            return (
              <g
                key={node.id}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const item = byId.get(node.id)
                  if (item) onOpenSave(item)
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={focused ? 16 : 10}
                  fill={focused ? 'var(--accent)' : 'var(--accent-soft)'}
                  stroke="var(--accent)"
                />
                <text x={node.x + 14} y={node.y + 4} fontSize={11} fill="var(--ink)">
                  {node.title.slice(0, 28)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Constellations</h2>
        {constellationList.length === 0 ? (
          <p style={{ color: 'var(--ink-dim)' }}>No constellations yet — run clustering.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {constellationList.map((row) => (
              <div
                key={row.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 12,
                  background: selected?.id === row.id ? 'var(--accent-soft)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelected(row)}>
                    {row.name} · {row.size} saves {row.pinned ? '· pinned' : ''}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      void patchConstellation(settings, row.id, { pinned: !row.pinned }).then(load)
                    }
                  >
                    {row.pinned ? 'Unpin' : 'Pin'}
                  </button>
                </div>
                {selected?.id === row.id ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      defaultValue={row.name}
                      aria-label="Rename constellation"
                      onBlur={(e) => {
                        const name = e.target.value.trim()
                        if (name && name !== row.name) {
                          void patchConstellation(settings, row.id, { name }).then(load)
                        }
                      }}
                      style={{
                        width: '100%',
                        marginBottom: 8,
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        padding: '8px 10px',
                        background: 'var(--surface)',
                      }}
                    />
                    <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                      {row.memberIds.map((id) => {
                        const item = byId.get(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            className="btn btn-ghost"
                            style={{ justifyContent: 'flex-start' }}
                            onClick={() => item && onOpenSave(item)}
                          >
                            {item?.title ?? id}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={row.memberIds.length < 2}
                        onClick={() =>
                          void splitConstellation(
                            settings,
                            row.id,
                            row.memberIds.slice(0, Math.ceil(row.memberIds.length / 2)),
                          ).then(load)
                        }
                      >
                        Split half
                      </button>
                      <select
                        aria-label="Merge into"
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                      >
                        <option value="">Merge into…</option>
                        {constellationList
                          .filter((other) => other.id !== row.id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={!mergeTargetId}
                        onClick={() =>
                          void mergeConstellations(settings, row.id, mergeTargetId).then(() => {
                            setMergeTargetId('')
                            return load()
                          })
                        }
                      >
                        Merge
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

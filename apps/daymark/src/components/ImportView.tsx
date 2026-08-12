import { useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import {
  parseImportFile,
  SOURCE_LABELS,
  type ImportResult,
  type ImportSource,
} from '../lib/import/parsers'
import { SAMPLE_FILENAMES, SAMPLES } from '../lib/import/sampleData'
import { pushBookmarksToKarakeep, type PushProgress } from '../lib/karakeep'
import { PlatformBadge } from './PlatformBadge'
import { GlyphCamera, GlyphMusic, IconCheck, IconGlobe, IconUpload } from './Icons'

interface Props {
  connected: boolean
  baseUrl: string
  apiKey: string
  onImport: (items: MemoryItem[]) => void
  onGoToLibrary: () => void
}

type SourceInfo = {
  key: ImportSource
  label: string
  icon: ComponentType<{ width?: number | string; height?: number | string }>
  blurb: string
  steps: string[]
}

const SOURCES: SourceInfo[] = [
  {
    key: 'browser',
    label: 'Browser bookmarks',
    icon: IconGlobe,
    blurb: 'Chrome, Firefox, Safari, Edge, Brave — any browser.',
    steps: [
      'Open your browser’s Bookmark Manager',
      'Choose “Export bookmarks” and save the .html file',
      'Drop that file below',
    ],
  },
  {
    key: 'instagram',
    label: 'Instagram saved',
    icon: GlyphCamera,
    blurb: 'Saved posts & reels, via “Download your information”.',
    steps: [
      'Instagram → Settings → Accounts Center → Your information and permissions',
      'Download your information → select “Saved”, format JSON',
      'Drop the saved_posts.json file below',
    ],
  },
  {
    key: 'tiktok',
    label: 'TikTok saved',
    icon: GlyphMusic,
    blurb: 'Favourited & liked videos, via “Download your data”.',
    steps: [
      'TikTok → Settings → Account → Download your data',
      'Request the data in JSON, then download the file',
      'Drop the user_data.json file below',
    ],
  },
]

const PREVIEW_LIMIT = 30

export function ImportView({ connected, baseUrl, apiKey, onImport, onGoToLibrary }: Props) {
  const [source, setSource] = useState<ImportSource | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [phase, setPhase] = useState<'idle' | 'parsed' | 'importing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [push, setPush] = useState<PushProgress | null>(null)
  const [committed, setCommitted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const ingest = (text: string, name: string, srcOverride?: ImportSource) => {
    setError(null)
    setFileName(name)
    const parsed = parseImportFile(text, name, srcOverride ?? source ?? undefined)
    if (parsed.items.length === 0) {
      setResult(null)
      setError(
        "Couldn't find anything to import in that file. Pick the matching source above, or check it's the right export.",
      )
      return
    }
    setResult(parsed)
    setPhase('parsed')
  }

  const onFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      ingest(await file.text(), file.name)
    } catch {
      setError('That file could not be read.')
    }
  }

  const trySample = (src: ImportSource) => {
    setSource(src)
    ingest(SAMPLES[src], SAMPLE_FILENAMES[src], src)
  }

  const commit = async () => {
    if (!result) return
    onImport(result.items)
    setCommitted(result.items.length)
    if (connected) {
      setPhase('importing')
      const summary = await pushBookmarksToKarakeep(baseUrl, apiKey, result.items, setPush)
      setPush(summary)
    }
    setPhase('done')
  }

  const reset = () => {
    setResult(null)
    setPhase('idle')
    setError(null)
    setFileName('')
    setPush(null)
  }

  if (phase === 'done') {
    return (
      <div>
        <ImportHeader />
        <motion.div
          className="state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="import-check">
            <IconCheck />
          </div>
          <h3>Added {committed} memories to your library</h3>
          <p>
            They’ll start resurfacing in your daily memories over time.
            {connected && push
              ? ` Synced to Daykeep — ${push.created} new, ${push.duplicates} already there${push.failed ? `, ${push.failed} failed` : ''}.`
              : ''}
          </p>
          <div className="detail-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={onGoToLibrary}>
              See them in Library
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Import more
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <ImportHeader />

      <div className="import-sources">
        {SOURCES.map((s) => {
          const Icon = s.icon
          const active = source === s.key
          return (
            <button
              key={s.key}
              type="button"
              className={`source-card ${active ? 'active' : ''}`}
              onClick={() => setSource(active ? null : s.key)}
            >
              <span className="source-icon">
                <Icon />
              </span>
              <span className="source-label">{s.label}</span>
              <span className="source-blurb">{s.blurb}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {source ? (
          <motion.ol
            className="instructions"
            key={source}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {SOURCES.find((s) => s.key === source)?.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </motion.ol>
        ) : null}
      </AnimatePresence>

      <div
        className={`dropzone ${dragging ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void onFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <div className="dropzone-icon">
          <IconUpload />
        </div>
        <p className="dropzone-title">
          {fileName ? fileName : 'Drop your export file here, or click to browse'}
        </p>
        <p className="dropzone-sub">
          Accepts .html and .json exports{source ? ` · expecting ${SOURCE_LABELS[source]}` : ' · source auto-detected'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".html,.htm,.json,.txt"
          hidden
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>

      <div className="sample-row">
        <span>No file handy? Try a sample:</span>
        {SOURCES.map((s) => (
          <button
            key={s.key}
            type="button"
            className="chip"
            onClick={(e) => {
              e.stopPropagation()
              trySample(s.key)
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error ? <p className="status error">{error}</p> : null}

      <AnimatePresence>
        {result ? (
          <motion.section
            className="preview-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="preview-head">
              <div>
                <h3>
                  Found {result.items.length} {result.items.length === 1 ? 'item' : 'items'} ·{' '}
                  <span className="grad">{SOURCE_LABELS[result.source]}</span>
                </h3>
                {result.skipped > 0 ? (
                  <p className="preview-sub">{result.skipped} entries skipped (no usable link)</p>
                ) : null}
              </div>
              <div className="detail-actions">
                <button type="button" className="btn btn-quiet" onClick={reset}>
                  Choose another
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={phase === 'importing'}
                  onClick={() => void commit()}
                >
                  {phase === 'importing'
                    ? `Syncing ${push?.done ?? 0}/${push?.total ?? result.items.length}…`
                    : `Add ${result.items.length} to library${connected ? ' + sync' : ''}`}
                </button>
              </div>
            </div>

            <ul className="preview-list">
              {result.items.slice(0, PREVIEW_LIMIT).map((item) => (
                <li key={item.id} className="preview-row">
                  <PlatformBadge platform={item.platform} />
                  <span className="preview-title">{item.title}</span>
                  <span className="preview-age">{humanAge(item)}</span>
                </li>
              ))}
            </ul>
            {result.items.length > PREVIEW_LIMIT ? (
              <p className="preview-more">+ {result.items.length - PREVIEW_LIMIT} more</p>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ImportHeader() {
  return (
    <header className="view-head">
      <div className="kicker">Import</div>
      <h1 className="display-title">
        Bring in your <span className="grad">saves</span>
      </h1>
      <p className="view-lede">
        Pull in everything you’ve bookmarked — from any browser, plus your saved Instagram
        posts, reels and TikToks. Daymark will start resurfacing them as memories.
      </p>
    </header>
  )
}

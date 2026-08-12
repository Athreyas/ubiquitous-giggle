import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MemoryItem } from '../types'
import { fileToDataUrl, makeImage, makeLink, makeNote, parseTagInput } from '../lib/capture'
import { GlyphImage, IconCheck, IconLink, IconType, IconUpload } from './Icons'

interface Props {
  onCapture: (item: MemoryItem) => void
  onGoToLibrary: () => void
}

type Mode = 'note' | 'image' | 'link'

const MODES: { key: Mode; label: string; Icon: typeof IconType }[] = [
  { key: 'note', label: 'Snippet', Icon: IconType },
  { key: 'image', label: 'Screenshot', Icon: GlyphImage },
  { key: 'link', label: 'Link', Icon: IconLink },
]

export function CaptureView({ onCapture, onGoToLibrary }: Props) {
  const [mode, setMode] = useState<Mode>('note')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [saved, setSaved] = useState<MemoryItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle('')
    setText('')
    setUrl('')
    setTags('')
    setImage(null)
  }

  const takeImageFile = useCallback(async (file: Blob | undefined | null) => {
    if (!file) return
    try {
      setImage(await fileToDataUrl(file))
    } catch {
      /* ignore unreadable image */
    }
  }, [])

  // Paste a screenshot straight from the clipboard while in image mode.
  useEffect(() => {
    if (mode !== 'image') return
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      if (item) void takeImageFile(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [mode, takeImageFile])

  const canSave =
    (mode === 'note' && text.trim().length > 0) ||
    (mode === 'link' && url.trim().length > 0) ||
    (mode === 'image' && !!image)

  const save = () => {
    const tagList = parseTagInput(tags)
    let item: MemoryItem
    if (mode === 'note') {
      item = makeNote({ title, text, sourceUrl: url, tags: tagList })
    } else if (mode === 'link') {
      item = makeLink({ url, title, tags: tagList })
    } else {
      if (!image) return
      item = makeImage({ dataUrl: image, title, note: text, tags: tagList })
    }
    onCapture(item)
    setSaved(item)
    reset()
  }

  return (
    <div>
      <header className="view-head">
        <div className="kicker">Capture</div>
        <h1 className="display-title">
          Save it <span className="grad">now</span>, find it later
        </h1>
        <p className="view-lede">
          Drop in a screenshot, a text snippet, or a link from anywhere. Daymark indexes it
          on-device and resurfaces it as a memory.
        </p>
      </header>

      <div className="seg">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`seg-btn ${mode === key ? 'active' : ''}`}
            onClick={() => setMode(key)}
          >
            {mode === key ? <motion.span className="seg-glow" layoutId="seg-glow" /> : null}
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="capture-card">
        {mode === 'note' ? (
          <>
            <div className="field">
              <label htmlFor="c-text">Snippet</label>
              <textarea
                id="c-text"
                rows={5}
                placeholder="Paste or type anything — a quote, an idea, a paragraph you want to keep…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="c-src">Source URL (optional)</label>
              <input
                id="c-src"
                type="url"
                placeholder="https://where-this-came-from.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {mode === 'link' ? (
          <>
            <div className="field">
              <label htmlFor="c-url">Link</label>
              <input
                id="c-url"
                type="url"
                placeholder="https://something-worth-remembering.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="c-title">Title (optional)</label>
              <input
                id="c-title"
                type="text"
                placeholder="What is it?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {mode === 'image' ? (
          <>
            {image ? (
              <div className="capture-preview">
                <img src={image} alt="capture preview" />
                <button type="button" className="icon-btn capture-remove" onClick={() => setImage(null)} aria-label="Remove image">
                  ✕
                </button>
              </div>
            ) : (
              <div
                className={`dropzone ${dragging ? 'drag' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  void takeImageFile(e.dataTransfer.files?.[0])
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
                }}
              >
                <div className="dropzone-icon">
                  <IconUpload />
                </div>
                <p className="dropzone-title">Paste, drop, or click to add a screenshot</p>
                <p className="dropzone-sub">Press ⌘/Ctrl+V to paste from your clipboard</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void takeImageFile(e.target.files?.[0])}
                />
              </div>
            )}
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="c-cap">Caption / note (optional)</label>
              <input
                id="c-cap"
                type="text"
                placeholder="A word about this screenshot"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="field">
          <label htmlFor="c-tags">Tags (optional)</label>
          <input
            id="c-tags"
            type="text"
            placeholder="comma, separated, #tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
            Save to library
          </button>
        </div>
      </div>

      <AnimatePresence>
        {saved ? (
          <motion.div
            className="capture-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="toast-check">
              <IconCheck />
            </span>
            <span>Saved “{saved.title}”</span>
            <button type="button" className="btn btn-ghost" onClick={onGoToLibrary}>
              View in Library
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setSaved(null)}>
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

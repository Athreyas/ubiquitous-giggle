import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import type { LibrarySettings, Platform } from '../types'
import type { Space } from '../lib/api/spaces'
import { createSave } from '../lib/api/saves'

interface Props {
  settings: LibrarySettings
  spaces: Space[]
  onClose: () => void
  onSaved: (nextSettings: LibrarySettings) => void
}

const PLATFORMS: Platform[] = ['article', 'note', 'youtube', 'instagram', 'tiktok', 'other']

export function CaptureSheet({ settings, spaces, onClose, onSaved }: Props) {
  const defaultSpace =
    settings.activeSpaceId ??
    settings.lastUsedSpaceId ??
    spaces.find((s) => s.slug === 'personal')?.id ??
    null
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [platform, setPlatform] = useState<Platform>('article')
  const [spaceId, setSpaceId] = useState<string | null>(defaultSpace)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createSave(settings, {
        type: url.trim() ? 'link' : 'text',
        title: title.trim(),
        url: url.trim() || undefined,
        note: note.trim() || undefined,
        summary: note.trim() || '',
        platform,
        tags: [],
        spaceId,
      })
      onSaved({
        ...settings,
        lastUsedSpaceId: spaceId ?? settings.lastUsedSpaceId,
        activeSpaceId: settings.activeSpaceId,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="sheet"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-title"
      >
        <h2 id="capture-title">Capture a save</h2>
        <p>Defaults to your last-used space. Leave URL empty for a text note.</p>

        <label className="lbl">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="lbl">
          URL (optional)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </label>
        <label className="lbl">
          Note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
        <label className="lbl">
          Platform
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="lbl">
          Space
          <select value={spaceId ?? ''} onChange={(e) => setSpaceId(e.target.value || null)}>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="error">{error}</p> : null}

        <div className="detail-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

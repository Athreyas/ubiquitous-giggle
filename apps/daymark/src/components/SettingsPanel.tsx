import { useState } from 'react'
import { motion } from 'motion/react'
import type { KarakeepSettings } from '../types'

interface Props {
  settings: KarakeepSettings
  onClose: () => void
  onSave: (settings: KarakeepSettings) => void
}

export function SettingsPanel({ settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(settings)

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
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title">Connect your library</h2>
        <p>
          Point Daymark at your Daykeep instance (Karakeep-compatible API). Generate an API
          key under Settings → API Keys. Demo mode works with no server.
        </p>

        <div className="toggle-row">
          <div>
            <div className="lbl">Use demo library</div>
            <p className="sub">Explore Daymark with a rich sample set</p>
          </div>
          <button
            type="button"
            className={`switch ${draft.useDemo ? 'on' : ''}`}
            role="switch"
            aria-checked={draft.useDemo}
            aria-label="Use demo library"
            onClick={() => setDraft({ ...draft, useDemo: !draft.useDemo })}
          />
        </div>

        <div className="field">
          <label htmlFor="baseUrl">Daykeep URL</label>
          <input
            id="baseUrl"
            type="url"
            placeholder="https://daykeep.example.com"
            value={draft.baseUrl}
            disabled={draft.useDemo}
            onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="apiKey">API key</label>
          <input
            id="apiKey"
            type="password"
            placeholder="Bearer token from Daykeep"
            value={draft.apiKey}
            disabled={draft.useDemo}
            autoComplete="off"
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          />
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

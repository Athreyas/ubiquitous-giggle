import { useState } from 'react'
import type { KarakeepSettings } from '../types'

interface Props {
  settings: KarakeepSettings
  onClose: () => void
  onSave: (settings: KarakeepSettings) => void
}

export function SettingsPanel({ settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(settings)

  return (
    <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
      >
        <h2 id="settings-title">Connect your library</h2>
        <p>
          Point Daymark at your Daykeep instance (Karakeep-compatible API). Generate an API key
          under Settings → API Keys. Demo mode works without a server.
        </p>

        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.useDemo}
            onChange={(e) => setDraft({ ...draft, useDemo: e.target.checked })}
          />
          Use demo library
        </label>

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

        <div className="settings-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

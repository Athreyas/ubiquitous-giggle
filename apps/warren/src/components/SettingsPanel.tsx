import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { LibrarySettings, User } from '../types'
import { login, logout, me, register } from '../lib/api/auth'

interface Props {
  settings: LibrarySettings
  onClose: () => void
  onSave: (settings: LibrarySettings) => void
}

type AuthMode = 'signin' | 'register' | 'token'

export function SettingsPanel({ settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(settings)
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [profile, setProfile] = useState<User | null>(null)

  const signedIn = Boolean(draft.token)

  // Confirm the stored token still works and surface who it belongs to.
  useEffect(() => {
    if (draft.useDemo || !draft.token) {
      setProfile(null)
      return
    }
    let cancelled = false
    me({
      apiBaseUrl: draft.apiBaseUrl,
      token: draft.token,
      useDemo: draft.useDemo,
      activeSpaceId: draft.activeSpaceId,
    })
      .then((user) => {
        if (!cancelled) setProfile(user)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [draft.useDemo, draft.token, draft.apiBaseUrl, draft.activeSpaceId])

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setAuthError(null)
  }

  const handleAuthSubmit = async () => {
    setAuthError(null)
    setBusy(true)
    try {
      if (mode === 'token') {
        const trimmed = tokenInput.trim()
        if (!trimmed) throw new Error('Paste a token first.')
        setDraft((d) => ({ ...d, token: trimmed, useDemo: false }))
        setTokenInput('')
        return
      }
      const action = mode === 'register' ? register : login
      const result = await action(draft, email.trim(), password)
      setDraft((d) => ({ ...d, token: result.token, useDemo: false }))
      setProfile(result.user)
      setPassword('')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logout(draft)
    } finally {
      setDraft((d) => ({ ...d, token: '' }))
      setProfile(null)
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
          Demo mode works with no server. Sign in — or paste a token — to sync your saves and
          daily memory with the Warren API.
        </p>

        <div className="toggle-row">
          <div>
            <div className="lbl">Use demo library</div>
            <p className="sub">Explore Warren with a rich sample set</p>
          </div>
          <button
            type="button"
            className={`switch ${draft.useDemo ? 'on' : ''}`}
            role="switch"
            aria-checked={draft.useDemo}
            aria-label="Use demo library"
            onClick={() => setDraft((d) => ({ ...d, useDemo: !d.useDemo }))}
          />
        </div>

        {!draft.useDemo ? (
          <>
            <div className="field">
              <label htmlFor="apiBaseUrl">API base URL</label>
              <input
                id="apiBaseUrl"
                type="url"
                placeholder="http://127.0.0.1:8787"
                value={draft.apiBaseUrl}
                onChange={(e) => setDraft((d) => ({ ...d, apiBaseUrl: e.target.value }))}
              />
            </div>

            {signedIn ? (
              <>
                <p className="status">
                  Signed in{profile ? ` as ${profile.email}` : ''}. Saves and daily memory sync
                  automatically.
                </p>
                <div className="sheet-actions" style={{ justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={busy}
                    onClick={() => void handleLogout()}
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="filters" role="tablist" aria-label="Sign-in method">
                  <button
                    type="button"
                    className={`chip ${mode === 'signin' ? 'active' : ''}`}
                    onClick={() => switchMode('signin')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={`chip ${mode === 'register' ? 'active' : ''}`}
                    onClick={() => switchMode('register')}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    className={`chip ${mode === 'token' ? 'active' : ''}`}
                    onClick={() => switchMode('token')}
                  >
                    Paste token
                  </button>
                </div>

                {mode === 'token' ? (
                  <div className="field">
                    <label htmlFor="token">API token</label>
                    <input
                      id="token"
                      type="password"
                      placeholder="Bearer token from the Warren API"
                      value={tokenInput}
                      autoComplete="off"
                      onChange={(e) => setTokenInput(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        autoComplete="email"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="password">Password</label>
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {authError ? <p className="status error">{authError}</p> : null}

                <div className="sheet-actions" style={{ justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void handleAuthSubmit()}
                  >
                    {busy
                      ? 'Working…'
                      : mode === 'register'
                        ? 'Create account'
                        : mode === 'signin'
                          ? 'Sign in'
                          : 'Use token'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}

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

import type { LibrarySettings, SurfacingState } from '../types'
import { DEFAULT_API_BASE_URL, defaultLibrarySettings } from '../types'

const SURFACING_KEY = 'daymark.surfacing.v1'
const SETTINGS_KEY = 'daymark.settings.v1'

const defaultSurfacing = (): SurfacingState => ({
  byDay: {},
  lastSurfaced: {},
  lastOpened: {},
  dismissed: [],
})

export function loadSurfacing(): SurfacingState {
  try {
    const raw = localStorage.getItem(SURFACING_KEY)
    if (!raw) return defaultSurfacing()
    return { ...defaultSurfacing(), ...JSON.parse(raw) }
  } catch {
    return defaultSurfacing()
  }
}

export function saveSurfacing(state: SurfacingState): void {
  localStorage.setItem(SURFACING_KEY, JSON.stringify(state))
}

/** Legacy settings shape (pre-LibrarySettings), kept only for one-time migration. */
interface LegacySettings {
  baseUrl?: string
  apiKey?: string
  useDemo?: boolean
}

function isLegacySettings(raw: unknown): raw is LegacySettings {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      !('apiBaseUrl' in raw) &&
      !('token' in raw) &&
      ('baseUrl' in raw || 'apiKey' in raw),
  )
}

function migrateLegacySettings(legacy: LegacySettings): LibrarySettings {
  return {
    apiBaseUrl: legacy.baseUrl?.trim() || DEFAULT_API_BASE_URL,
    token: legacy.apiKey?.trim() || '',
    useDemo: legacy.useDemo ?? true,
  }
}

export function loadSettings(): LibrarySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultLibrarySettings()
    const parsed = JSON.parse(raw) as unknown
    if (isLegacySettings(parsed)) {
      const migrated = migrateLegacySettings(parsed)
      saveSettings(migrated)
      return migrated
    }
    return { ...defaultLibrarySettings(), ...(parsed as Partial<LibrarySettings>) }
  } catch {
    return defaultLibrarySettings()
  }
}

export function saveSettings(settings: LibrarySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/** Convenience accessor for the current Bearer token, if signed in. */
export function loadAuthToken(): string {
  return loadSettings().token
}

/** Clears the stored auth token (e.g. on logout) without touching other settings. */
export function clearAuthToken(): void {
  const settings = loadSettings()
  if (!settings.token) return
  saveSettings({ ...settings, token: '' })
}

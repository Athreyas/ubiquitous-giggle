import type { LibrarySettings, SurfacingState } from '../types'
import { DEFAULT_API_BASE_URL, defaultLibrarySettings } from '../types'

const SURFACING_KEY = 'warren.surfacing.v1'
const SETTINGS_KEY = 'warren.settings.v1'

// Pre-rebrand keys (product was named Daymark). One-time migration below.
const LEGACY_SURFACING_KEY = 'daymark.surfacing.v1'
const LEGACY_SETTINGS_KEY = 'daymark.settings.v1'

const defaultSurfacing = (): SurfacingState => ({
  byDay: {},
  lastSurfaced: {},
  lastOpened: {},
  dismissed: [],
})

/** One-time migration of localStorage data from the pre-rebrand `daymark.*` keys. */
function migrateLegacyKey(legacyKey: string, newKey: string): void {
  try {
    if (localStorage.getItem(newKey) !== null) return
    const legacyRaw = localStorage.getItem(legacyKey)
    if (legacyRaw === null) return
    localStorage.setItem(newKey, legacyRaw)
    localStorage.removeItem(legacyKey)
  } catch {
    // Ignore storage access failures (e.g. disabled localStorage).
  }
}

export function loadSurfacing(): SurfacingState {
  try {
    migrateLegacyKey(LEGACY_SURFACING_KEY, SURFACING_KEY)
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
    migrateLegacyKey(LEGACY_SETTINGS_KEY, SETTINGS_KEY)
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

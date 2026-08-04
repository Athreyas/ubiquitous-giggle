import type { KarakeepSettings, SurfacingState } from '../types'

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

export function loadSettings(): KarakeepSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return { baseUrl: '', apiKey: '', useDemo: true }
    }
    return JSON.parse(raw) as KarakeepSettings
  } catch {
    return { baseUrl: '', apiKey: '', useDemo: true }
  }
}

export function saveSettings(settings: KarakeepSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

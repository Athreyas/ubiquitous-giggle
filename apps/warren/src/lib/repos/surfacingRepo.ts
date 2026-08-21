import type { LibrarySettings, SurfacingState } from '../../types'
import {
  getSurfacing,
  postSurfacingEvent,
  putSurfacing,
  type SurfacingEvent,
} from '../api/surfacing'
import { loadSurfacing, saveSurfacing } from '../storage'

export class LocalSurfacingRepo {
  async get(): Promise<SurfacingState> {
    return loadSurfacing()
  }

  async replace(state: SurfacingState): Promise<void> {
    saveSurfacing(state)
  }
}

export class ApiSurfacingRepo {
  constructor(
    private readonly settings: LibrarySettings,
    private readonly mirror = new LocalSurfacingRepo(),
  ) {}

  async get(): Promise<SurfacingState> {
    const state = await getSurfacing(this.settings)
    await this.mirror.replace(state)
    return state
  }

  async put(state: SurfacingState): Promise<SurfacingState> {
    const saved = await putSurfacing(this.settings, state)
    await this.mirror.replace(saved)
    return saved
  }

  async postEvent(event: SurfacingEvent): Promise<SurfacingState> {
    const state = await postSurfacingEvent(this.settings, event)
    await this.mirror.replace(state)
    return state
  }
}

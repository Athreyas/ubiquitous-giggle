import type { LibrarySettings } from '../../types'
import {
  createSave,
  deleteSave,
  getSave,
  listSaves,
  patchSave,
  type NewSave,
  type Save,
  type SavePatch,
} from '../api/saves'

export const SAVES_CACHE_KEY = 'warren.saves.v1'

export class LocalSavesRepo {
  async list(): Promise<Save[]> {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(SAVES_CACHE_KEY) ?? '[]')
      return Array.isArray(parsed) ? (parsed as Save[]) : []
    } catch {
      return []
    }
  }

  async get(id: string): Promise<Save | undefined> {
    return (await this.list()).find((save) => save.id === id)
  }

  async replace(saves: Save[]): Promise<void> {
    localStorage.setItem(SAVES_CACHE_KEY, JSON.stringify(saves))
  }

  async put(save: Save): Promise<void> {
    const saves = await this.list()
    const index = saves.findIndex((cached) => cached.id === save.id)
    if (index === -1) saves.unshift(save)
    else saves[index] = save
    await this.replace(saves)
  }

  async remove(id: string): Promise<void> {
    await this.replace((await this.list()).filter((save) => save.id !== id))
  }
}

export class ApiSavesRepo {
  private readonly settings: LibrarySettings
  private readonly mirror: LocalSavesRepo

  constructor(settings: LibrarySettings, mirror = new LocalSavesRepo()) {
    this.settings = settings
    this.mirror = mirror
  }

  async list(limit = 500, spaceId?: string | null): Promise<Save[]> {
    const items: Save[] = []
    let cursor: string | undefined

    while (items.length < limit) {
      const page = await listSaves(this.settings, {
        limit: Math.min(100, limit - items.length),
        archived: false,
        cursor,
        spaceId: spaceId ?? undefined,
      })
      items.push(...page.items)
      cursor = page.nextCursor
      if (!cursor || page.items.length === 0) break
    }

    // Only overwrite the full offline mirror when listing all spaces.
    if (!spaceId) await this.mirror.replace(items)
    return items
  }

  async get(id: string): Promise<Save> {
    const save = await getSave(this.settings, id)
    await this.mirror.put(save)
    return save
  }

  async create(input: NewSave): Promise<Save> {
    const save = await createSave(this.settings, input)
    await this.mirror.put(save)
    return save
  }

  async patch(id: string, patch: SavePatch): Promise<Save> {
    const save = await patchSave(this.settings, id, patch)
    await this.mirror.put(save)
    return save
  }

  async delete(id: string): Promise<void> {
    await deleteSave(this.settings, id)
    await this.mirror.remove(id)
  }
}

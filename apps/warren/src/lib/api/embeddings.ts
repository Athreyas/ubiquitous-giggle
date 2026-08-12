import type { LibrarySettings } from '../../types'
import { apiFetch } from './client'

export interface EmbeddingRecord {
  saveId: string
  model: string
  dims: number
  vector?: number[]
  createdAt?: string
}

export function putEmbedding(
  settings: LibrarySettings,
  saveId: string,
  input: { model: string; dims: number; vector: number[] },
): Promise<EmbeddingRecord> {
  return apiFetch(settings, `/api/v1/saves/${saveId}/embedding`, {
    method: 'PUT',
    body: input,
  })
}

export function getEmbedding(
  settings: LibrarySettings,
  saveId: string,
): Promise<EmbeddingRecord> {
  return apiFetch(settings, `/api/v1/saves/${saveId}/embedding`)
}

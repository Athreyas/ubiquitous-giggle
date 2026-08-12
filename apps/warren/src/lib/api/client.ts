import type { LibrarySettings } from '../../types'

/** Thrown for any non-2xx or network-level failure from the Warren API. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error
    if (typeof value === 'string' && value.trim()) return value
  }
  return fallback
}

/**
 * Fetch wrapper for the Warren API: resolves the base URL from settings,
 * attaches the Bearer token when present, and normalizes errors.
 */
export async function apiFetch<T>(
  settings: LibrarySettings,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const root = normalizeBaseUrl(settings.apiBaseUrl)
  if (!root) throw new ApiError(0, 'No API base URL configured.')

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (settings.token) headers.Authorization = `Bearer ${settings.token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${root}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      // Prefer httpOnly `warren_session` cookie when present; Bearer remains a fallback.
      credentials: 'include',
    })
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : 'Could not reach the Warren API.',
    )
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data = text ? safeJsonParse(text) : undefined

  if (!res.ok) {
    throw new ApiError(
      res.status,
      extractErrorMessage(data, res.statusText || `Request failed (${res.status})`),
    )
  }

  return data as T
}

import type { LibrarySettings, User } from '../../types'
import { apiFetch } from './client'

export interface AuthResult {
  user: User
  token: string
}

export function register(
  settings: LibrarySettings,
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  return apiFetch<AuthResult>(settings, '/api/v1/auth/register', {
    method: 'POST',
    body: { email, password, name },
  })
}

export function login(
  settings: LibrarySettings,
  email: string,
  password: string,
): Promise<AuthResult> {
  return apiFetch<AuthResult>(settings, '/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

/** Best-effort server-side session invalidation — callers should clear the local token regardless. */
export async function logout(settings: LibrarySettings): Promise<void> {
  try {
    await apiFetch<void>(settings, '/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // Ignore: the token is discarded locally either way.
  }
}

export function me(settings: LibrarySettings): Promise<User> {
  return apiFetch<User>(settings, '/api/v1/auth/me')
}

/** Rotates the active cookie/Bearer session and returns the replacement token. */
export function refresh(settings: LibrarySettings): Promise<AuthResult> {
  return apiFetch<AuthResult>(settings, '/api/v1/auth/refresh', { method: 'POST' })
}

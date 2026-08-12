import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { createDatabase, type DatabaseClient } from '../src/db.js'

interface AuthBody {
  user: {
    id: string
    email: string
    name?: string
  }
  token: string
}

interface MemoryItemBody {
  id: string
  title: string
  url?: string
}

type HeaderMap = Record<string, string>

let database: DatabaseClient
let app: ReturnType<typeof createApp>
let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'daymark-api-'))
  database = createDatabase(join(tempDir, 'test.sqlite'))
  app = createApp({ database })
})

afterEach(() => {
  database.close()
  rmSync(tempDir, { recursive: true, force: true })
})

describe('auth', () => {
  it('registers, reads the current user, logs out, and logs back in', async () => {
    const registered = await register('reader@example.com')

    expect(registered.response.status).toBe(201)
    expect(registered.body.user).toMatchObject({
      email: 'reader@example.com',
      name: 'Reader',
    })
    expect(registered.body.token).toMatch(/^[a-f0-9]{64}$/)

    const me = await app.request('/api/v1/auth/me', {
      headers: authHeaders(registered.body.token),
    })
    expect(me.status).toBe(200)
    await expect(me.json()).resolves.toMatchObject({
      email: 'reader@example.com',
      name: 'Reader',
    })

    const logout = await app.request('/api/v1/auth/logout', {
      method: 'POST',
      headers: authHeaders(registered.body.token),
    })
    expect(logout.status).toBe(204)

    const loggedOutMe = await app.request('/api/v1/auth/me', {
      headers: authHeaders(registered.body.token),
    })
    expect(loggedOutMe.status).toBe(401)

    const login = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com', password: 'correct-horse' }),
    })
    expect(login.status).toBe(200)
    await expect(login.json()).resolves.toMatchObject({
      user: { email: 'reader@example.com' },
      token: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })
})

describe('saves', () => {
  it('creates, lists, and fetches a save for the signed-in user', async () => {
    const { body: registered } = await register('saves@example.com')
    const create = await app.request('/api/v1/saves', {
      method: 'POST',
      headers: jsonAuthHeaders(registered.token),
      body: JSON.stringify({
        type: 'link',
        title: 'SQLite patterns',
        url: 'https://example.com/sqlite',
        summary: 'A useful article about local-first data.',
        note: 'Return to this before schema work.',
        tags: ['sqlite', 'local-first'],
        platform: 'article',
      }),
    })

    expect(create.status).toBe(201)
    const created = (await create.json()) as MemoryItemBody
    expect(created).toMatchObject({
      id: expect.stringMatching(/^sav_/),
      type: 'link',
      title: 'SQLite patterns',
      tags: ['sqlite', 'local-first'],
      archived: false,
    })

    const list = await app.request('/api/v1/saves?limit=10', {
      headers: authHeaders(registered.token),
    })
    expect(list.status).toBe(200)
    await expect(list.json()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: created.id, title: 'SQLite patterns' })],
    })

    const fetched = await app.request(`/api/v1/saves/${created.id}`, {
      headers: authHeaders(registered.token),
    })
    expect(fetched.status).toBe(200)
    await expect(fetched.json()).resolves.toMatchObject({
      id: created.id,
      url: 'https://example.com/sqlite',
    })
  })

  it('batch creates and updates saves by id', async () => {
    const { body: registered } = await register('batch@example.com')

    const created = await postJson(
      '/api/v1/saves/batch',
      registered.token,
      {
        items: [
          {
            id: 'sav_known',
            type: 'text',
            title: 'Original note',
            summary: 'A clipped thought.',
            tags: ['notes'],
            platform: 'note',
          },
        ],
      },
    )
    expect(created.status).toBe(200)
    await expect(created.json()).resolves.toEqual({
      created: 1,
      updated: 0,
      ids: ['sav_known'],
    })

    const updated = await postJson(
      '/api/v1/saves/batch',
      registered.token,
      {
        items: [
          {
            id: 'sav_known',
            type: 'text',
            title: 'Updated note',
            summary: 'An edited thought.',
            tags: ['notes', 'edited'],
            platform: 'note',
          },
        ],
      },
    )
    expect(updated.status).toBe(200)
    await expect(updated.json()).resolves.toEqual({
      created: 0,
      updated: 1,
      ids: ['sav_known'],
    })

    const fetched = await app.request('/api/v1/saves/sav_known', {
      headers: authHeaders(registered.token),
    })
    await expect(fetched.json()).resolves.toMatchObject({
      title: 'Updated note',
      tags: ['notes', 'edited'],
    })
  })
})

async function register(email: string) {
  const response = await app.request('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse', name: 'Reader' }),
  })
  return { response, body: (await response.json()) as AuthBody }
}

function authHeaders(token: string): HeaderMap {
  return { authorization: `Bearer ${token}` }
}

function jsonAuthHeaders(token: string): HeaderMap {
  return { ...authHeaders(token), 'content-type': 'application/json' }
}

async function postJson(path: string, token: string, body: unknown): Promise<Response> {
  return await app.request(path, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  })
}

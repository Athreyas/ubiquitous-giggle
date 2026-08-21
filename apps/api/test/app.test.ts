import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'

import { createApp } from '../src/app.js'
import { createDatabase, type DatabaseClient } from '../src/db.js'
import { enrichmentJobs, spaces } from '../src/schema.js'

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
  type?: string
  title: string
  url?: string
  tags?: string[]
  thumbnailUrl?: string
  archived?: boolean
}

type HeaderMap = Record<string, string>

let database: DatabaseClient
let app: ReturnType<typeof createApp>
let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'daymark-api-'))
  database = createDatabase(join(tempDir, 'test.sqlite'))
  app = createApp({ database, assetRoot: join(tempDir, 'assets'), enableEnrichmentWorker: false })
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
    expect(registered.response.headers.get('set-cookie')).toContain(
      'warren_session=' + registered.body.token + '; HttpOnly; Path=/; SameSite=Lax',
    )

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
    const loginCookie = login.headers.get('set-cookie')
    const loggedIn = (await login.json()) as AuthBody
    expect(loggedIn).toMatchObject({
      user: { email: 'reader@example.com' },
      token: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
    expect(loginCookie).toContain(
      'warren_session=' + loggedIn.token + '; HttpOnly; Path=/; SameSite=Lax',
    )

    const cookieMe = await app.request('/api/v1/auth/me', {
      headers: { cookie: cookieHeader(loginCookie) },
    })
    expect(cookieMe.status).toBe(200)
    await expect(cookieMe.json()).resolves.toMatchObject({
      email: 'reader@example.com',
      name: 'Reader',
    })
  })

  it('seeds default spaces when registering', async () => {
    const { body: registered } = await register('spaces@example.com')

    const seeded = database.db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, registered.user.id))
      .all()
      .sort((left, right) => left.position - right.position)

    expect(seeded.map((space) => [space.name, space.slug, space.position])).toEqual([
      ['Personal', 'personal', 0],
      ['Work', 'work', 1],
      ['Learning', 'learning', 2],
    ])
  })

  it('lists, creates, renames, and deletes spaces via the API', async () => {
    const { body: registered } = await register('space-api@example.com')
    const listed = await app.request('/api/v1/spaces', {
      headers: authHeaders(registered.token),
    })
    expect(listed.status).toBe(200)
    const before = (await listed.json()) as {
      items: Array<{ id: string; name: string; slug: string }>
    }
    expect(before.items).toHaveLength(3)

    const created = await postJson('/api/v1/spaces', registered.token, { name: 'Side projects' })
    expect(created.status).toBe(201)
    const space = (await created.json()) as { id: string; name: string }
    expect(space.name).toBe('Side projects')

    const patched = await app.request(`/api/v1/spaces/${space.id}`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(registered.token),
      body: JSON.stringify({ name: 'Side Projects' }),
    })
    expect(patched.status).toBe(200)
    await expect(patched.json()).resolves.toMatchObject({ name: 'Side Projects' })

    const deleted = await app.request(`/api/v1/spaces/${space.id}`, {
      method: 'DELETE',
      headers: authHeaders(registered.token),
    })
    expect(deleted.status).toBe(204)
  })

  it('filters saves by space and hybrid-searches within a space', async () => {
    const { body: registered } = await register('search-space@example.com')
    const listed = await app.request('/api/v1/spaces', {
      headers: authHeaders(registered.token),
    })
    const spaceItems = (
      (await listed.json()) as { items: Array<{ id: string; slug: string }> }
    ).items
    const personal = spaceItems.find((space) => space.slug === 'personal')!
    const work = spaceItems.find((space) => space.slug === 'work')!

    const personalSave = await postJson('/api/v1/saves', registered.token, {
      ...saveInput('Personal gardening notes'),
      spaceId: personal.id,
    })
    const workSave = await postJson('/api/v1/saves', registered.token, {
      ...saveInput('Work quarterly planning'),
      spaceId: work.id,
    })
    expect(personalSave.status).toBe(201)
    expect(workSave.status).toBe(201)

    const filtered = await app.request(`/api/v1/saves?spaceId=${work.id}`, {
      headers: authHeaders(registered.token),
    })
    expect(filtered.status).toBe(200)
    const workOnly = (await filtered.json()) as { items: MemoryItemBody[] }
    expect(workOnly.items).toHaveLength(1)
    expect(workOnly.items[0]?.title).toBe('Work quarterly planning')

    const search = await app.request(`/api/v1/search?q=gardening&spaceId=${personal.id}`, {
      headers: authHeaders(registered.token),
    })
    expect(search.status).toBe(200)
    const hits = (await search.json()) as { items: MemoryItemBody[] }
    expect(hits.items.map((item) => item.title)).toEqual(['Personal gardening notes'])

    const leak = await app.request(`/api/v1/search?q=gardening&spaceId=${work.id}`, {
      headers: authHeaders(registered.token),
    })
    const leakHits = (await leak.json()) as { items: MemoryItemBody[] }
    expect(leakHits.items).toHaveLength(0)
  })

  it('defaults new saves into the personal space when spaceId is omitted', async () => {
    const { body: registered } = await register('default-space@example.com')
    const created = await postJson('/api/v1/saves', registered.token, saveInput('No space set'))
    expect(created.status).toBe(201)
    const save = (await created.json()) as MemoryItemBody & { spaceId?: string }
    const personal = database.db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, registered.user.id))
      .all()
      .find((space) => space.slug === 'personal')
    expect(save.spaceId).toBe(personal?.id)
  })

  it('rotates a valid session token and invalidates the previous token', async () => {
    const registered = await register('refresh@example.com')
    const refresh = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { cookie: cookieHeader(registered.response.headers.get('set-cookie')) },
    })

    expect(refresh.status).toBe(200)
    const refreshed = (await refresh.json()) as AuthBody
    expect(refreshed.token).toMatch(/^[a-f0-9]{64}$/)
    expect(refreshed.token).not.toBe(registered.body.token)
    expect(refresh.headers.get('set-cookie')).toContain(`warren_session=${refreshed.token}`)

    const oldSession = await app.request('/api/v1/auth/me', {
      headers: authHeaders(registered.body.token),
    })
    expect(oldSession.status).toBe(401)

    const newSession = await app.request('/api/v1/auth/me', {
      headers: authHeaders(refreshed.token),
    })
    expect(newSession.status).toBe(200)
  })
})

describe('schema migration', () => {
  it('creates the MARK-2 graph and sharing tables', () => {
    const rows = database.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?, ?, ?) ORDER BY name",
      )
      .all('constellations', 'constellation_members', 'shares', 'save_links') as Array<{
      name: string
    }>

    expect(rows.map((row) => row.name)).toEqual([
      'constellation_members',
      'constellations',
      'save_links',
      'shares',
    ])
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
    const etag = list.headers.get('etag')
    expect(etag).toMatch(/^"saves-[a-f0-9]{16}"$/)
    await expect(list.json()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: created.id, title: 'SQLite patterns' })],
    })

    const unchangedList = await app.request('/api/v1/saves?limit=10', {
      headers: { ...authHeaders(registered.token), 'if-none-match': etag ?? '' },
    })
    expect(unchangedList.status).toBe(304)

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

  it('enqueues an enrichment job when creating a save', async () => {
    const { body: registered } = await register('enrich@example.com')
    const create = await postJson('/api/v1/saves', registered.token, {
      type: 'text',
      title: 'Notebook',
      summary: 'A captured thought about local search.',
      tags: ['notes'],
      platform: 'note',
    })
    expect(create.status).toBe(201)
    const created = (await create.json()) as MemoryItemBody

    const job = database.db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.saveId, created.id))
      .get()
    expect(job).toMatchObject({
      saveId: created.id,
      status: 'pending',
      attempts: 0,
    })

    const status = await app.request(`/api/v1/enrichment/${created.id}`, {
      headers: authHeaders(registered.token),
    })
    expect(status.status).toBe(200)
    await expect(status.json()).resolves.toMatchObject({
      saveId: created.id,
      status: 'pending',
    })
  })

  it('uploads an authenticated asset save and serves its bytes', async () => {
    const { body: registered } = await register('assets@example.com')
    const form = new FormData()
    form.set('file', new File(['hello asset'], 'hello.txt', { type: 'text/plain' }))
    form.set('title', 'hello.txt')
    form.set('note', 'Asset note')
    form.set('tags', 'asset,upload')

    const upload = await app.request('/api/v1/saves/upload', {
      method: 'POST',
      headers: authHeaders(registered.token),
      body: form,
    })

    expect(upload.status).toBe(201)
    const uploaded = (await upload.json()) as MemoryItemBody
    expect(uploaded).toMatchObject({
      id: expect.stringMatching(/^sav_/),
      type: 'asset',
      title: 'hello.txt',
      url: `/api/v1/assets/${uploaded.id}`,
      thumbnailUrl: `/api/v1/assets/${uploaded.id}`,
      tags: ['asset', 'upload'],
    })

    const asset = await app.request(`/api/v1/assets/${uploaded.id}`, {
      headers: authHeaders(registered.token),
    })
    expect(asset.status).toBe(200)
    expect(asset.headers.get('content-type')).toContain('text/plain')
    await expect(asset.text()).resolves.toBe('hello asset')
  })

  it('stores and returns an on-device embedding for a save', async () => {
    const { body: registered } = await register('embed@example.com')
    const create = await postJson('/api/v1/saves', registered.token, {
      type: 'text',
      title: 'Embedding note',
      summary: 'Local vectors without a cloud LLM.',
      tags: ['ml'],
      platform: 'note',
    })
    const created = (await create.json()) as MemoryItemBody
    const vector = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1))

    const put = await app.request(`/api/v1/saves/${created.id}/embedding`, {
      method: 'PUT',
      headers: jsonAuthHeaders(registered.token),
      body: JSON.stringify({ model: 'warren-hash-v1', dims: 16, vector }),
    })
    expect(put.status).toBe(200)

    const get = await app.request(`/api/v1/saves/${created.id}/embedding`, {
      headers: authHeaders(registered.token),
    })
    expect(get.status).toBe(200)
    await expect(get.json()).resolves.toMatchObject({
      saveId: created.id,
      model: 'warren-hash-v1',
      dims: 16,
      vector,
    })
  })

  it('creates and lists links only between saves owned by the user', async () => {
    const { body: registered } = await register('links@example.com')
    const first = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('First'))
    ).json()) as MemoryItemBody
    const second = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Second'))
    ).json()) as MemoryItemBody

    const createLink = await postJson(`/api/v1/saves/${first.id}/links`, registered.token, {
      toSaveId: second.id,
    })
    expect(createLink.status).toBe(201)
    await expect(createLink.json()).resolves.toMatchObject({
      id: expect.stringMatching(/^lnk_/),
      fromSaveId: first.id,
      toSaveId: second.id,
      createdAt: expect.any(String),
    })

    const listLinks = await app.request(`/api/v1/saves/${first.id}/links`, {
      headers: authHeaders(registered.token),
    })
    expect(listLinks.status).toBe(200)
    await expect(listLinks.json()).resolves.toMatchObject({
      items: [expect.objectContaining({ fromSaveId: first.id, toSaveId: second.id })],
    })

    const duplicate = await postJson(`/api/v1/saves/${first.id}/links`, registered.token, {
      toSaveId: second.id,
    })
    expect(duplicate.status).toBe(409)

    const { body: other } = await register('other-links@example.com')
    const foreign = (await (
      await postJson('/api/v1/saves', other.token, saveInput('Foreign'))
    ).json()) as MemoryItemBody
    const crossUser = await postJson(`/api/v1/saves/${first.id}/links`, registered.token, {
      toSaveId: foreign.id,
    })
    expect(crossUser.status).toBe(404)
  })
})

describe('sync stream', () => {
  it('emits saves and surfacing events for authenticated mutations', async () => {
    const registered = await register('stream@example.com')
    const streamResponse = await app.request('/api/v1/sync/stream', {
      headers: authHeaders(registered.body.token),
    })
    expect(streamResponse.status).toBe(200)
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream')

    const reader = streamResponse.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    try {
      await expect(readStreamChunk(reader)).resolves.toBe(': connected\n\n')

      const create = await postJson('/api/v1/saves', registered.body.token, saveInput('Streamed'))
      expect(create.status).toBe(201)
      const created = (await create.json()) as MemoryItemBody
      await expect(readStreamChunk(reader)).resolves.toMatch(
        /^event: saves\ndata: \{"updatedAt":"[^"]+"\}\n\n$/,
      )

      const update = await app.request(`/api/v1/saves/${created.id}`, {
        method: 'PATCH',
        headers: jsonAuthHeaders(registered.body.token),
        body: JSON.stringify({ title: 'Streamed update' }),
      })
      expect(update.status).toBe(200)
      await expect(readStreamChunk(reader)).resolves.toMatch(/^event: saves\ndata: /)

      const remove = await app.request(`/api/v1/saves/${created.id}`, {
        method: 'DELETE',
        headers: authHeaders(registered.body.token),
      })
      expect(remove.status).toBe(204)
      await expect(readStreamChunk(reader)).resolves.toMatch(/^event: saves\ndata: /)

      const put = await app.request('/api/v1/surfacing', {
        method: 'PUT',
        headers: jsonAuthHeaders(registered.body.token),
        body: JSON.stringify({
          byDay: {},
          lastSurfaced: {},
          lastOpened: {},
          dismissed: [],
        }),
      })
      expect(put.status).toBe(200)
      await expect(readStreamChunk(reader)).resolves.toMatch(
        /^event: surfacing\ndata: \{"updatedAt":"[^"]+"\}\n\n$/,
      )
    } finally {
      await reader.cancel()
    }
  })

  it('ranks related saves by embedding cosine similarity', async () => {
    const { body: registered } = await register('related@example.com')
    const a = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Alpha note'))
    ).json()) as MemoryItemBody
    const b = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Beta note'))
    ).json()) as MemoryItemBody
    const c = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Gamma note'))
    ).json()) as MemoryItemBody

    const near = [1, 0, 0, 0, 0, 0, 0, 0]
    const alsoNear = [0.9, 0.1, 0, 0, 0, 0, 0, 0]
    const far = [0, 0, 0, 0, 0, 0, 0, 1]

    for (const [id, vector] of [
      [a.id, near],
      [b.id, alsoNear],
      [c.id, far],
    ] as const) {
      const put = await app.request(`/api/v1/saves/${id}/embedding`, {
        method: 'PUT',
        headers: jsonAuthHeaders(registered.token),
        body: JSON.stringify({ model: 'test', dims: 8, vector }),
      })
      expect(put.status).toBe(200)
    }

    const related = await app.request(`/api/v1/saves/${a.id}/related?limit=2`, {
      headers: authHeaders(registered.token),
    })
    expect(related.status).toBe(200)
    const body = (await related.json()) as { items: Array<{ id: string; similarity: number }> }
    expect(body.items[0]?.id).toBe(b.id)
    expect(body.items[0]?.similarity).toBeGreaterThan(body.items[1]?.similarity ?? 0)
  })

  it('accepts session-cookie authentication', async () => {
    const registered = await register('cookie-stream@example.com')
    const response = await app.request('/api/v1/sync/stream', {
      headers: { cookie: cookieHeader(registered.response.headers.get('set-cookie')) },
    })
    expect(response.status).toBe(200)
    const reader = response.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return
    await expect(readStreamChunk(reader)).resolves.toBe(': connected\n\n')
    await reader.cancel()
  })

  it('requires authentication', async () => {
    const response = await app.request('/api/v1/sync/stream')
    expect(response.status).toBe(401)
  })
})

describe('enrichment worker', () => {
  it('backfills an extractive summary and clamps tags between 2 and 5', async () => {
    app = createApp({ database, assetRoot: join(tempDir, 'assets'), enableEnrichmentWorker: true })
    const { body: registered } = await register('enrich-worker@example.com')

    const create = await postJson('/api/v1/saves', registered.token, {
      type: 'text',
      title: 'Local-first sync notes',
      summary: '',
      note:
        'Local-first sync patterns keep data on-device first. CRDTs resolve conflicts without a central server. ' +
        'Offline queues replay writes once connectivity returns.',
      tags: [],
      platform: 'note',
    })
    expect(create.status).toBe(201)
    const created = (await create.json()) as MemoryItemBody

    const job = await waitForEnrichmentDone(registered.token, created.id)
    expect(job.status).toBe('done')

    const fetched = await app.request(`/api/v1/saves/${created.id}`, {
      headers: authHeaders(registered.token),
    })
    const item = (await fetched.json()) as MemoryItemBody & { summary: string }

    expect(item.summary.trim().length).toBeGreaterThan(0)
    expect(item.summary.length).toBeLessThanOrEqual(221)
    expect(item.tags?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(item.tags?.length ?? 0).toBeLessThanOrEqual(5)
  })

  it('leaves an already-descriptive summary untouched', async () => {
    app = createApp({ database, assetRoot: join(tempDir, 'assets'), enableEnrichmentWorker: true })
    const { body: registered } = await register('enrich-keep-summary@example.com')

    const original = 'A hand-written summary long enough that enrichment should not replace it.'
    const create = await postJson('/api/v1/saves', registered.token, {
      type: 'text',
      title: 'Keep my summary',
      summary: original,
      note: 'Extra body text used only for keyword extraction, not for the summary itself.',
      tags: ['keep'],
      platform: 'note',
    })
    const created = (await create.json()) as MemoryItemBody

    await waitForEnrichmentDone(registered.token, created.id)

    const fetched = await app.request(`/api/v1/saves/${created.id}`, {
      headers: authHeaders(registered.token),
    })
    const item = (await fetched.json()) as { summary: string }
    expect(item.summary).toBe(original)
  })
})

describe('clustering', () => {
  it('greedily groups saves whose embeddings are highly similar', async () => {
    const { body: registered } = await register('clustering@example.com')
    const first = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Cluster A'))
    ).json()) as MemoryItemBody
    const second = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Cluster B'))
    ).json()) as MemoryItemBody
    const outlier = (await (
      await postJson('/api/v1/saves', registered.token, saveInput('Lonely note'))
    ).json()) as MemoryItemBody

    const tight = [1, 0, 0, 0, 0, 0, 0, 0]
    const almostTight = [0.99, 0.01, 0, 0, 0, 0, 0, 0]
    const different = [0, 1, 0, 0, 0, 0, 0, 0]

    for (const [id, vector] of [
      [first.id, tight],
      [second.id, almostTight],
      [outlier.id, different],
    ] as const) {
      const put = await app.request(`/api/v1/saves/${id}/embedding`, {
        method: 'PUT',
        headers: jsonAuthHeaders(registered.token),
        body: JSON.stringify({ model: 'test', dims: 8, vector }),
      })
      expect(put.status).toBe(200)
    }

    const run = await app.request('/api/v1/clustering/run', {
      method: 'POST',
      headers: authHeaders(registered.token),
    })
    expect(run.status).toBe(200)
    const body = (await run.json()) as {
      suggestions: Array<{ memberIds: string[]; size: number }>
      persisted: boolean
    }

    expect(body.suggestions).toHaveLength(1)
    expect(body.suggestions[0]?.memberIds.sort()).toEqual([first.id, second.id].sort())
    expect(body.suggestions[0]?.size).toBe(2)
    expect(body.persisted).toBe(true)
  })
})

async function waitForEnrichmentDone(
  token: string,
  saveId: string,
  timeoutMs = 4000,
): Promise<{ status: string }> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await app.request(`/api/v1/enrichment/${saveId}`, {
      headers: authHeaders(token),
    })
    const body = (await res.json()) as { status: string }
    if (body.status === 'done' || body.status === 'failed') return body
    await new Promise((resolve) => setTimeout(resolve, 15))
  }
  throw new Error('Enrichment job did not complete in time.')
}

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

function cookieHeader(setCookie: string | null): string {
  expect(setCookie).toBeTruthy()
  return setCookie?.split(';')[0] ?? ''
}

async function postJson(path: string, token: string, body: unknown): Promise<Response> {
  return await app.request(path, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(body),
  })
}

function saveInput(title: string) {
  return {
    type: 'text',
    title,
    summary: `${title} summary`,
    tags: ['test'],
    platform: 'note',
  }
}

async function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const result = await reader.read()
  expect(result.done).toBe(false)
  return new TextDecoder().decode(result.value)
}

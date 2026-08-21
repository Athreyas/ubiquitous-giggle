import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { and, asc, desc, eq, lt, ne, type SQL } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'

import { createToken, hashPassword, hashToken, tokenExpiry, verifyPassword } from './auth.js'
import { createDatabase, type DatabaseClient, type WarrenDatabase } from './db.js'
import {
  constellationMembers,
  constellations,
  embeddings,
  enrichmentJobs,
  saveLinks,
  saves,
  spaces,
  surfacingState,
  tokens,
  users,
  type EnrichmentJob,
  type Save,
  type SaveLink,
  type User,
} from './schema.js'
import {
  batchSavesSchema,
  createSaveLinkSchema,
  createSaveSchema,
  createSpaceSchema,
  embeddingUpsertSchema,
  loginSchema,
  patchSaveSchema,
  patchSpaceSchema,
  registerSchema,
  surfacingEventSchema,
  surfacingStateSchema,
  type CreateSaveInput,
  type PatchSaveInput,
  type SurfacingState,
} from './validation.js'

const allowedOrigins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173'])
const sessionCookieName = 'warren_session'
const defaultAssetRoot = () => resolve(process.cwd(), '.data/assets')
const defaultSpaces = [
  { name: 'Personal', slug: 'personal', position: 0 },
  { name: 'Work', slug: 'work', position: 1 },
  { name: 'Learning', slug: 'learning', position: 2 },
] as const
const syncClients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>()
const sseEncoder = new TextEncoder()

const defaultSurfacingState = (): SurfacingState => ({
  byDay: {},
  lastSurfaced: {},
  lastOpened: {},
  dismissed: [],
})

interface PublicUser {
  id: string
  email: string
  name?: string
}

interface MemoryItem {
  id: string
  type: 'link' | 'text' | 'asset'
  title: string
  url?: string
  summary: string
  note?: string
  tags: string[]
  thumbnailUrl?: string
  platform: 'youtube' | 'instagram' | 'tiktok' | 'article' | 'note' | 'other'
  createdAt: string
  archived: boolean
  spaceId?: string
  extractedText?: string
  keywords?: string[]
}

type AppEnv = {
  Variables: {
    user: PublicUser
    tokenHash: string
  }
}

interface CreateAppOptions {
  database?: DatabaseClient
  assetRoot?: string
  enableEnrichmentWorker?: boolean
}

export function createApp(options: CreateAppOptions = {}): Hono<AppEnv> {
  const database = options.database ?? createDatabase()
  const { db } = database
  const assetRoot = options.assetRoot ?? defaultAssetRoot()
  const enableEnrichmentWorker = options.enableEnrichmentWorker ?? true
  let enrichmentScheduled = false
  const app = new Hono<AppEnv>()

  app.use(
    '*',
    cors({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  )

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status)
    }

    console.error(error)
    return c.json({ error: 'Internal server error.' }, 500)
  })

  const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(header)
    const token = match?.[1] ?? parseCookies(c.req.header('cookie'))[sessionCookieName]
    if (!token) {
      throw new HTTPException(401, { message: 'Bearer token or session cookie required.' })
    }

    const tokenHash = hashToken(token)
    const tokenRow = db.select().from(tokens).where(eq(tokens.tokenHash, tokenHash)).get()
    if (!tokenRow) {
      throw new HTTPException(401, { message: 'Invalid token.' })
    }

    if (Date.parse(tokenRow.expiresAt) <= Date.now()) {
      db.delete(tokens).where(eq(tokens.tokenHash, tokenHash)).run()
      throw new HTTPException(401, { message: 'Token expired.' })
    }

    const user = db.select().from(users).where(eq(users.id, tokenRow.userId)).get()
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid token.' })
    }

    c.set('user', toPublicUser(user))
    c.set('tokenHash', tokenHash)
    await next()
  })

  function enqueueEnrichment(saveId: string): void {
    const now = new Date().toISOString()
    db.insert(enrichmentJobs)
      .values({
        id: `enj_${randomUUID()}`,
        saveId,
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    scheduleEnrichment()
  }

  function scheduleEnrichment(): void {
    if (!enableEnrichmentWorker || enrichmentScheduled) {
      return
    }

    enrichmentScheduled = true
    queueMicrotask(() => {
      void processPendingEnrichmentJobs(database).finally(() => {
        enrichmentScheduled = false
      })
    })
  }

  app.get('/health', (c) => c.json({ ok: true }))

  app.post('/api/v1/auth/register', async (c) => {
    const input = await readJson(c, registerSchema)
    const now = new Date().toISOString()
    const user: User = {
      id: `usr_${randomUUID()}`,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name ?? null,
      createdAt: now,
    }
    const token = createToken()

    try {
      db.transaction((tx) => {
        tx.insert(users).values(user).run()
        tx.insert(tokens)
          .values({
            tokenHash: hashToken(token),
            userId: user.id,
            expiresAt: tokenExpiry(),
            createdAt: now,
          })
          .run()
        tx.insert(spaces)
          .values(
            defaultSpaces.map((space) => ({
              id: `spc_${randomUUID()}`,
              userId: user.id,
              name: space.name,
              slug: space.slug,
              position: space.position,
              createdAt: now,
            })),
          )
          .run()
      })
    } catch (error) {
      if (isUniqueConstraint(error)) {
        throw new HTTPException(409, { message: 'Email is already registered.' })
      }
      throw error
    }

    setSessionCookie(c, token)
    return c.json({ user: toPublicUser(user), token }, 201)
  })

  app.post('/api/v1/auth/login', async (c) => {
    const input = await readJson(c, loginSchema)
    const user = db.select().from(users).where(eq(users.email, input.email)).get()
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new HTTPException(401, { message: 'Invalid email or password.' })
    }

    const token = createToken()
    db.insert(tokens)
      .values({
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: tokenExpiry(),
        createdAt: new Date().toISOString(),
      })
      .run()

    setSessionCookie(c, token)
    return c.json({ user: toPublicUser(user), token })
  })

  app.post('/api/v1/auth/logout', requireAuth, (c) => {
    db.delete(tokens).where(eq(tokens.tokenHash, c.get('tokenHash'))).run()
    clearSessionCookie(c)
    return c.body(null, 204)
  })

  app.post('/api/v1/auth/refresh', requireAuth, (c) => {
    const user = c.get('user')
    const oldTokenHash = c.get('tokenHash')
    const token = createToken()
    const now = new Date().toISOString()

    db.transaction((tx) => {
      tx.delete(tokens).where(eq(tokens.tokenHash, oldTokenHash)).run()
      tx.insert(tokens)
        .values({
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: tokenExpiry(),
          createdAt: now,
        })
        .run()
    })

    setSessionCookie(c, token)
    return c.json({ user, token })
  })

  app.get('/api/v1/spaces', requireAuth, (c) => {
    const rows = db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, c.get('user').id))
      .orderBy(asc(spaces.position))
      .all()
    return c.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        position: row.position,
        createdAt: row.createdAt,
      })),
    })
  })

  app.post('/api/v1/spaces', requireAuth, async (c) => {
    const input = await readJson(c, createSpaceSchema)
    const user = c.get('user')
    const now = new Date().toISOString()
    const maxPos =
      db
        .select()
        .from(spaces)
        .where(eq(spaces.userId, user.id))
        .orderBy(desc(spaces.position))
        .get()?.position ?? -1
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || `space-${Date.now()}`
    const row = {
      id: `spc_${randomUUID()}`,
      userId: user.id,
      name: input.name,
      slug: `${slug}-${randomUUID().slice(0, 6)}`,
      position: maxPos + 1,
      createdAt: now,
    }
    db.insert(spaces).values(row).run()
    return c.json(
      { id: row.id, name: row.name, slug: row.slug, position: row.position, createdAt: row.createdAt },
      201,
    )
  })

  app.patch('/api/v1/spaces/:id', requireAuth, async (c) => {
    const input = await readJson(c, patchSpaceSchema)
    const user = c.get('user')
    const existing = db
      .select()
      .from(spaces)
      .where(and(eq(spaces.userId, user.id), eq(spaces.id, c.req.param('id'))))
      .get()
    if (!existing) throw new HTTPException(404, { message: 'Space not found.' })
    db.update(spaces)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      })
      .where(eq(spaces.id, existing.id))
      .run()
    const updated = db.select().from(spaces).where(eq(spaces.id, existing.id)).get()!
    return c.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      position: updated.position,
      createdAt: updated.createdAt,
    })
  })

  app.delete('/api/v1/spaces/:id', requireAuth, (c) => {
    const user = c.get('user')
    const existing = db
      .select()
      .from(spaces)
      .where(and(eq(spaces.userId, user.id), eq(spaces.id, c.req.param('id'))))
      .get()
    if (!existing) throw new HTTPException(404, { message: 'Space not found.' })
    const personal = db
      .select()
      .from(spaces)
      .where(and(eq(spaces.userId, user.id), eq(spaces.slug, 'personal')))
      .get()
    db.transaction((tx) => {
      tx.update(saves)
        .set({ spaceId: personal?.id ?? null, updatedAt: new Date().toISOString() })
        .where(and(eq(saves.userId, user.id), eq(saves.spaceId, existing.id)))
        .run()
      tx.delete(spaces).where(eq(spaces.id, existing.id)).run()
    })
    return c.body(null, 204)
  })

  app.get('/api/v1/search', requireAuth, (c) => {
    const user = c.get('user')
    const q = (c.req.query('q') ?? '').trim().toLowerCase()
    const limit = parseLimit(c.req.query('limit'), 20, 50)
    const spaceId = c.req.query('spaceId')
    if (!q) return c.json({ items: [] })

    const filters: SQL[] = [eq(saves.userId, user.id), eq(saves.archived, 0)]
    if (spaceId) filters.push(eq(saves.spaceId, spaceId))

    const rows = db
      .select()
      .from(saves)
      .where(and(...filters))
      .orderBy(desc(saves.updatedAt))
      .all()

    const queryVector = hashEmbed(q)
    const saveIds = new Set(rows.map((row) => row.id))
    const embeddingBySave = new Map(
      db
        .select()
        .from(embeddings)
        .all()
        .filter((row) => saveIds.has(row.saveId))
        .map((row) => [row.saveId, row] as const),
    )

    const scored = rows
      .map((row) => {
        const hay = [row.title, row.summary, row.note, row.url, row.tagsJson, row.extractedText]
          .filter(Boolean)
          .join('\n')
          .toLowerCase()
        let keywordScore = 0
        if (row.title.toLowerCase().includes(q)) keywordScore += 5
        if (hay.includes(q)) keywordScore += 2
        for (const part of q.split(/\s+/).filter(Boolean)) {
          if (hay.includes(part)) keywordScore += 1
        }

        let semanticScore = 0
        const embedding = embeddingBySave.get(row.id)
        if (embedding && embedding.dims === queryVector.length) {
          semanticScore = cosineSimilarity(
            queryVector,
            JSON.parse(embedding.vectorJson) as number[],
          )
        }

        // Hybrid: keyword dominates exact matches; semantic lifts vague NL queries.
        const score = keywordScore + semanticScore * 4
        return { row, score, keywordScore, semanticScore }
      })
      .filter((entry) => entry.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return c.json({
      items: scored.map((entry) => ({
        ...toMemoryItem(entry.row),
        score: entry.score,
        keywordScore: entry.keywordScore,
        semanticScore: entry.semanticScore,
      })),
    })
  })

  app.get('/api/v1/auth/me', requireAuth, (c) => c.json(c.get('user')))

  app.get('/api/v1/sync/stream', requireAuth, (c) => {
    const userId = c.get('user').id
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined
    let heartbeat: ReturnType<typeof setInterval> | undefined

    const cleanup = () => {
      if (heartbeat) clearInterval(heartbeat)
      if (!controller) return
      const clients = syncClients.get(userId)
      clients?.delete(controller)
      if (clients?.size === 0) syncClients.delete(userId)
    }

    const stream = new ReadableStream<Uint8Array>({
      start(nextController) {
        controller = nextController
        let clients = syncClients.get(userId)
        if (!clients) {
          clients = new Set()
          syncClients.set(userId, clients)
        }
        clients.add(nextController)
        nextController.enqueue(sseEncoder.encode(': connected\n\n'))
        heartbeat = setInterval(() => {
          try {
            nextController.enqueue(sseEncoder.encode(': heartbeat\n\n'))
          } catch {
            cleanup()
          }
        }, 25_000)
      },
      cancel: cleanup,
    })

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'X-Accel-Buffering': 'no',
      },
    })
  })

  app.get('/api/v1/assets/:id', requireAuth, (c) => {
    const row = getSaveForUser(db, c.get('user').id, c.req.param('id'))
    if (!row || row.type !== 'asset') {
      throw new HTTPException(404, { message: 'Asset not found.' })
    }

    const path = assetPathFor(assetRoot, c.get('user').id, row.id)
    if (!existsSync(path)) {
      throw new HTTPException(404, { message: 'Asset not found.' })
    }

    return new Response(new Uint8Array(readFileSync(path)), {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Content-Type': contentTypeForTitle(row.title),
      },
    })
  })

  app.get('/api/v1/saves', requireAuth, (c) => {
    const user = c.get('user')
    const etag = buildSavesEtag(database, user.id)
    c.header('ETag', etag)
    if (etagMatches(c.req.header('if-none-match'), etag)) {
      return c.body(null, 304)
    }

    const limit = parseLimit(c.req.query('limit'))
    const cursor = c.req.query('cursor')
    const archived = c.req.query('archived') ?? 'false'
    const spaceId = c.req.query('spaceId')
    const filters: SQL[] = [eq(saves.userId, user.id)]

    if (archived !== 'all') {
      filters.push(eq(saves.archived, archived === 'true' ? 1 : 0))
    }
    if (spaceId) {
      filters.push(eq(saves.spaceId, spaceId))
    }
    if (cursor) {
      filters.push(lt(saves.createdAt, cursor))
    }

    const rows = db
      .select()
      .from(saves)
      .where(and(...filters))
      .orderBy(desc(saves.createdAt))
      .limit(limit + 1)
      .all()
    const page = rows.slice(0, limit)
    const nextCursor = rows.length > limit ? page.at(-1)?.createdAt : undefined

    return c.json({ items: page.map(toMemoryItem), nextCursor })
  })

  app.post('/api/v1/saves', requireAuth, async (c) => {
    const input = await readJson(c, createSaveSchema)
    const row = buildSaveInsert(db, c.get('user').id, input)

    db.insert(saves).values(row).run()
    enqueueEnrichment(row.id)
    publishSyncEvent(row.userId, 'saves')

    return c.json(toMemoryItem(row), 201)
  })

  app.post('/api/v1/saves/upload', requireAuth, async (c) => {
    const body = await c.req.parseBody()
    const file = firstFile(body.file)
    if (!file) {
      throw new HTTPException(400, { message: 'Multipart field "file" is required.' })
    }

    const user = c.get('user')
    const id = mintSaveId()
    const assetPath = assetPathFor(assetRoot, user.id, id)
    mkdirSync(join(assetRoot, user.id), { recursive: true })
    writeFileSync(assetPath, Buffer.from(await file.arrayBuffer()))

    const note = firstString(body.note)
    const personalSpaceId =
      db
        .select()
        .from(spaces)
        .where(and(eq(spaces.userId, user.id), eq(spaces.slug, 'personal')))
        .get()?.id ?? null
    const row: Save = {
      id,
      userId: user.id,
      spaceId: personalSpaceId,
      type: 'asset',
      title: firstString(body.title) ?? file.name ?? 'Uploaded asset',
      url: `/api/v1/assets/${id}`,
      summary: note ?? '',
      note: note ?? null,
      tagsJson: JSON.stringify(parseUploadTags(body.tags)),
      thumbnailUrl: `/api/v1/assets/${id}`,
      platform: 'other',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: 0,
      extractedText: null,
      keywordsJson: null,
    }

    db.insert(saves).values(row).run()
    enqueueEnrichment(row.id)
    publishSyncEvent(row.userId, 'saves')

    return c.json(toMemoryItem(row), 201)
  })

  app.post('/api/v1/saves/batch', requireAuth, async (c) => {
    const { items } = await readJson(c, batchSavesSchema)
    const user = c.get('user')
    const result = db.transaction((tx) => {
      const ids: string[] = []
      let created = 0
      let updated = 0

      for (const item of items) {
        const id = item.id ?? mintSaveId()
        const existing = tx
          .select()
          .from(saves)
          .where(and(eq(saves.userId, user.id), eq(saves.id, id)))
          .get()

        if (existing) {
          tx.update(saves)
            .set(buildSaveUpdate(item, new Date().toISOString(), item.createdAt ?? existing.createdAt))
            .where(and(eq(saves.userId, user.id), eq(saves.id, id)))
            .run()
          updated += 1
        } else {
          tx.insert(saves).values(buildSaveInsert(tx, user.id, { ...item, id })).run()
          created += 1
        }
        ids.push(id)
      }

      return { created, updated, ids }
    })
    for (const id of result.ids) {
      enqueueEnrichment(id)
    }
    publishSyncEvent(user.id, 'saves')

    return c.json(result)
  })

  app.get('/api/v1/saves/:id', requireAuth, (c) => {
    const row = getSaveForUser(db, c.get('user').id, c.req.param('id'))
    if (!row) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }
    return c.json(toMemoryItem(row))
  })

  app.patch('/api/v1/saves/:id', requireAuth, async (c) => {
    const input = await readJson(c, patchSaveSchema)
    const user = c.get('user')
    const existing = getSaveForUser(db, user.id, c.req.param('id'))
    if (!existing) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }

    db.update(saves)
      .set(buildSaveUpdate(input, new Date().toISOString(), existing.createdAt))
      .where(and(eq(saves.userId, user.id), eq(saves.id, existing.id)))
      .run()
    publishSyncEvent(user.id, 'saves')

    const updated = getSaveForUser(db, user.id, existing.id)
    return c.json(toMemoryItem(updated ?? existing))
  })

  app.delete('/api/v1/saves/:id', requireAuth, (c) => {
    const result = db
      .delete(saves)
      .where(and(eq(saves.userId, c.get('user').id), eq(saves.id, c.req.param('id'))))
      .run()
    if (result.changes === 0) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }
    publishSyncEvent(c.get('user').id, 'saves')

    return c.body(null, 204)
  })

  app.post('/api/v1/saves/:id/links', requireAuth, async (c) => {
    const user = c.get('user')
    const fromSave = getSaveForUser(db, user.id, c.req.param('id'))
    if (!fromSave) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }
    const input = await readJson(c, createSaveLinkSchema)
    const toSave = getSaveForUser(db, user.id, input.toSaveId)
    if (!toSave) {
      throw new HTTPException(404, { message: 'Linked save not found.' })
    }

    const link = {
      id: `lnk_${randomUUID()}`,
      userId: user.id,
      fromSaveId: fromSave.id,
      toSaveId: toSave.id,
      createdAt: new Date().toISOString(),
    }
    try {
      db.insert(saveLinks).values(link).run()
    } catch (error) {
      if (isUniqueConstraint(error)) {
        throw new HTTPException(409, { message: 'These saves are already linked.' })
      }
      throw error
    }

    return c.json(toSaveLink(link), 201)
  })

  app.get('/api/v1/saves/:id/links', requireAuth, (c) => {
    const user = c.get('user')
    const fromSave = getSaveForUser(db, user.id, c.req.param('id'))
    if (!fromSave) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }

    const rows = db
      .select()
      .from(saveLinks)
      .where(and(eq(saveLinks.userId, user.id), eq(saveLinks.fromSaveId, fromSave.id)))
      .orderBy(desc(saveLinks.createdAt))
      .all()
    return c.json({ items: rows.map(toSaveLink) })
  })

  app.get('/api/v1/enrichment/:saveId', requireAuth, (c) => {
    const save = getSaveForUser(db, c.get('user').id, c.req.param('saveId'))
    if (!save) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }

    const job = db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.saveId, save.id))
      .orderBy(desc(enrichmentJobs.createdAt))
      .get()
    if (!job) {
      throw new HTTPException(404, { message: 'Enrichment job not found.' })
    }

    return c.json(toEnrichmentStatus(job))
  })

  app.put('/api/v1/saves/:id/embedding', requireAuth, async (c) => {
    const save = getSaveForUser(db, c.get('user').id, c.req.param('id'))
    if (!save) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }
    const input = await readJson(c, embeddingUpsertSchema)
    if (input.vector.length !== input.dims) {
      throw new HTTPException(400, { message: 'vector length must match dims.' })
    }
    upsertEmbedding(db, save.id, input.model, input.vector)
    return c.json({ saveId: save.id, model: input.model, dims: input.dims })
  })

  app.get('/api/v1/saves/:id/embedding', requireAuth, (c) => {
    const save = getSaveForUser(db, c.get('user').id, c.req.param('id'))
    if (!save) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }
    const row = db.select().from(embeddings).where(eq(embeddings.saveId, save.id)).get()
    if (!row) {
      throw new HTTPException(404, { message: 'Embedding not found.' })
    }
    return c.json({
      saveId: row.saveId,
      model: row.model,
      dims: row.dims,
      vector: JSON.parse(row.vectorJson) as number[],
      createdAt: row.createdAt,
    })
  })

  app.get('/api/v1/saves/:id/related', requireAuth, (c) => {
    const user = c.get('user')
    const save = getSaveForUser(db, user.id, c.req.param('id'))
    if (!save) {
      throw new HTTPException(404, { message: 'Save not found.' })
    }

    const target = db.select().from(embeddings).where(eq(embeddings.saveId, save.id)).get()
    if (!target) {
      throw new HTTPException(404, { message: 'Embedding not found for this save.' })
    }

    const limit = parseLimit(c.req.query('limit'), 5, 20)
    const targetVector = JSON.parse(target.vectorJson) as number[]

    const others = db
      .select({ save: saves, embedding: embeddings })
      .from(embeddings)
      .innerJoin(saves, eq(embeddings.saveId, saves.id))
      .where(and(eq(saves.userId, user.id), ne(saves.id, save.id)))
      .all()

    const ranked = others
      .filter((row) => row.embedding.dims === target.dims)
      .map((row) => ({
        save: row.save,
        similarity: cosineSimilarity(targetVector, JSON.parse(row.embedding.vectorJson) as number[]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return c.json({
      items: ranked.map((row) => ({ ...toMemoryItem(row.save), similarity: row.similarity })),
    })
  })

  app.post('/api/v1/clustering/run', requireAuth, (c) => {
    const user = c.get('user')
    const threshold = 0.82
    const spaceId = c.req.query('spaceId')

    const filters: SQL[] = [eq(saves.userId, user.id), eq(saves.archived, 0)]
    if (spaceId) filters.push(eq(saves.spaceId, spaceId))

    const rows = db
      .select({ save: saves, embedding: embeddings })
      .from(saves)
      .innerJoin(embeddings, eq(embeddings.saveId, saves.id))
      .where(and(...filters))
      .all()

    // Space-aware: never merge saves across spaces unless the caller asked for one space.
    const bySpace = new Map<string, typeof rows>()
    for (const row of rows) {
      const key = row.save.spaceId ?? '__unsorted__'
      const bucket = bySpace.get(key) ?? []
      bucket.push(row)
      bySpace.set(key, bucket)
    }

    const clusters = [...bySpace.values()].flatMap((bucket) =>
      greedyClusterBySimilarity(bucket, threshold),
    )
    const now = new Date().toISOString()

    const suggestions = clusters.map((cluster) => ({
      id: `sug_${randomUUID()}`,
      name: suggestConstellationName(cluster.map((row) => row.save)),
      memberIds: cluster.map((row) => row.save.id),
      size: cluster.length,
    }))

    // Persist as real constellations when the schema supports it (MARK-3 clustering
    // stub). If a future migration removes these tables, fall back to suggestions-only.
    let persisted = false
    try {
      for (const [index, cluster] of clusters.entries()) {
        const constellationId = `csl_${randomUUID()}`
        db.insert(constellations)
          .values({
            id: constellationId,
            userId: user.id,
            spaceId: cluster[0]?.save.spaceId ?? null,
            name: suggestions[index]?.name ?? 'Suggested constellation',
            pinned: 0,
            createdAt: now,
            updatedAt: now,
          })
          .run()

        cluster.forEach((row, position) => {
          db.insert(constellationMembers)
            .values({
              constellationId,
              saveId: row.save.id,
              position,
              createdAt: now,
            })
            .run()
        })
      }
      persisted = clusters.length > 0
    } catch {
      // TODO(MARK-3): constellations tables unavailable on this schema revision —
      // suggestions are still returned below, just not persisted.
      persisted = false
    }

    return c.json({ suggestions, persisted })
  })

  app.get('/api/v1/surfacing', requireAuth, (c) => {
    return c.json(loadSurfacingState(db, c.get('user').id))
  })

  app.put('/api/v1/surfacing', requireAuth, async (c) => {
    const state = await readJson(c, surfacingStateSchema)
    saveSurfacingState(db, c.get('user').id, state)
    publishSyncEvent(c.get('user').id, 'surfacing')
    return c.json(state)
  })

  app.post('/api/v1/surfacing/events', requireAuth, async (c) => {
    const event = await readJson(c, surfacingEventSchema)
    const state = loadSurfacingState(db, c.get('user').id)
    const ids = event.ids ?? (event.id ? [event.id] : [])
    const at = event.at ?? new Date().toISOString()

    if (event.type === 'surfaced') {
      const dayKey = at.slice(0, 10)
      state.byDay[dayKey] = unique([...(state.byDay[dayKey] ?? []), ...ids])
      for (const id of ids) {
        state.lastSurfaced[id] = at
      }
    } else if (event.type === 'opened') {
      for (const id of ids) {
        state.lastOpened[id] = at
      }
    } else {
      state.dismissed = unique([...state.dismissed, ...ids])
    }

    saveSurfacingState(db, c.get('user').id, state)
    publishSyncEvent(c.get('user').id, 'surfacing')
    return c.json(state)
  })

  return app
}

async function readJson<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body.' })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? 'Invalid request.' })
  }

  return parsed.data
}

function setSessionCookie(c: Context, token: string): void {
  const attributes = [`${sessionCookieName}=${token}`, 'HttpOnly', 'Path=/', 'SameSite=Lax']
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure')
  }
  c.header('Set-Cookie', attributes.join('; '))
}

function clearSessionCookie(c: Context): void {
  const attributes = [`${sessionCookieName}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure')
  }
  c.header('Set-Cookie', attributes.join('; '))
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {}
  }

  const cookies: Record<string, string> = {}
  for (const segment of header.split(';')) {
    const [rawName, ...rawValue] = segment.trim().split('=')
    if (!rawName || rawValue.length === 0) {
      continue
    }

    cookies[rawName] = decodeURIComponent(rawValue.join('='))
  }
  return cookies
}

function buildSavesEtag(database: DatabaseClient, userId: string): string {
  const row = database.sqlite
    .prepare("SELECT COALESCE(MAX(updated_at), '') AS max_updated_at FROM saves WHERE user_id = ?")
    .get(userId) as { max_updated_at: string }
  const digest = createHash('sha256').update(`${userId}:${row.max_updated_at}`).digest('hex').slice(0, 16)
  return `"saves-${digest}"`
}

function etagMatches(header: string | undefined, etag: string): boolean {
  if (!header) {
    return false
  }
  return header
    .split(',')
    .map((value) => value.trim())
    .includes(etag)
}

type MultipartValue = string | File | Array<string | File> | undefined

function firstFile(value: MultipartValue): File | undefined {
  if (Array.isArray(value)) {
    return value.find((item): item is File => item instanceof File)
  }
  return value instanceof File ? value : undefined
}

function firstString(value: MultipartValue): string | undefined {
  const raw = Array.isArray(value) ? value.find((item): item is string => typeof item === 'string') : value
  if (typeof raw !== 'string') {
    return undefined
  }
  const trimmed = raw.trim()
  return trimmed ? trimmed : undefined
}

function parseUploadTags(value: MultipartValue): string[] {
  const rawValues = Array.isArray(value) ? value : value === undefined ? [] : [value]
  const tags = rawValues.flatMap((item) => {
    if (typeof item !== 'string') {
      return []
    }
    const trimmed = item.trim()
    if (!trimmed) {
      return []
    }
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string')
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
    return trimmed.split(',')
  })

  return unique(tags.map((tag) => tag.trim()).filter(Boolean))
}

function assetPathFor(assetRoot: string, userId: string, id: string): string {
  return join(assetRoot, userId, id)
}

function contentTypeForTitle(title: string): string {
  const lower = title.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
  }
}

function buildSaveInsert(db: WarrenDatabase, userId: string, input: CreateSaveInput): Save {
  const now = new Date().toISOString()
  let spaceId = input.spaceId ?? null
  if (spaceId === null && input.spaceId === undefined) {
    spaceId =
      db
        .select()
        .from(spaces)
        .where(and(eq(spaces.userId, userId), eq(spaces.slug, 'personal')))
        .get()?.id ?? null
  }
  return {
    id: input.id ?? mintSaveId(),
    userId,
    spaceId,
    type: input.type,
    title: input.title,
    url: input.url ?? null,
    summary: input.summary,
    note: input.note ?? null,
    tagsJson: JSON.stringify(input.tags),
    thumbnailUrl: input.thumbnailUrl ?? null,
    platform: input.platform,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    archived: input.archived ? 1 : 0,
    extractedText: input.extractedText ?? null,
    keywordsJson: input.keywords ? JSON.stringify(input.keywords) : null,
  }
}

function buildSaveUpdate(
  input: CreateSaveInput | PatchSaveInput,
  updatedAt: string,
  createdAt: string,
): Partial<Save> {
  return {
    ...(input.spaceId !== undefined ? { spaceId: input.spaceId } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.url !== undefined ? { url: input.url } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...(input.tags !== undefined ? { tagsJson: JSON.stringify(input.tags) } : {}),
    ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
    ...(input.platform !== undefined ? { platform: input.platform } : {}),
    ...(input.archived !== undefined ? { archived: input.archived ? 1 : 0 } : {}),
    ...(input.extractedText !== undefined ? { extractedText: input.extractedText } : {}),
    ...(input.keywords !== undefined ? { keywordsJson: JSON.stringify(input.keywords) } : {}),
    createdAt: 'createdAt' in input && input.createdAt ? input.createdAt : createdAt,
    updatedAt,
  }
}

function toMemoryItem(row: Save): MemoryItem {
  return {
    id: row.id,
    type: row.type as MemoryItem['type'],
    title: row.title,
    ...(row.url ? { url: row.url } : {}),
    summary: row.summary,
    ...(row.note ? { note: row.note } : {}),
    tags: parseStringArray(row.tagsJson),
    ...(row.thumbnailUrl ? { thumbnailUrl: row.thumbnailUrl } : {}),
    platform: row.platform as MemoryItem['platform'],
    createdAt: row.createdAt,
    archived: Boolean(row.archived),
    ...(row.spaceId ? { spaceId: row.spaceId } : {}),
    ...(row.extractedText ? { extractedText: row.extractedText } : {}),
    ...(row.keywordsJson ? { keywords: parseStringArray(row.keywordsJson) } : {}),
  }
}

function toSaveLink(row: SaveLink) {
  return {
    id: row.id,
    fromSaveId: row.fromSaveId,
    toSaveId: row.toSaveId,
    createdAt: row.createdAt,
  }
}

function publishSyncEvent(userId: string, event: 'saves' | 'surfacing'): void {
  const clients = syncClients.get(userId)
  if (!clients?.size) return

  const payload = sseEncoder.encode(
    `event: ${event}\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`,
  )
  for (const controller of clients) {
    try {
      controller.enqueue(payload)
    } catch {
      clients.delete(controller)
    }
  }
  if (clients.size === 0) syncClients.delete(userId)
}

function toEnrichmentStatus(job: EnrichmentJob) {
  return {
    id: job.id,
    saveId: job.saveId,
    status: job.status,
    attempts: job.attempts,
    ...(job.lastError ? { lastError: job.lastError } : {}),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

async function processPendingEnrichmentJobs(database: DatabaseClient): Promise<void> {
  const { db } = database

  for (let index = 0; index < 5; index += 1) {
    const job = db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.status, 'pending'))
      .orderBy(desc(enrichmentJobs.createdAt))
      .get()
    if (!job) {
      return
    }

    const runningAt = new Date().toISOString()
    db.update(enrichmentJobs)
      .set({
        status: 'running',
        attempts: job.attempts + 1,
        lastError: null,
        updatedAt: runningAt,
      })
      .where(eq(enrichmentJobs.id, job.id))
      .run()

    try {
      const save = db.select().from(saves).where(eq(saves.id, job.saveId)).get()
      if (!save) {
        throw new Error('Save no longer exists.')
      }

      const result = await enrichSave(save)

      // Local hashed embedding — no cloud LLM (MARK-3 web fallback until CoreML/transformers lands).
      const vector = hashEmbed(result.extractedText || save.title)

      const existingTags = parseStringArray(save.tagsJson)
      const neighborTags = boostTagsFromNeighbor(db, save.userId, save.id, vector)
      const mergedTags = clampTagCount(unique([...existingTags, ...result.keywords, ...neighborTags]), save)

      const summary =
        save.summary.trim().length < SHORT_SUMMARY_MAX_LENGTH && result.extractedText
          ? extractiveSummary(result.extractedText) || save.summary
          : save.summary

      db.update(saves)
        .set({
          summary,
          tagsJson: JSON.stringify(mergedTags),
          extractedText: result.extractedText || save.extractedText,
          keywordsJson: JSON.stringify(result.keywords),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(saves.id, save.id))
        .run()

      upsertEmbedding(db, save.id, 'warren-hash-v1', vector)

      db.update(enrichmentJobs)
        .set({
          status: 'done',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(enrichmentJobs.id, job.id))
        .run()
    } catch (error) {
      db.update(enrichmentJobs)
        .set({
          status: 'failed',
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown enrichment error.',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(enrichmentJobs.id, job.id))
        .run()
    }
  }
}

async function enrichSave(save: Save): Promise<{ extractedText: string; keywords: string[] }> {
  const parts = [save.title, save.summary, save.note, save.extractedText].filter((part): part is string => Boolean(part))

  if (save.type === 'link' && save.url?.startsWith('http')) {
    const html = await fetchText(save.url)
    parts.push(extractHtmlText(html))
  }

  const extractedText = parts.join('\n\n').slice(0, 200_000)
  return {
    extractedText,
    keywords: topKeywords(extractedText, 5),
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Warren API enrichment stub',
    },
    signal: AbortSignal.timeout(2500),
  })
  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}.`)
  }
  return (await response.text()).slice(0, 200_000)
}

function extractHtmlText(html: string): string {
  const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const description = matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return [title, description, body].filter(Boolean).map(decodeHtmlEntities).join('\n\n')
}

function matchFirst(value: string, pattern: RegExp): string {
  return pattern.exec(value)?.[1]?.trim() ?? ''
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

const keywordStopWords = new Set([
  'and',
  'are',
  'but',
  'for',
  'from',
  'has',
  'have',
  'into',
  'not',
  'that',
  'the',
  'this',
  'with',
  'you',
  'your',
])

function topKeywords(text: string, limit: number): string[] {
  const counts = new Map<string, number>()
  for (const word of text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? []) {
    if (keywordStopWords.has(word)) {
      continue
    }
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word]) => word)
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/** Deterministic local embedding (no cloud). Swap for transformers.js / CoreML later. */
function hashEmbed(text: string, dims = 384): number[] {
  const vector = new Array<number>(dims).fill(0)
  const tokens = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? ['empty']
  for (const token of tokens) {
    const digest = createHash('sha256').update(token).digest()
    for (let i = 0; i < dims; i += 1) {
      const byte = digest[i % digest.length]
      vector[i] += ((byte / 255) * 2 - 1) / Math.sqrt(tokens.length)
    }
  }
  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm) || 1
  return vector.map((value) => value / norm)
}

function upsertEmbedding(
  db: DatabaseClient['db'],
  saveId: string,
  model: string,
  vector: number[],
): void {
  const now = new Date().toISOString()
  db.insert(embeddings)
    .values({
      saveId,
      model,
      dims: vector.length,
      vectorJson: JSON.stringify(vector),
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: embeddings.saveId,
      set: {
        model,
        dims: vector.length,
        vectorJson: JSON.stringify(vector),
        createdAt: now,
      },
    })
    .run()
}

function getSaveForUser(db: DatabaseClient['db'], userId: string, id: string): Save | undefined {
  return db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, userId), eq(saves.id, id)))
    .get()
}

function loadSurfacingState(db: DatabaseClient['db'], userId: string): SurfacingState {
  const row = db
    .select()
    .from(surfacingState)
    .where(eq(surfacingState.userId, userId))
    .get()
  if (!row) {
    return defaultSurfacingState()
  }

  try {
    const parsed = surfacingStateSchema.safeParse(JSON.parse(row.stateJson))
    return parsed.success ? parsed.data : defaultSurfacingState()
  } catch {
    return defaultSurfacingState()
  }
}

function saveSurfacingState(db: DatabaseClient['db'], userId: string, state: SurfacingState): void {
  db.insert(surfacingState)
    .values({
      userId,
      stateJson: JSON.stringify(state),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: surfacingState.userId,
      set: {
        stateJson: JSON.stringify(state),
        updatedAt: new Date().toISOString(),
      },
    })
    .run()
}

function parseLimit(raw: string | undefined, fallback = 50, max = 100): number {
  const parsed = raw ? Number.parseInt(raw, 10) : fallback
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.min(Math.max(parsed, 1), max)
}

function mintSaveId(): string {
  return `sav_${randomUUID()}`
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed')
}

/** Cosine similarity between two equal-length vectors. Returns 0 for zero-norm inputs. */
function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

interface EmbeddedSaveRow {
  save: Save
  embedding: { vectorJson: string; dims: number }
}

/** Greedy single-link clustering: seed a cluster with the first unclustered item and
 * absorb every remaining item whose similarity to that seed exceeds `threshold`. */
function greedyClusterBySimilarity(rows: EmbeddedSaveRow[], threshold: number): EmbeddedSaveRow[][] {
  const vectors = rows.map((row) => JSON.parse(row.embedding.vectorJson) as number[])
  const used = new Array<boolean>(rows.length).fill(false)
  const clusters: EmbeddedSaveRow[][] = []

  for (let i = 0; i < rows.length; i += 1) {
    if (used[i]) continue
    const cluster = [rows[i]]
    used[i] = true
    for (let j = i + 1; j < rows.length; j += 1) {
      if (used[j] || rows[i].embedding.dims !== rows[j].embedding.dims) continue
      if (cosineSimilarity(vectors[i], vectors[j]) > threshold) {
        cluster.push(rows[j])
        used[j] = true
      }
    }
    if (cluster.length >= 2) clusters.push(cluster)
  }

  return clusters
}

function suggestConstellationName(members: Save[]): string {
  const counts = new Map<string, number>()
  for (const member of members) {
    for (const tag of parseStringArray(member.tagsJson)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const [topTag, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (topTag && (topCount ?? 0) > 1) {
    return `Similar: ${topTag}`
  }
  return `Similar to "${members[0]?.title ?? 'a save'}"`.slice(0, 120)
}

/** Nearest-neighbor tag boost: borrow tags from the most similar other save (MARK-3). */
function boostTagsFromNeighbor(
  db: DatabaseClient['db'],
  userId: string,
  saveId: string,
  vector: number[],
): string[] {
  const rows = db
    .select({ save: saves, embedding: embeddings })
    .from(embeddings)
    .innerJoin(saves, eq(embeddings.saveId, saves.id))
    .where(and(eq(saves.userId, userId), ne(saves.id, saveId)))
    .all()

  let best: { save: Save; similarity: number } | undefined
  for (const row of rows) {
    if (row.embedding.dims !== vector.length) continue
    const candidate = JSON.parse(row.embedding.vectorJson) as number[]
    const similarity = cosineSimilarity(vector, candidate)
    if (!best || similarity > best.similarity) {
      best = { save: row.save, similarity }
    }
  }

  const NEIGHBOR_TAG_THRESHOLD = 0.5
  if (!best || best.similarity < NEIGHBOR_TAG_THRESHOLD) return []
  return parseStringArray(best.save.tagsJson)
}

const MIN_SAVE_TAGS = 2
const MAX_SAVE_TAGS = 5

/** Ensure every enriched save keeps 2–5 tags (MARK-3 NN tag suggest, min/max clamp). */
function clampTagCount(tags: string[], save: Pick<Save, 'platform' | 'type'>): string[] {
  let result = tags
  if (result.length < MIN_SAVE_TAGS) {
    result = unique([...result, save.platform, save.type])
  }
  return result.slice(0, MAX_SAVE_TAGS)
}

const SHORT_SUMMARY_MAX_LENGTH = 20

/** First 1–2 sentences (or ~220 chars) of extracted text — zero cloud LLM (MARK-3). */
function extractiveSummary(text: string, maxChars = 220): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''

  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? [cleaned]
  let summary = ''
  for (const sentence of sentences.slice(0, 2)) {
    const candidate = `${summary}${sentence}`.trim()
    if (summary && candidate.length > maxChars) break
    summary = candidate
    if (summary.length >= maxChars) break
  }

  if (!summary) summary = cleaned
  return summary.length > maxChars ? `${summary.slice(0, maxChars).trim()}…` : summary
}

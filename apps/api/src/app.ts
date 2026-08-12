import { randomUUID } from 'node:crypto'

import { and, desc, eq, lt, type SQL } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'

import { createToken, hashPassword, hashToken, tokenExpiry, verifyPassword } from './auth.js'
import { createDatabase, type DatabaseClient } from './db.js'
import { saves, surfacingState, tokens, users, type Save, type User } from './schema.js'
import {
  batchSavesSchema,
  createSaveSchema,
  loginSchema,
  patchSaveSchema,
  registerSchema,
  surfacingEventSchema,
  surfacingStateSchema,
  type CreateSaveInput,
  type PatchSaveInput,
  type SurfacingState,
} from './validation.js'

const allowedOrigins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173'])

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
}

export function createApp(options: CreateAppOptions = {}): Hono<AppEnv> {
  const database = options.database ?? createDatabase()
  const { db } = database
  const app = new Hono<AppEnv>()

  app.use(
    '*',
    cors({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
    if (!match) {
      throw new HTTPException(401, { message: 'Bearer token required.' })
    }

    const tokenHash = hashToken(match[1])
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
      db.insert(users).values(user).run()
      db.insert(tokens)
        .values({
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: tokenExpiry(),
          createdAt: now,
        })
        .run()
    } catch (error) {
      if (isUniqueConstraint(error)) {
        throw new HTTPException(409, { message: 'Email is already registered.' })
      }
      throw error
    }

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

    return c.json({ user: toPublicUser(user), token })
  })

  app.post('/api/v1/auth/logout', requireAuth, (c) => {
    db.delete(tokens).where(eq(tokens.tokenHash, c.get('tokenHash'))).run()
    return c.body(null, 204)
  })

  app.get('/api/v1/auth/me', requireAuth, (c) => c.json(c.get('user')))

  app.get('/api/v1/saves', requireAuth, (c) => {
    const user = c.get('user')
    const limit = parseLimit(c.req.query('limit'))
    const cursor = c.req.query('cursor')
    const archived = c.req.query('archived') ?? 'false'
    const filters: SQL[] = [eq(saves.userId, user.id)]

    if (archived !== 'all') {
      filters.push(eq(saves.archived, archived === 'true' ? 1 : 0))
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
    const row = buildSaveInsert(c.get('user').id, input)

    db.insert(saves).values(row).run()

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
          tx.insert(saves).values(buildSaveInsert(user.id, { ...item, id })).run()
          created += 1
        }
        ids.push(id)
      }

      return { created, updated, ids }
    })

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

    return c.body(null, 204)
  })

  app.get('/api/v1/surfacing', requireAuth, (c) => {
    return c.json(loadSurfacingState(db, c.get('user').id))
  })

  app.put('/api/v1/surfacing', requireAuth, async (c) => {
    const state = await readJson(c, surfacingStateSchema)
    saveSurfacingState(db, c.get('user').id, state)
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

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
  }
}

function buildSaveInsert(userId: string, input: CreateSaveInput): Save {
  const now = new Date().toISOString()
  return {
    id: input.id ?? mintSaveId(),
    userId,
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
    ...(row.extractedText ? { extractedText: row.extractedText } : {}),
    ...(row.keywordsJson ? { keywords: parseStringArray(row.keywordsJson) } : {}),
  }
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

  const parsed = surfacingStateSchema.safeParse(JSON.parse(row.stateJson))
  return parsed.success ? parsed.data : defaultSurfacingState()
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

function parseLimit(raw: string | undefined): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 50
  if (Number.isNaN(parsed)) {
    return 50
  }
  return Math.min(Math.max(parsed, 1), 100)
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

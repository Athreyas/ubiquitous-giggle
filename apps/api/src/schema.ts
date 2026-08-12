import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: text('created_at').notNull(),
})

export const tokens = sqliteTable('tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})

export const spaces = sqliteTable('spaces', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
})

export const saves = sqliteTable('saves', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  spaceId: text('space_id').references(() => spaces.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  url: text('url'),
  summary: text('summary').notNull(),
  note: text('note'),
  tagsJson: text('tags_json').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  platform: text('platform').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archived: integer('archived').notNull().default(0),
  extractedText: text('extracted_text'),
  keywordsJson: text('keywords_json'),
})

export const embeddings = sqliteTable('embeddings', {
  saveId: text('save_id')
    .primaryKey()
    .references(() => saves.id, { onDelete: 'cascade' }),
  model: text('model').notNull(),
  dims: integer('dims').notNull(),
  vectorJson: text('vector_json').notNull(),
  createdAt: text('created_at').notNull(),
})

export const enrichmentJobs = sqliteTable('enrichment_jobs', {
  id: text('id').primaryKey(),
  saveId: text('save_id')
    .notNull()
    .references(() => saves.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const surfacingState = sqliteTable('surfacing_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stateJson: text('state_json').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type User = typeof users.$inferSelect
export type Space = typeof spaces.$inferSelect
export type Save = typeof saves.$inferSelect
export type EnrichmentJob = typeof enrichmentJobs.$inferSelect
export type SurfacingStateRow = typeof surfacingState.$inferSelect

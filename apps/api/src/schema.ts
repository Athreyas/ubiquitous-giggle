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

export const saves = sqliteTable('saves', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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

export const surfacingState = sqliteTable('surfacing_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stateJson: text('state_json').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type User = typeof users.$inferSelect
export type Save = typeof saves.$inferSelect
export type SurfacingStateRow = typeof surfacingState.$inferSelect

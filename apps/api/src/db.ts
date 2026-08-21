import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema.js'

export type WarrenDatabase = BetterSQLite3Database<typeof schema>

export interface DatabaseClient {
  db: WarrenDatabase
  sqlite: Database.Database
  close: () => void
}

export function defaultDatabasePath(): string {
  return resolve(process.cwd(), '.data/warren.sqlite')
}

export function createDatabase(dbPath = process.env.WARREN_DB_FILE ?? defaultDatabasePath()): DatabaseClient {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  migrateDatabase(sqlite)

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    close: () => sqlite.close(),
  }
}

export function migrateDatabase(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text,
      created_at text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token_hash text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at text NOT NULL,
      created_at text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      position integer NOT NULL,
      created_at text NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS spaces_user_slug_idx
      ON spaces(user_id, slug);

    CREATE TABLE IF NOT EXISTS saves (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id text REFERENCES spaces(id) ON DELETE SET NULL,
      type text NOT NULL,
      title text NOT NULL,
      url text,
      summary text NOT NULL,
      note text,
      tags_json text NOT NULL,
      thumbnail_url text,
      platform text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      archived integer NOT NULL DEFAULT 0,
      extracted_text text,
      keywords_json text
    );

    CREATE INDEX IF NOT EXISTS saves_user_created_idx
      ON saves(user_id, archived, created_at DESC);

    CREATE TABLE IF NOT EXISTS constellations (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id text REFERENCES spaces(id) ON DELETE SET NULL,
      name text NOT NULL,
      pinned integer NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
      created_at text NOT NULL,
      updated_at text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS constellations_user_updated_idx
      ON constellations(user_id, pinned DESC, updated_at DESC);

    CREATE TABLE IF NOT EXISTS constellation_members (
      constellation_id text NOT NULL REFERENCES constellations(id) ON DELETE CASCADE,
      save_id text NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      position integer NOT NULL,
      created_at text NOT NULL,
      PRIMARY KEY (constellation_id, save_id)
    );

    CREATE INDEX IF NOT EXISTS constellation_members_position_idx
      ON constellation_members(constellation_id, position);

    CREATE TABLE IF NOT EXISTS shares (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type text NOT NULL CHECK (resource_type IN ('save', 'constellation')),
      resource_id text NOT NULL,
      permission text NOT NULL CHECK (permission IN ('viewer', 'collaborator')),
      invite_token text NOT NULL UNIQUE,
      created_at text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS shares_owner_resource_idx
      ON shares(user_id, resource_type, resource_id);

    CREATE TABLE IF NOT EXISTS save_links (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_save_id text NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      to_save_id text NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      created_at text NOT NULL,
      UNIQUE (from_save_id, to_save_id)
    );

    CREATE INDEX IF NOT EXISTS save_links_user_from_idx
      ON save_links(user_id, from_save_id, created_at);

    CREATE TABLE IF NOT EXISTS embeddings (
      save_id text PRIMARY KEY NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      model text NOT NULL,
      dims integer NOT NULL,
      vector_json text NOT NULL,
      created_at text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrichment_jobs (
      id text PRIMARY KEY NOT NULL,
      save_id text NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      status text NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed')),
      attempts integer NOT NULL DEFAULT 0,
      last_error text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS enrichment_jobs_save_idx
      ON enrichment_jobs(save_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS enrichment_jobs_status_idx
      ON enrichment_jobs(status, created_at);

    CREATE TABLE IF NOT EXISTS surfacing_state (
      user_id text PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state_json text NOT NULL,
      updated_at text NOT NULL
    );
  `)

  ensureColumn(sqlite, 'saves', 'space_id', 'text REFERENCES spaces(id) ON DELETE SET NULL')
}

function ensureColumn(sqlite: Database.Database, tableName: string, columnName: string, definition: string): void {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  if (columns.some((column) => column.name === columnName)) {
    return
  }

  sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
}

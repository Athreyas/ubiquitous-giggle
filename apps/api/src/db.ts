import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema.js'

export type DaymarkDatabase = BetterSQLite3Database<typeof schema>

export interface DatabaseClient {
  db: DaymarkDatabase
  sqlite: Database.Database
  close: () => void
}

export function defaultDatabasePath(): string {
  return resolve(process.cwd(), '.data/daymark.sqlite')
}

export function createDatabase(dbPath = process.env.DAYMARK_DB_FILE ?? defaultDatabasePath()): DatabaseClient {
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

    CREATE TABLE IF NOT EXISTS saves (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS surfacing_state (
      user_id text PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state_json text NOT NULL,
      updated_at text NOT NULL
    );
  `)
}

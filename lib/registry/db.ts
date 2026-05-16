import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'fs'
import path from 'path'
import { CONFIG_DIR } from '@/lib/config'
import * as schema from './schema'

let _db: BetterSQLite3Database<typeof schema> | null = null

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db
  fs.mkdirSync(CONFIG_DIR(), { recursive: true })
  const sqlite = new Database(path.join(CONFIG_DIR(), 'registry.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('busy_timeout = 5000')
  sqlite.pragma('foreign_keys = ON')
  _db = drizzle(sqlite, { schema })
  migrate(_db, { migrationsFolder: path.join(process.cwd(), 'lib/registry/migrations') })
  return _db
}

export function resetDbForTests(): void {
  _db = null
}

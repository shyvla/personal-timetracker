import { join } from 'path'
import { app } from 'electron'
import type BetterSqlite3 from 'better-sqlite3'
import { DEFAULT_PREFERENCES, type Preferences } from '../shared/types'

// better-sqlite3 is a native module. We require it lazily so that a failure to
// load (e.g. the native binary hasn't been rebuilt for Electron's ABI yet) does
// not crash app startup — it surfaces only when a DB operation is attempted.
let db: BetterSqlite3.Database | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS preferences (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  day       TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  end_min   INTEGER NOT NULL,
  doing     TEXT NOT NULL DEFAULT '',
  position  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (entry_id, tag_id)
);
`

export function getDb(): BetterSqlite3.Database {
  if (db) return db

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3') as typeof BetterSqlite3
  const dbPath = join(app.getPath('userData'), 'timetracker.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  seedDefaults(db)
  return db
}

function seedDefaults(database: BetterSqlite3.Database): void {
  const insert = database.prepare(
    'INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)'
  )
  insert.run('increment', String(DEFAULT_PREFERENCES.increment))
  insert.run('display', DEFAULT_PREFERENCES.display)
}

export function getPreferences(): Preferences {
  const rows = getDb().prepare('SELECT key, value FROM preferences').all() as {
    key: string
    value: string
  }[]
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const rawIncrement = map.get('increment') ?? String(DEFAULT_PREFERENCES.increment)
  const increment =
    rawIncrement === 'custom' ? 'custom' : (Number(rawIncrement) as 15 | 20 | 30)

  const display =
    map.get('display') === 'military' ? 'military' : DEFAULT_PREFERENCES.display

  return { increment, display }
}

export function setPreferences(prefs: Partial<Preferences>): Preferences {
  const upsert = getDb().prepare(
    `INSERT INTO preferences (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )
  if (prefs.increment !== undefined) upsert.run('increment', String(prefs.increment))
  if (prefs.display !== undefined) upsert.run('display', prefs.display)
  return getPreferences()
}

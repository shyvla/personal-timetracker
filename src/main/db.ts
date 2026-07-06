import { join } from 'path'
import { app } from 'electron'
import type BetterSqlite3 from 'better-sqlite3'
import { DEFAULT_PREFERENCES, type Preferences, type Entry, type Tag } from '../shared/types'

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

// ---- Time entries ----
//
// Blocks are continuous: entry N's start equals entry N-1's end. Only the first
// entry of a day carries a user-chosen start; every later entry supplies just an
// end. We still persist start_min explicitly (denormalized) and re-chain later
// entries — preserving their durations — whenever an earlier block changes.

const DAY_END = 1440 // minutes in a day (midnight = end of day)

interface EntryRow {
  id: number
  day: string
  start_min: number
  end_min: number
  doing: string
  position: number
}

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    day: r.day,
    startMin: r.start_min,
    endMin: r.end_min,
    doing: r.doing,
    position: r.position,
    tags: []
  }
}

function dayRows(database: BetterSqlite3.Database, day: string): EntryRow[] {
  return database
    .prepare('SELECT * FROM entries WHERE day = ? ORDER BY position')
    .all(day) as EntryRow[]
}

function validateRange(start: number, end: number): void {
  if (start < 0 || end > DAY_END) throw new Error('Time must fall within the day')
  if (end <= start) throw new Error('End time must be after the start time')
}

export function listEntries(day: string): Entry[] {
  const database = getDb()
  const tagStmt = database.prepare(
    `SELECT t.id, t.name, t.color
       FROM entry_tags et
       JOIN tags t ON t.id = et.tag_id
      WHERE et.entry_id = ?
      ORDER BY et.position`
  )
  return dayRows(database, day).map((r) => {
    const entry = rowToEntry(r)
    entry.tags = tagStmt.all(r.id) as Tag[]
    return entry
  })
}

/** Append a new block. The first block of a day needs a start; others chain. */
export function createEntry(day: string, endMin: number, startMin?: number): Entry[] {
  const database = getDb()
  const rows = dayRows(database, day)
  const position = rows.length
  const start = position === 0 ? startMin : rows[rows.length - 1].end_min
  if (start === undefined) throw new Error('The first block of the day needs a start time')
  validateRange(start, endMin)
  database
    .prepare(
      'INSERT INTO entries (day, start_min, end_min, doing, position) VALUES (?, ?, ?, ?, ?)'
    )
    .run(day, start, endMin, '', position)
  return listEntries(day)
}

/**
 * Change a block's time. For the first block, `startMin` is honored; for later
 * blocks the start is forced to the previous block's end. Blocks after the edited
 * one are shifted to stay continuous, keeping their original durations.
 */
export function updateEntryTime(
  id: number,
  patch: { startMin?: number; endMin?: number }
): Entry[] {
  const database = getDb()
  const entry = database.prepare('SELECT * FROM entries WHERE id = ?').get(id) as
    | EntryRow
    | undefined
  if (!entry) throw new Error('Entry not found')

  const rows = dayRows(database, entry.day)
  const idx = rows.findIndex((r) => r.id === id)
  const newStart = idx === 0 ? patch.startMin ?? entry.start_min : rows[idx - 1].end_min
  const newEnd = patch.endMin ?? entry.end_min
  validateRange(newStart, newEnd)

  const update = database.prepare(
    'UPDATE entries SET start_min = ?, end_min = ? WHERE id = ?'
  )
  const tx = database.transaction(() => {
    update.run(newStart, newEnd, id)
    let prevEnd = newEnd
    for (let j = idx + 1; j < rows.length; j++) {
      const dur = rows[j].end_min - rows[j].start_min
      const end = prevEnd + dur
      if (end > DAY_END) throw new Error('Not enough time left in the day for later blocks')
      update.run(prevEnd, end, rows[j].id)
      prevEnd = end
    }
  })
  tx()
  return listEntries(entry.day)
}

/** Update the free-text "Doing" description for a block. */
export function updateEntryDoing(id: number, doing: string): Entry[] {
  const database = getDb()
  const row = database.prepare('SELECT day FROM entries WHERE id = ?').get(id) as
    | { day: string }
    | undefined
  if (!row) throw new Error('Entry not found')
  database.prepare('UPDATE entries SET doing = ? WHERE id = ?').run(doing, id)
  return listEntries(row.day)
}

/** Remove a block, then renumber positions and re-chain the remaining blocks. */
export function deleteEntry(id: number): Entry[] {
  const database = getDb()
  const entry = database.prepare('SELECT day FROM entries WHERE id = ?').get(id) as
    | { day: string }
    | undefined
  if (!entry) return []
  const { day } = entry

  const update = database.prepare(
    'UPDATE entries SET position = ?, start_min = ?, end_min = ? WHERE id = ?'
  )
  const tx = database.transaction(() => {
    database.prepare('DELETE FROM entries WHERE id = ?').run(id)
    const rows = dayRows(database, day)
    let prevEnd: number | null = null
    rows.forEach((r, i) => {
      const dur = r.end_min - r.start_min
      const start = i === 0 || prevEnd === null ? r.start_min : prevEnd
      const end = start + dur
      update.run(i, start, end, r.id)
      prevEnd = end
    })
  })
  tx()
  return listEntries(day)
}

// ---- Tags ----

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const to = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** A pleasant, light, randomly-hued color for a new tag. */
function randomColor(): string {
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 20) // 60–80%
  const l = 72 + Math.floor(Math.random() * 8) // 72–80%
  return hslToHex(h, s, l)
}

export function listTags(): Tag[] {
  return getDb()
    .prepare('SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE')
    .all() as Tag[]
}

/** Create a tag (random color if unspecified), or return the existing one by name. */
export function createTag(name: string, color?: string): Tag {
  const database = getDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Tag name cannot be empty')
  const existing = database
    .prepare('SELECT id, name, color FROM tags WHERE name = ? COLLATE NOCASE')
    .get(trimmed) as Tag | undefined
  if (existing) return existing
  const chosen = color ?? randomColor()
  const info = database
    .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
    .run(trimmed, chosen)
  return { id: Number(info.lastInsertRowid), name: trimmed, color: chosen }
}

/** Recolor a tag; the change applies everywhere the tag is used. */
export function setTagColor(id: number, color: string): Tag[] {
  getDb().prepare('UPDATE tags SET color = ? WHERE id = ?').run(color, id)
  return listTags()
}

/** Replace an entry's tags with the given ordered list (left-to-right). */
export function setEntryTags(entryId: number, tagIds: number[]): Entry[] {
  const database = getDb()
  const row = database.prepare('SELECT day FROM entries WHERE id = ?').get(entryId) as
    | { day: string }
    | undefined
  if (!row) throw new Error('Entry not found')

  const del = database.prepare('DELETE FROM entry_tags WHERE entry_id = ?')
  const ins = database.prepare(
    'INSERT INTO entry_tags (entry_id, tag_id, position) VALUES (?, ?, ?)'
  )
  const tx = database.transaction(() => {
    del.run(entryId)
    tagIds.forEach((tagId, i) => ins.run(entryId, tagId, i))
  })
  tx()
  return listEntries(row.day)
}

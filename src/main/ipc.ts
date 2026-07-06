import { ipcMain } from 'electron'
import {
  getDb,
  getPreferences,
  setPreferences,
  listEntries,
  createEntry,
  updateEntryTime,
  deleteEntry
} from './db'
import type { Preferences, DbStatus, Entry } from '../shared/types'

/** Register all IPC handlers. Called once after app is ready. */
export function registerIpc(): void {
  ipcMain.handle('db:status', (): DbStatus => {
    try {
      getDb()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('prefs:get', (): Preferences => getPreferences())

  ipcMain.handle('prefs:set', (_e, prefs: Partial<Preferences>): Preferences =>
    setPreferences(prefs)
  )

  ipcMain.handle('entries:list', (_e, day: string): Entry[] => listEntries(day))

  ipcMain.handle(
    'entries:create',
    (_e, day: string, endMin: number, startMin?: number): Entry[] =>
      createEntry(day, endMin, startMin)
  )

  ipcMain.handle(
    'entries:updateTime',
    (_e, id: number, patch: { startMin?: number; endMin?: number }): Entry[] =>
      updateEntryTime(id, patch)
  )

  ipcMain.handle('entries:delete', (_e, id: number): Entry[] => deleteEntry(id))
}

import { ipcMain } from 'electron'
import { getDb, getPreferences, setPreferences } from './db'
import type { Preferences, DbStatus } from '../shared/types'

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
}

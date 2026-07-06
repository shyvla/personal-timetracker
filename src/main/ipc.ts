import { ipcMain } from 'electron'
import {
  getDb,
  getPreferences,
  setPreferences,
  listEntries,
  createEntry,
  updateEntryTime,
  updateEntryDoing,
  deleteEntry,
  listTags,
  createTag,
  setTagColor,
  setEntryTags
} from './db'
import type { Preferences, DbStatus, Entry, Tag } from '../shared/types'

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

  ipcMain.handle('entries:updateDoing', (_e, id: number, doing: string): Entry[] =>
    updateEntryDoing(id, doing)
  )

  ipcMain.handle('entries:delete', (_e, id: number): Entry[] => deleteEntry(id))

  ipcMain.handle('tags:list', (): Tag[] => listTags())

  ipcMain.handle('tags:create', (_e, name: string, color?: string): Tag =>
    createTag(name, color)
  )

  ipcMain.handle('tags:setColor', (_e, id: number, color: string): Tag[] =>
    setTagColor(id, color)
  )

  ipcMain.handle('entries:setTags', (_e, entryId: number, tagIds: number[]): Entry[] =>
    setEntryTags(entryId, tagIds)
  )
}

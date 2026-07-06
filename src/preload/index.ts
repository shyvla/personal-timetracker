import { contextBridge, ipcRenderer } from 'electron'
import type {
  Preferences,
  DbStatus,
  Entry,
  Tag,
  ExportOptions,
  ExportResult
} from '../shared/types'

const api = {
  dbStatus: (): Promise<DbStatus> => ipcRenderer.invoke('db:status'),
  getPreferences: (): Promise<Preferences> => ipcRenderer.invoke('prefs:get'),
  setPreferences: (prefs: Partial<Preferences>): Promise<Preferences> =>
    ipcRenderer.invoke('prefs:set', prefs),
  listEntries: (day: string): Promise<Entry[]> => ipcRenderer.invoke('entries:list', day),
  createEntry: (day: string, endMin: number, startMin?: number): Promise<Entry[]> =>
    ipcRenderer.invoke('entries:create', day, endMin, startMin),
  updateEntryTime: (
    id: number,
    patch: { startMin?: number; endMin?: number }
  ): Promise<Entry[]> => ipcRenderer.invoke('entries:updateTime', id, patch),
  updateEntryDoing: (id: number, doing: string): Promise<Entry[]> =>
    ipcRenderer.invoke('entries:updateDoing', id, doing),
  deleteEntry: (id: number): Promise<Entry[]> => ipcRenderer.invoke('entries:delete', id),
  listTags: (): Promise<Tag[]> => ipcRenderer.invoke('tags:list'),
  createTag: (name: string, color?: string): Promise<Tag> =>
    ipcRenderer.invoke('tags:create', name, color),
  setTagColor: (id: number, color: string): Promise<Tag[]> =>
    ipcRenderer.invoke('tags:setColor', id, color),
  setEntryTags: (entryId: number, tagIds: number[]): Promise<Entry[]> =>
    ipcRenderer.invoke('entries:setTags', entryId, tagIds),
  runExport: (opts: ExportOptions): Promise<ExportResult> =>
    ipcRenderer.invoke('export:run', opts)
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore — fallback when context isolation is disabled
  window.api = api
}

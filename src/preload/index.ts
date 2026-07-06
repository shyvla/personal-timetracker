import { contextBridge, ipcRenderer } from 'electron'
import type { Preferences, DbStatus } from '../shared/types'

const api = {
  dbStatus: (): Promise<DbStatus> => ipcRenderer.invoke('db:status'),
  getPreferences: (): Promise<Preferences> => ipcRenderer.invoke('prefs:get'),
  setPreferences: (prefs: Partial<Preferences>): Promise<Preferences> =>
    ipcRenderer.invoke('prefs:set', prefs)
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

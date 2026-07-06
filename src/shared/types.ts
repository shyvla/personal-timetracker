// Domain types shared between the main process, preload, and renderer.

/** Time increment preference. Custom = free manual minute-precision entry. */
export type TimeIncrement = 15 | 20 | 30 | 'custom'

/** How time ranges are displayed. */
export type TimeDisplay = 'ampm' | 'military'

export interface Preferences {
  increment: TimeIncrement
  display: TimeDisplay
}

export interface Tag {
  id: number
  name: string
  /** Hex color, e.g. "#A1B2C3". */
  color: string
}

export interface Entry {
  id: number
  /** Local calendar day, "YYYY-MM-DD". */
  day: string
  /** Minutes from local midnight (0–1439). */
  startMin: number
  /** Minutes from local midnight (1–1440). */
  endMin: number
  doing: string
  /** Order within the day. */
  position: number
  /** Tags in left-to-right selection order. */
  tags: Tag[]
}

export const DEFAULT_PREFERENCES: Preferences = {
  increment: 15,
  display: 'ampm'
}

/** Result of the DB health check IPC. */
export interface DbStatus {
  ok: boolean
  error?: string
}

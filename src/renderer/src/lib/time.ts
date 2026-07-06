import type { TimeIncrement, TimeDisplay } from '../../../shared/types'

/** Minutes in a day; also the maximum selectable end-of-day time (midnight). */
export const DAY_MINUTES = 1440

/** Minute step for an increment preference (custom = minute precision). */
export function incrementStep(inc: TimeIncrement): number {
  return inc === 'custom' ? 1 : inc
}

/** Format minutes-from-midnight per the display preference. */
export function formatMinutes(min: number, display: TimeDisplay): string {
  const h24 = Math.floor(min / 60)
  const mm = String(min % 60).padStart(2, '0')
  if (display === 'military') return `${String(h24).padStart(2, '0')}:${mm}`
  const period = h24 < 12 || h24 === 24 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

/** "9:00 AM – 10:00 AM" / "09:00 – 10:00". */
export function formatRange(start: number, end: number, display: TimeDisplay): string {
  return `${formatMinutes(start, display)} – ${formatMinutes(end, display)}`
}

/** Selectable start times on the increment grid (first block only). */
export function startOptions(step: number): number[] {
  const out: number[] = []
  for (let t = 0; t <= DAY_MINUTES - step; t += step) out.push(t)
  return out
}

/**
 * Selectable end times: start + n·step. Anchoring to `start` (rather than the
 * absolute grid) keeps block lengths a clean multiple of the increment even when
 * an earlier edit left `start` off the grid.
 */
export function endOptions(start: number, step: number): number[] {
  const out: number[] = []
  for (let t = start + step; t <= DAY_MINUTES; t += step) out.push(t)
  return out
}

/** Minutes → "HH:MM" (24h) for <input type="time">. */
export function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** "HH:MM" (24h) → minutes, or null if malformed / out of range. */
export function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!m) return null
  const h = Number(m[1])
  const mins = Number(m[2])
  if (h > 23 || mins > 59) return null
  return h * 60 + mins
}

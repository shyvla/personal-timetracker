import type { Entry, TimeDisplay } from '../shared/types'

/** Format minutes-from-midnight for export (mirrors the renderer's formatter). */
function formatMinutes(min: number, display: TimeDisplay): string {
  const h24 = Math.floor(min / 60)
  const mm = String(min % 60).padStart(2, '0')
  if (display === 'military') return `${String(h24).padStart(2, '0')}:${mm}`
  const period = h24 < 12 || h24 === 24 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

export function toJSON(entries: Entry[], display: TimeDisplay): string {
  const rows = entries.map((e) => ({
    date: e.day,
    start: formatMinutes(e.startMin, display),
    end: formatMinutes(e.endMin, display),
    startMin: e.startMin,
    endMin: e.endMin,
    doing: e.doing,
    tags: e.tags.map((t) => ({ name: t.name, color: t.color }))
  }))
  return JSON.stringify(rows, null, 2)
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCSV(entries: Entry[], display: TimeDisplay): string {
  const header = ['Date', 'Start', 'End', 'Doing', 'Tags']
  const lines = entries.map((e) =>
    [
      e.day,
      formatMinutes(e.startMin, display),
      formatMinutes(e.endMin, display),
      e.doing,
      e.tags.map((t) => t.name).join('; ')
    ]
      .map((v) => csvCell(String(v)))
      .join(',')
  )
  return [header.join(','), ...lines].join('\r\n')
}

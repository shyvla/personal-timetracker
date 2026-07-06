import React, { useEffect, useState } from 'react'
import type { Preferences } from '../../shared/types'
import { DEFAULT_PREFERENCES } from '../../shared/types'
import './styles/App.css'

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

/** Placeholder rows so the table matches the mockup until entries are wired up. */
const SAMPLE_ROWS = [
  {
    time: '9:00 AM – 10:00 AM',
    doing: 'Leg day',
    tags: [{ name: 'Gym', color: '#c9c9c9' }]
  },
  {
    time: '11:00 AM – 12:00 PM',
    doing:
      'A banana is an elongated, edible fruit produced by large, treelike herbaceous plants. Botanically classified as a berry, it typically features a soft, sweet flesh enclosed in a thick rind.',
    tags: [
      { name: 'Bananana', color: '#d7d7d7' },
      { name: 'Gym', color: '#c9c9c9' }
    ]
  }
]

const EMPTY_ROW_COUNT = 5

export default function App(): React.JSX.Element {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await window.api.dbStatus()
        if (cancelled) return
        if (!status.ok) {
          setDbError(status.error ?? 'Database unavailable')
          return
        }
        const p = await window.api.getPreferences()
        if (!cancelled) setPrefs(p)
      } catch (err) {
        if (!cancelled) setDbError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const today = formatDate(new Date())

  return (
    <div className="app">
      <div className="titlebar">Main Page</div>

      {dbError && (
        <div className="db-banner" role="alert">
          <strong>SQLite not ready.</strong> The native module still needs to be built for
          Electron. Persistence is disabled until then. ({dbError})
        </div>
      )}

      <main className="sheet">
        <h1 className="sheet__title">TIME TRACKER</h1>
        <div className="sheet__divider" />

        <div className="sheet__toolbar">
          <button className="datepill" type="button">
            <CalendarIcon />
            <span className="datepill__date">{today}</span>
          </button>
          <button className="export-btn" type="button">
            Export
          </button>
        </div>

        <div className="table" role="table" aria-label="Time entries">
          <div className="table__head" role="row">
            <div className="th th--time" role="columnheader">
              Time
            </div>
            <div className="th th--doing" role="columnheader">
              Doing
            </div>
            <div className="th th--tag" role="columnheader">
              Tag
            </div>
          </div>

          {SAMPLE_ROWS.map((row, i) => (
            <div className="tr" role="row" key={i}>
              <div className="td td--time" role="cell">
                {row.time}
              </div>
              <div className="td td--doing" role="cell">
                {row.doing}
              </div>
              <div className="td td--tag" role="cell">
                <div className="tags">
                  {row.tags.map((t, j) => (
                    <span
                      className="tag"
                      key={j}
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {Array.from({ length: EMPTY_ROW_COUNT }).map((_, i) => (
            <div className="tr tr--empty" role="row" key={`empty-${i}`}>
              <div className="td td--time" role="cell" />
              <div className="td td--doing" role="cell" />
              <div className="td td--tag" role="cell" />
            </div>
          ))}
        </div>
      </main>

      <footer className="statusbar">
        Increment: {String(prefs.increment)}
        {typeof prefs.increment === 'number' ? ' min' : ''} · Display:{' '}
        {prefs.display === 'ampm' ? 'AM/PM' : 'Military'}
      </footer>
    </div>
  )
}

function CalendarIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

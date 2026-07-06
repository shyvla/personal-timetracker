import React, { useEffect, useState } from 'react'
import { panelStyle } from '../lib/popover'
import {
  MONTH_NAMES,
  daysInMonth,
  firstWeekday,
  isoFromParts
} from '../lib/date'
import './popover.css'
import './CalendarPopover.css'

export interface CalendarPopoverProps {
  anchor: DOMRect
  selected: string // "YYYY-MM-DD"
  today: string // "YYYY-MM-DD"
  onSelect: (iso: string) => void
  onClose: () => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarPopover(props: CalendarPopoverProps): React.JSX.Element {
  const { anchor, selected, today } = props
  const [selY, selM] = selected.split('-').map(Number)
  const [view, setView] = useState({ year: selY, month0: selM - 1 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  const [todayY, todayM] = today.split('-').map(Number)
  // Don't let users page into fully-future months (nothing selectable there).
  const atCurrentMonth = view.year === todayY && view.month0 === todayM - 1
  const isFutureMonth =
    view.year > todayY || (view.year === todayY && view.month0 > todayM - 1)

  function shiftMonth(delta: number): void {
    setView((v) => {
      const d = new Date(v.year, v.month0 + delta, 1)
      return { year: d.getFullYear(), month0: d.getMonth() }
    })
  }

  const total = daysInMonth(view.year, view.month0)
  const lead = firstWeekday(view.year, view.month0)
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1)
  ]

  return (
    <>
      <div className="popover-backdrop" onClick={props.onClose} />
      <div
        className="popover calendar-popover"
        style={panelStyle(anchor, 300)}
        role="dialog"
        aria-label="Choose a date"
      >
        <div className="cal-head">
          <button className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className="cal-title">
            {MONTH_NAMES[view.month0]} {view.year}
          </span>
          <button
            className="cal-nav"
            onClick={() => shiftMonth(1)}
            disabled={atCurrentMonth || isFutureMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="cal-grid cal-weekdays">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="cal-weekday">
              {w}
            </span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((day, i) => {
            if (day === null) return <span key={`b-${i}`} className="cal-cell cal-cell--blank" />
            const iso = isoFromParts(view.year, view.month0, day)
            const disabled = iso > today
            const isSelected = iso === selected
            const isToday = iso === today
            return (
              <button
                key={iso}
                className={`cal-cell${isSelected ? ' is-selected' : ''}${
                  isToday ? ' is-today' : ''
                }`}
                disabled={disabled}
                onClick={() => props.onSelect(iso)}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

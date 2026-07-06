import React, { useEffect, useMemo, useState } from 'react'
import type { Preferences, TimeIncrement, TimeDisplay } from '../../../shared/types'
import {
  DAY_MINUTES,
  formatMinutes,
  incrementStep,
  startOptions,
  endOptions,
  toHHMM,
  parseHHMM
} from '../lib/time'
import { panelStyle } from '../lib/popover'
import './popover.css'
import './TimePopover.css'

export interface TimePopoverProps {
  anchor: DOMRect
  /** First block of the day → the start is user-selectable. */
  isFirst: boolean
  initialStart: number
  initialEnd: number
  prefs: Preferences
  canDelete: boolean
  error: string | null
  /** startMin is undefined for non-first blocks (start is chained to prior end). */
  onSaveTime: (startMin: number | undefined, endMin: number) => void
  onDelete: () => void
  onSavePrefs: (patch: Partial<Preferences>) => void
  onClose: () => void
}

const INCREMENTS: { label: string; value: TimeIncrement }[] = [
  { label: '15 minutes', value: 15 },
  { label: '20 minutes', value: 20 },
  { label: '30 minutes', value: 30 },
  { label: 'Custom', value: 'custom' }
]

const DISPLAYS: { label: string; value: TimeDisplay }[] = [
  { label: '12-hour clock', value: 'ampm' },
  { label: '24-hour clock', value: 'military' }
]

export default function TimePopover(props: TimePopoverProps): React.JSX.Element {
  const { anchor, isFirst, prefs, canDelete, error } = props
  const step = incrementStep(prefs.increment)
  const custom = prefs.increment === 'custom'

  const [start, setStart] = useState(props.initialStart)
  const [end, setEnd] = useState(props.initialEnd)
  const [showPrefs, setShowPrefs] = useState(false)

  // When the increment changes, re-anchor the selected times onto the new grid.
  useEffect(() => {
    if (custom) return
    const snappedStart = isFirst
      ? Math.min(Math.floor(start / step) * step, DAY_MINUTES - step)
      : start
    const aligned = end > snappedStart && (end - snappedStart) % step === 0
    setStart(snappedStart)
    setEnd(aligned ? end : snappedStart + step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.increment])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  const startOpts = useMemo(() => startOptions(step), [step])
  const endOpts = useMemo(() => endOptions(start, step), [start, step])

  const valid = end > start && start >= 0 && end <= DAY_MINUTES

  function handleStartChange(next: number): void {
    setStart(next)
    if (end <= next) setEnd(Math.min(next + step, DAY_MINUTES))
  }

  return (
    <>
      <div className="popover-backdrop" onClick={props.onClose} />
      <div
        className="popover"
        style={panelStyle(anchor)}
        role="dialog"
        aria-label="Set time block"
      >
        <div className="popover__title">{isFirst ? 'Time block' : 'End time'}</div>

        {isFirst ? (
          <div className="popover__field">
            <label>Start</label>
            {custom ? (
              <input
                type="time"
                value={toHHMM(start)}
                onChange={(e) => {
                  const v = parseHHMM(e.target.value)
                  if (v !== null) handleStartChange(v)
                }}
              />
            ) : (
              <select
                value={start}
                onChange={(e) => handleStartChange(Number(e.target.value))}
              >
                {startOpts.map((t) => (
                  <option key={t} value={t}>
                    {formatMinutes(t, prefs.display)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="popover__field popover__field--readonly">
            <label>Starts at</label>
            <span>{formatMinutes(start, prefs.display)}</span>
          </div>
        )}

        <div className="popover__field">
          <label>End</label>
          {custom ? (
            <input
              type="time"
              value={toHHMM(end)}
              onChange={(e) => {
                const v = parseHHMM(e.target.value)
                if (v !== null) setEnd(v)
              }}
            />
          ) : (
            <select value={end} onChange={(e) => setEnd(Number(e.target.value))}>
              {endOpts.map((t) => (
                <option key={t} value={t}>
                  {formatMinutes(t, prefs.display)}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <div className="popover__error">{error}</div>}

        <div className="popover__actions">
          {canDelete && (
            <button className="btn btn--ghost btn--danger" onClick={props.onDelete}>
              Delete
            </button>
          )}
          <div className="popover__actions-right">
            <button className="btn btn--ghost" onClick={props.onClose}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              disabled={!valid}
              onClick={() => props.onSaveTime(isFirst ? start : undefined, end)}
            >
              Save
            </button>
          </div>
        </div>

        <button
          className="popover__prefs-toggle"
          onClick={() => setShowPrefs((v) => !v)}
          aria-expanded={showPrefs}
        >
          Time Preferences {showPrefs ? '▾' : '▸'}
        </button>

        {showPrefs && (
          <div className="popover__prefs">
            <fieldset>
              <legend>Time increments</legend>
              {INCREMENTS.map((opt) => (
                <label key={String(opt.value)} className="radio">
                  <input
                    type="radio"
                    name="increment"
                    checked={prefs.increment === opt.value}
                    onChange={() => props.onSavePrefs({ increment: opt.value })}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Display</legend>
              {DISPLAYS.map((opt) => (
                <label key={opt.value} className="radio">
                  <input
                    type="radio"
                    name="display"
                    checked={prefs.display === opt.value}
                    onChange={() => props.onSavePrefs({ display: opt.value })}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
          </div>
        )}
      </div>
    </>
  )
}

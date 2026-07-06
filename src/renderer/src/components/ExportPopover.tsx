import React, { useEffect, useState } from 'react'
import type { ExportFormat, ExportScope } from '../../../shared/types'
import { panelStyle } from '../lib/popover'
import './popover.css'
import './ExportPopover.css'

export interface ExportPopoverProps {
  anchor: DOMRect
  day: string
  onClose: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'done'; path: string }
  | { kind: 'error'; message: string }

export default function ExportPopover(props: ExportPopoverProps): React.JSX.Element {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [scope, setScope] = useState<ExportScope>('day')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  async function doExport(): Promise<void> {
    setStatus({ kind: 'saving' })
    try {
      const res = await window.api.runExport({ format, scope, day: props.day })
      if (res.canceled) {
        setStatus({ kind: 'idle' })
      } else if (res.error) {
        setStatus({ kind: 'error', message: res.error })
      } else {
        setStatus({ kind: 'done', path: res.path ?? '' })
      }
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <>
      <div className="popover-backdrop" onClick={props.onClose} />
      <div
        className="popover export-popover"
        style={panelStyle(props.anchor, 300)}
        role="dialog"
        aria-label="Export time entries"
      >
        <div className="popover__title">Export</div>

        <fieldset className="export-group">
          <legend>Format</legend>
          <label className="radio">
            <input
              type="radio"
              name="format"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            JSON
          </label>
          <label className="radio">
            <input
              type="radio"
              name="format"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
            />
            CSV
          </label>
        </fieldset>

        <fieldset className="export-group">
          <legend>Range</legend>
          <label className="radio">
            <input
              type="radio"
              name="scope"
              checked={scope === 'day'}
              onChange={() => setScope('day')}
            />
            This day ({props.day})
          </label>
          <label className="radio">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            All days
          </label>
        </fieldset>

        {status.kind === 'done' && (
          <div className="export-status export-status--ok">Saved to {status.path}</div>
        )}
        {status.kind === 'error' && (
          <div className="export-status export-status--err">{status.message}</div>
        )}

        <div className="popover__actions">
          <div className="popover__actions-right">
            <button className="btn btn--ghost" onClick={props.onClose}>
              {status.kind === 'done' ? 'Close' : 'Cancel'}
            </button>
            <button
              className="btn btn--primary"
              disabled={status.kind === 'saving'}
              onClick={doExport}
            >
              {status.kind === 'saving' ? 'Saving…' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

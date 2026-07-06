import React, { useEffect, useState } from 'react'
import type { Entry, Preferences, Tag } from '../../shared/types'
import { DEFAULT_PREFERENCES } from '../../shared/types'
import { DAY_MINUTES, formatRange, incrementStep } from './lib/time'
import { formatDisplayDate, todayISO } from './lib/date'
import TimePopover from './components/TimePopover'
import DoingCell from './components/DoingCell'
import TagCell from './components/TagCell'
import TagPopover from './components/TagPopover'
import CalendarPopover from './components/CalendarPopover'
import ExportPopover from './components/ExportPopover'
import './styles/App.css'

interface PopoverState {
  anchor: DOMRect
  kind: 'new' | 'edit'
  entryId?: number
  isFirst: boolean
  initialStart: number
  initialEnd: number
}

/** Strip Electron's "Error invoking remote method …:" noise from IPC errors. */
function ipcMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const idx = raw.lastIndexOf('Error: ')
  return idx >= 0 ? raw.slice(idx + 7) : raw
}

export default function App(): React.JSX.Element {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [entries, setEntries] = useState<Entry[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [day, setDay] = useState<string>(todayISO())
  const [dbError, setDbError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [tagPopover, setTagPopover] = useState<{ anchor: DOMRect; entryId: number } | null>(
    null
  )
  const [calendarAnchor, setCalendarAnchor] = useState<DOMRect | null>(null)
  const [exportAnchor, setExportAnchor] = useState<DOMRect | null>(null)
  const [ready, setReady] = useState(false)

  // One-time init: DB health, preferences, and the tag catalog.
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
        const [p, t] = await Promise.all([
          window.api.getPreferences(),
          window.api.listTags()
        ])
        if (cancelled) return
        setPrefs(p)
        setTags(t)
        setReady(true)
      } catch (err) {
        if (!cancelled) setDbError(ipcMessage(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Load entries whenever the selected day changes.
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      try {
        const e = await window.api.listEntries(day)
        if (!cancelled) setEntries(e)
      } catch (err) {
        if (!cancelled) setActionError(ipcMessage(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [day, ready])

  function openNew(e: React.MouseEvent<HTMLElement>): void {
    const isFirst = entries.length === 0
    const step = incrementStep(prefs.increment)
    const block = prefs.increment === 'custom' ? 60 : step
    const start = isFirst ? 9 * 60 : entries[entries.length - 1].endMin
    const end = Math.min(start + block, DAY_MINUTES)
    setActionError(null)
    setPopover({
      anchor: e.currentTarget.getBoundingClientRect(),
      kind: 'new',
      isFirst,
      initialStart: start,
      initialEnd: end
    })
  }

  function openEdit(e: React.MouseEvent<HTMLElement>, entry: Entry, idx: number): void {
    setActionError(null)
    setPopover({
      anchor: e.currentTarget.getBoundingClientRect(),
      kind: 'edit',
      entryId: entry.id,
      isFirst: idx === 0,
      initialStart: entry.startMin,
      initialEnd: entry.endMin
    })
  }

  async function handleSaveTime(
    startMin: number | undefined,
    endMin: number
  ): Promise<void> {
    if (!popover) return
    try {
      const list =
        popover.kind === 'new'
          ? await window.api.createEntry(day, endMin, startMin)
          : await window.api.updateEntryTime(popover.entryId as number, { startMin, endMin })
      setEntries(list)
      setPopover(null)
      setActionError(null)
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  async function handleDelete(): Promise<void> {
    if (!popover?.entryId) return
    try {
      const list = await window.api.deleteEntry(popover.entryId)
      setEntries(list)
      setPopover(null)
      setActionError(null)
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  async function handleSaveDoing(id: number, text: string): Promise<void> {
    try {
      const list = await window.api.updateEntryDoing(id, text)
      setEntries(list)
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  function selectDay(iso: string): void {
    setPopover(null)
    setTagPopover(null)
    setCalendarAnchor(null)
    setActionError(null)
    setDay(iso)
  }

  function openTags(anchor: DOMRect, entry: Entry): void {
    setActionError(null)
    setTagPopover({ anchor, entryId: entry.id })
  }

  async function toggleTag(entry: Entry, tagId: number): Promise<void> {
    const ids = entry.tags.map((t) => t.id)
    const next = ids.includes(tagId) ? ids.filter((i) => i !== tagId) : [...ids, tagId]
    try {
      const list = await window.api.setEntryTags(entry.id, next)
      setEntries(list)
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  async function createTagFor(entry: Entry, name: string): Promise<void> {
    try {
      const tag = await window.api.createTag(name)
      setTags(await window.api.listTags())
      const ids = entry.tags.map((t) => t.id)
      if (!ids.includes(tag.id)) {
        setEntries(await window.api.setEntryTags(entry.id, [...ids, tag.id]))
      }
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  async function recolorTag(tagId: number, color: string): Promise<void> {
    try {
      setTags(await window.api.setTagColor(tagId, color))
      setEntries(await window.api.listEntries(day))
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

  async function handleSavePrefs(patch: Partial<Preferences>): Promise<void> {
    try {
      const p = await window.api.setPreferences(patch)
      setPrefs(p)
    } catch (err) {
      setActionError(ipcMessage(err))
    }
  }

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
          <button
            className="datepill"
            type="button"
            onClick={(e) => setCalendarAnchor(e.currentTarget.getBoundingClientRect())}
          >
            <CalendarIcon />
            <span className="datepill__date">{formatDisplayDate(day)}</span>
          </button>
          <button
            className="export-btn"
            type="button"
            onClick={(e) => setExportAnchor(e.currentTarget.getBoundingClientRect())}
          >
            Export
          </button>
        </div>

        <div className="table" role="table" aria-label="Time entries">
          <div className="table__scroll" role="rowgroup">
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

          {entries.map((entry, idx) => (
            <div className="tr" role="row" key={entry.id}>
              <button
                type="button"
                className="td td--time td--clickable"
                onClick={(e) => openEdit(e, entry, idx)}
              >
                {formatRange(entry.startMin, entry.endMin, prefs.display)}
              </button>
              <div className="td td--doing" role="cell">
                <DoingCell
                  value={entry.doing}
                  onSave={(text) => handleSaveDoing(entry.id, text)}
                />
              </div>
              <div className="td td--tag" role="cell">
                <TagCell entry={entry} onOpen={openTags} />
              </div>
            </div>
          ))}

          {!dbError && (
            <div className="tr" role="row">
              <button
                type="button"
                className="td td--time td--clickable td--add"
                onClick={openNew}
              >
                <span className="td--add__hint">+ Add time</span>
              </button>
              <div className="td td--doing" role="cell" />
              <div className="td td--tag" role="cell" />
            </div>
          )}
          </div>
        </div>
      </main>

      <footer className="statusbar">
        Increment: {String(prefs.increment)}
        {typeof prefs.increment === 'number' ? ' min' : ''} · Display:{' '}
        {prefs.display === 'ampm' ? 'AM/PM' : 'Military'}
      </footer>

      {popover && (
        <TimePopover
          anchor={popover.anchor}
          isFirst={popover.isFirst}
          initialStart={popover.initialStart}
          initialEnd={popover.initialEnd}
          prefs={prefs}
          canDelete={popover.kind === 'edit'}
          error={actionError}
          onSaveTime={handleSaveTime}
          onDelete={handleDelete}
          onSavePrefs={handleSavePrefs}
          onClose={() => {
            setPopover(null)
            setActionError(null)
          }}
        />
      )}

      {tagPopover &&
        (() => {
          const tagEntry = entries.find((e) => e.id === tagPopover.entryId)
          if (!tagEntry) return null
          return (
            <TagPopover
              anchor={tagPopover.anchor}
              entry={tagEntry}
              allTags={tags}
              error={actionError}
              onToggle={(tagId) => toggleTag(tagEntry, tagId)}
              onCreate={(name) => createTagFor(tagEntry, name)}
              onRecolor={recolorTag}
              onClose={() => {
                setTagPopover(null)
                setActionError(null)
              }}
            />
          )
        })()}

      {calendarAnchor && (
        <CalendarPopover
          anchor={calendarAnchor}
          selected={day}
          today={todayISO()}
          onSelect={selectDay}
          onClose={() => setCalendarAnchor(null)}
        />
      )}

      {exportAnchor && (
        <ExportPopover
          anchor={exportAnchor}
          day={day}
          onClose={() => setExportAnchor(null)}
        />
      )}
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

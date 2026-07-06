import React, { useEffect, useRef, useState } from 'react'
import './DoingCell.css'

export interface DoingCellProps {
  value: string
  onSave: (text: string) => void
}

const AUTOSAVE_MS = 300

function autoGrow(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function DoingCell({ value, onSave }: DoingCellProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const draftRef = useRef(value) // latest text (sync, for timers/unload)
  const savedRef = useRef(value) // last text we've persisted
  const editingRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  })

  // Adopt external value changes (e.g. loading another day) — but never while
  // editing, so an in-flight autosave can't overwrite what the user is typing.
  useEffect(() => {
    savedRef.current = value
    if (!editingRef.current) {
      draftRef.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    const el = areaRef.current
    if (editing && el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      autoGrow(el)
    }
  }, [editing])

  function flush(): void {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (draftRef.current !== savedRef.current) {
      savedRef.current = draftRef.current
      onSaveRef.current(draftRef.current)
    }
  }

  // Persist pending edits when the cell unmounts or the window closes.
  useEffect(() => {
    const onBeforeUnload = (): void => flush()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(text: string): void {
    draftRef.current = text
    setDraft(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, AUTOSAVE_MS)
  }

  function beginEdit(): void {
    editingRef.current = true
    setEditing(true)
  }

  function endEdit(): void {
    editingRef.current = false
    setEditing(false)
    flush()
  }

  if (!editing) {
    return (
      <div
        className="doing-view"
        role="textbox"
        tabIndex={0}
        onClick={beginEdit}
        onFocus={beginEdit}
      >
        {draft}
      </div>
    )
  }

  return (
    <textarea
      ref={areaRef}
      className="doing-input"
      value={draft}
      rows={1}
      onChange={(e) => {
        update(e.target.value)
        autoGrow(e.target)
      }}
      onBlur={endEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          endEdit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          draftRef.current = value
          setDraft(value)
          editingRef.current = false
          setEditing(false)
        }
      }}
    />
  )
}

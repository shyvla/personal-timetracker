import React, { useEffect, useRef, useState } from 'react'
import './DoingCell.css'

export interface DoingCellProps {
  value: string
  onSave: (text: string) => void
}

function autoGrow(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function DoingCell({ value, onSave }: DoingCellProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    const el = ref.current
    if (editing && el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      autoGrow(el)
    }
  }, [editing])

  function commit(): void {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (!editing) {
    return (
      <div
        className="doing-view"
        role="textbox"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
      >
        {value ? value : <span className="doing-view__placeholder">Add details…</span>}
      </div>
    )
  }

  return (
    <textarea
      ref={ref}
      className="doing-input"
      value={draft}
      rows={1}
      onChange={(e) => {
        setDraft(e.target.value)
        autoGrow(e.target)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}

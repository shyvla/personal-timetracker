import React, { useEffect, useRef, useState } from 'react'
import type { Entry, Tag } from '../../../shared/types'
import { normalizeHex, readableTextColor } from '../lib/color'
import { panelStyle } from '../lib/popover'
import './popover.css'
import './TagPopover.css'

export interface TagPopoverProps {
  anchor: DOMRect
  entry: Entry
  allTags: Tag[]
  error: string | null
  onToggle: (tagId: number) => void
  onCreate: (name: string) => void
  onRecolor: (tagId: number, color: string) => void
  onClose: () => void
}

export default function TagPopover(props: TagPopoverProps): React.JSX.Element {
  const { anchor, entry, allTags, error } = props
  const [query, setQuery] = useState('')
  const [colorEditingId, setColorEditingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const selectedIds = new Set(entry.tags.map((t) => t.id))
  const q = query.trim()
  const ql = q.toLowerCase()
  const filtered = ql
    ? allTags.filter((t) => t.name.toLowerCase().includes(ql))
    : allTags
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === ql)

  function commitQuery(): void {
    if (!q) return
    if (exactMatch) {
      if (!selectedIds.has(exactMatch.id)) props.onToggle(exactMatch.id)
    } else {
      props.onCreate(q)
    }
    setQuery('')
  }

  return (
    <>
      <div className="popover-backdrop" onClick={props.onClose} />
      <div className="popover" style={panelStyle(anchor)} role="dialog" aria-label="Edit tags">
        <input
          ref={inputRef}
          className="tag-search"
          placeholder="Search or create a tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitQuery()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              props.onClose()
            }
          }}
        />

        {error && <div className="popover__error">{error}</div>}

        <div className="tag-list">
          {q && !exactMatch && (
            <button className="tag-create" onClick={commitQuery}>
              Create <strong>{q}</strong>
            </button>
          )}

          {filtered.map((tag) => {
            const selected = selectedIds.has(tag.id)
            return (
              <div className="tag-row" key={tag.id}>
                <button
                  className={`tag-row__select${selected ? ' is-selected' : ''}`}
                  onClick={() => props.onToggle(tag.id)}
                >
                  <span className="tag-row__check" aria-hidden="true">
                    {selected ? '✓' : ''}
                  </span>
                  <span
                    className="tag"
                    style={{
                      backgroundColor: tag.color,
                      color: readableTextColor(tag.color)
                    }}
                  >
                    {tag.name}
                  </span>
                </button>
                <button
                  className="tag-row__menu"
                  aria-label={`Change color of ${tag.name}`}
                  onClick={() =>
                    setColorEditingId((id) => (id === tag.id ? null : tag.id))
                  }
                >
                  ⋮
                </button>

                {colorEditingId === tag.id && (
                  <ColorEditor tag={tag} onRecolor={(c) => props.onRecolor(tag.id, c)} />
                )}
              </div>
            )
          })}

          {filtered.length === 0 && !q && (
            <div className="tag-empty">No tags yet — type to create one.</div>
          )}
        </div>
      </div>
    </>
  )
}

function ColorEditor({
  tag,
  onRecolor
}: {
  tag: Tag
  onRecolor: (color: string) => void
}): React.JSX.Element {
  const [hex, setHex] = useState(tag.color)

  useEffect(() => {
    setHex(tag.color)
  }, [tag.color])

  function applyHex(value: string): void {
    const norm = normalizeHex(value)
    if (norm) onRecolor(norm)
    else setHex(tag.color)
  }

  return (
    <div className="coloreditor">
      <input
        type="color"
        className="coloreditor__wheel"
        value={normalizeHex(tag.color) ?? '#000000'}
        onChange={(e) => onRecolor(e.target.value)}
        aria-label="Color wheel"
      />
      <input
        className="coloreditor__hex"
        value={hex}
        spellCheck={false}
        onChange={(e) => setHex(e.target.value)}
        onBlur={() => applyHex(hex)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') applyHex(hex)
        }}
        aria-label="Hex color"
      />
    </div>
  )
}

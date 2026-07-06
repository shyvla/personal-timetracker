import React from 'react'
import type { Entry } from '../../../shared/types'
import TagChip from './TagChip'

export interface TagCellProps {
  entry: Entry
  onOpen: (anchor: DOMRect, entry: Entry) => void
}

export default function TagCell({ entry, onOpen }: TagCellProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="tagcell"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect(), entry)}
      aria-label="Edit tags"
    >
      {entry.tags.length > 0 && (
        <div className="tags">
          {entry.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      )}
    </button>
  )
}

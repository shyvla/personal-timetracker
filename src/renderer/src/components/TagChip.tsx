import React from 'react'
import type { Tag } from '../../../shared/types'
import { readableTextColor } from '../lib/color'

export default function TagChip({ tag }: { tag: Tag }): React.JSX.Element {
  return (
    <span
      className="tag"
      style={{ backgroundColor: tag.color, color: readableTextColor(tag.color) }}
    >
      {tag.name}
    </span>
  )
}

import type { CSSProperties } from 'react'

/**
 * Position a fixed popover relative to an anchor: below it when there's room,
 * otherwise above, with max-height capped to the available space so tall content
 * scrolls inside the panel rather than off-screen.
 */
export function panelStyle(anchor: DOMRect, width = 320, margin = 12, gap = 6): CSSProperties {
  const spaceBelow = window.innerHeight - anchor.bottom - margin
  const spaceAbove = anchor.top - margin
  const placeBelow = spaceBelow >= spaceAbove
  return {
    left: Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin)),
    maxHeight: Math.max(placeBelow ? spaceBelow : spaceAbove, 160),
    ...(placeBelow
      ? { top: anchor.bottom + gap }
      : { bottom: window.innerHeight - anchor.top + gap })
  }
}

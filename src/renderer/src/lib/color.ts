/** Parse "#rgb" or "#rrggbb" into 0–255 components (null if malformed). */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

/** True if the string is a valid #rgb / #rrggbb color. */
export function isValidHex(hex: string): boolean {
  return hexToRgb(hex) !== null
}

/** Normalize to "#rrggbb" lowercase, or null if invalid. */
export function normalizeHex(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const to = (v: number): string => v.toString(16).padStart(2, '0')
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const lin = (v: number): number => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Pick black or white text for a background, whichever has the higher WCAG
 * contrast ratio — keeps chip labels readable on any tag color.
 */
export function readableTextColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex)
  if (!rgb) return '#111111'
  const l = relativeLuminance(rgb)
  const contrastWhite = 1.05 / (l + 0.05)
  const contrastBlack = (l + 0.05) / 0.05
  return contrastBlack >= contrastWhite ? '#111111' : '#ffffff'
}

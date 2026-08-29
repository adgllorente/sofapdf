export type ParsedColor = {
  red: number
  green: number
  blue: number
  alpha: number
}

const FALLBACK_COLOR = '#000000ff'

export function normalizeHexAlpha(value: string): string {
  if (value.trim().toLowerCase() === 'transparent') return '#ffffff00'

  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex)) return `#${hex.split('').map((part) => part + part).join('')}ff`
  if (/^[\da-f]{4}$/i.test(hex)) return `#${hex.split('').map((part) => part + part).join('')}`
  if (/^[\da-f]{6}$/i.test(hex)) return `#${hex}ff`
  if (/^[\da-f]{8}$/i.test(hex)) return `#${hex}`
  return FALLBACK_COLOR
}

export function parseHexColor(value: string): ParsedColor {
  const hex = normalizeHexAlpha(value).slice(1)
  return {
    red: parseInt(hex.slice(0, 2), 16) / 255,
    green: parseInt(hex.slice(2, 4), 16) / 255,
    blue: parseInt(hex.slice(4, 6), 16) / 255,
    alpha: parseInt(hex.slice(6, 8), 16) / 255,
  }
}

export function hexToCssRgba(value: string): string {
  const color = parseHexColor(value)
  return `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)}, ${color.alpha})`
}

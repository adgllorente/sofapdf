/**
 * Parseo de selecciones de páginas al estilo "1-3, 5, 9-" (1-indexado para el
 * usuario, 0-indexado hacia dentro).
 */
import { fmt, t } from '@/i18n'

export type PageRange = { from: number; to: number }

export function parseRanges(input: string, pageCount: number): PageRange[] {
  const text = input.trim()
  if (!text) return [{ from: 0, to: pageCount - 1 }]

  const ranges: PageRange[] = []
  for (const chunk of text.split(',')) {
    const part = chunk.trim()
    if (!part) continue

    const match = /^(\d+)?\s*(?:-\s*(\d+)?)?$/.exec(part)
    if (!match) throw new Error(fmt(t.errors.badRange, { part }))

    const hasDash = part.includes('-')
    const rawFrom = match[1] ? Number(match[1]) : 1
    const rawTo = hasDash ? (match[2] ? Number(match[2]) : pageCount) : rawFrom

    const from = clampPage(rawFrom, pageCount)
    const to = clampPage(rawTo, pageCount)
    if (from > to) throw new Error(fmt(t.errors.reversedRange, { part }))
    ranges.push({ from, to })
  }

  if (!ranges.length) throw new Error(t.errors.emptySelection)
  return ranges
}

function clampPage(value: number, pageCount: number): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(fmt(t.errors.noPage, { page: value }))
  }
  if (value > pageCount) {
    throw new Error(fmt(t.errors.noPageOf, { page: value, total: pageCount }))
  }
  return value - 1
}

/** Índices 0-indexados, ordenados y sin duplicados. */
export function expandRanges(ranges: PageRange[]): number[] {
  const seen = new Set<number>()
  for (const { from, to } of ranges) {
    for (let i = from; i <= to; i++) seen.add(i)
  }
  return [...seen].sort((a, b) => a - b)
}

export function parsePageList(input: string, pageCount: number): number[] {
  return expandRanges(parseRanges(input, pageCount))
}

export function padIndex(index: number, total: number): string {
  return String(index).padStart(String(total).length, '0')
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

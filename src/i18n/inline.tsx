import { Fragment, type ReactNode } from 'react'

/** Trozo de texto: cadena suelta o bloque en negrita. */
export type InlinePart = string | { bold: string }

export function renderInline(parts: InlinePart[]): ReactNode {
  return parts.map((part, i) => {
    if (typeof part === 'string') return <Fragment key={i}>{part}</Fragment>
    return <strong key={i}>{part.bold}</strong>
  })
}

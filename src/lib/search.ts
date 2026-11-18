/** Minúsculas y sin diacríticos: «compresión» y «compresion» tienen que encontrarse igual. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export type SearchFields = { name: string; texts: string[] }

/**
 * Cada palabra de la consulta tiene que aparecer como subcadena en algún campo
 * («primir» → «Comprimir»). Devuelve 0 si no encaja; el nombre puntúa más.
 */
export function matchScore(query: string, fields: SearchFields): number {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const name = normalize(fields.name)
  const nameWords = name.split(/\s+/)
  const rest = normalize(fields.texts.join(' '))
  let score = 0
  for (const word of words) {
    if (name.startsWith(word)) score += 4
    else if (nameWords.some((part) => part.startsWith(word))) score += 3
    else if (name.includes(word)) score += 2
    else if (rest.includes(word)) score += 1
    else return 0
  }
  return score
}

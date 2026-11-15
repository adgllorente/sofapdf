/**
 * Búsqueda de subcadenas sobre bytes. Un PDF dañado no se puede decodificar a
 * texto sin corromper los streams binarios, así que se compara byte a byte.
 */

export function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function matchesAt(haystack: Uint8Array, needle: Uint8Array, at: number): boolean {
  for (let j = 0; j < needle.length; j++) {
    if (haystack[at + j] !== needle[j]) return false
  }
  return true
}

export function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0) return 0
  const last = haystack.length - needle.length
  // `indexOf` nativo salta hasta cada candidato: en un PDF de cientos de MB el
  // bucle en JS byte a byte bloqueaba casi un segundo.
  for (let i = haystack.indexOf(needle[0]); i !== -1 && i <= last; i = haystack.indexOf(needle[0], i + 1)) {
    if (matchesAt(haystack, needle, i)) return i
  }
  return -1
}

export function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  for (let i = haystack.length - needle.length; i >= 0; i--) {
    if (matchesAt(haystack, needle, i)) return i
  }
  return -1
}

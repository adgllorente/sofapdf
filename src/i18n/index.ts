import { APP } from '@/config'
import { en } from './locales/en'
import { es } from './locales/es'

export type Locale = 'es' | 'en'

/** El español es el diccionario de referencia: su forma define el tipo del resto. */
export type Dict = typeof es

const DICTS: Record<Locale, Dict> = { es, en }

export const LOCALES: Locale[] = ['es', 'en']

/** Inglés como respaldo: es el idioma que más gente entiende si el suyo no está. */
const FALLBACK: Locale = 'en'

const STORAGE_KEY = 'lang'

function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en'
}

function detect(): Locale {
  const tags = globalThis.navigator?.languages ?? [globalThis.navigator?.language ?? '']
  for (const tag of tags) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return FALLBACK
}

function initial(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Navegación privada sin almacenamiento: se cae a la detección.
  }
  return detect()
}

let current: Locale = initial()

/**
 * Binding vivo del módulo: `setLocale` lo reapunta a otro diccionario y quien
 * haga `import { t }` lee el nuevo valor sin recargar la página. Recargar
 * tiraría los archivos que el usuario tenga abiertos en la pestaña.
 */
export let t: Dict = DICTS[current]

const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return current
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setLocale(next: Locale): void {
  if (next === current) return
  current = next
  t = DICTS[next]
  try {
    // Segunda y última cosa que se persiste, junto al tema. Es un ajuste de
    // interfaz: nada del documento sale de la memoria de la pestaña.
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento el idioma dura lo que la pestaña.
  }
  applyDocumentLocale()
  for (const listener of listeners) listener()
}

/** Lo que vive fuera de React: atributo lang, título y meta descripción. */
export function applyDocumentLocale(): void {
  document.documentElement.lang = t.meta.lang
  applyDocumentMeta(fmt(t.meta.homeTitle, { app: APP.name, tagline: t.brand.tagline }), t.meta.description)
}

export function applyDocumentMeta(title: string, description: string): void {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
}

/** Sustituye `{clave}` por su valor. Deja el hueco visible si falta, para que cante. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (hole, key: string) =>
    key in vars ? String(vars[key]) : hole,
  )
}

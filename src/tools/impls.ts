import type { ToolRun, ToolSlug } from './types'

/**
 * Carga diferida de cada implementación. Vive aparte del registro para que el
 * worker de herramientas lo importe sin arrastrar React ni las vistas previas.
 */
export const IMPLS: Partial<Record<ToolSlug, () => Promise<ToolRun>>> = {
  merge: () => import('./impl/merge').then((m) => m.run),
  interleave: () => import('./impl/interleave').then((m) => m.run),
  split: () => import('./impl/split').then((m) => m.run),
  insert: () => import('./impl/insert').then((m) => m.run),
  duplicate: () => import('./impl/duplicate').then((m) => m.run),
  rotate: () => import('./impl/rotate').then((m) => m.run),
  organize: () => import('./impl/organize').then((m) => m.run),
  'n-up': () => import('./impl/n-up').then((m) => m.run),
  'remove-blank-pages': () => import('./impl/remove-blank-pages').then((m) => m.run),
  number: () => import('./impl/number').then((m) => m.run),
  'header-footer': () => import('./impl/header-footer').then((m) => m.run),
  watermark: () => import('./impl/watermark').then((m) => m.run),
  crop: () => import('./impl/crop').then((m) => m.run),
  compare: () => import('./impl/compare').then((m) => m.run),
  'jpg-to-pdf': () => import('./impl/images-to-pdf').then((m) => m.run),
  'pdf-to-jpg': () => import('./impl/pdf-to-images').then((m) => m.run),
  'extract-images': () => import('./impl/extract-images').then((m) => m.run),
  'pdf-to-text': () => import('./impl/pdf-to-text').then((m) => m.run),
  ocr: () => import('./impl/ocr').then((m) => m.run),
  compress: () => import('./impl/compress').then((m) => m.run),
  grayscale: () => import('./impl/grayscale').then((m) => m.run),
  flatten: () => import('./impl/flatten').then((m) => m.run),
  repair: () => import('./impl/repair').then((m) => m.run),
  sanitize: () => import('./impl/sanitize').then((m) => m.run),
  protect: () => import('./impl/protect').then((m) => m.run),
  unlock: () => import('./impl/unlock').then((m) => m.run),
  sign: () => import('./impl/sign').then((m) => m.run),
  edit: () => import('./impl/edit').then((m) => m.run),
  redact: () => import('./impl/redact').then((m) => m.run),
  metadata: () => import('./impl/metadata').then((m) => m.run),
  bookmarks: () => import('./impl/bookmarks').then((m) => m.run),
  report: () => import('./impl/report').then((m) => m.run),
  accessibility: () => import('./impl/accessibility').then((m) => m.run),
  'simulate-scan': () => import('./impl/simulate-scan').then((m) => m.run),
}

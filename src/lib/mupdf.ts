// MuPDF (AGPL-3.0): el WASM (~10 MB, ~3,6 MB con brotli) se resuelve con
// `new URL(..., import.meta.url)`, así que Vite lo sirve desde el propio
// origen. Este módulo solo se importa desde chunks diferidos.
import * as mupdf from 'mupdf'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'

export { mupdf }

/**
 * Guardado por defecto: compacta objetos, comprime streams y deja el resultado
 * sin cifrar. Sin `encrypt=none` MuPDF conservaría el cifrado del original.
 */
export const SAVE_OPTIONS = 'garbage=compact,compress,encrypt=none'

/** Abre un PDF ya en memoria; MuPDF repara al vuelo un xref roto. */
export function openPdf(bytes: Uint8Array, name = ''): mupdf.PDFDocument {
  let doc: mupdf.Document
  try {
    doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  } catch {
    throw new Error(fmt(t.errors.notPdf, { name }))
  }
  const pdf = doc.asPDF()
  if (!pdf) {
    doc.destroy()
    throw new Error(fmt(t.errors.notPdf, { name }))
  }
  return pdf
}

export async function readPdf(file: File): Promise<mupdf.PDFDocument> {
  return openPdf(new Uint8Array(await file.arrayBuffer()), file.name)
}

/** Copia los bytes fuera del heap del WASM: la vista se invalida al liberar el buffer. */
export function pdfBytes(doc: mupdf.PDFDocument, options = SAVE_OPTIONS): Uint8Array {
  const buffer = doc.saveToBuffer(options)
  try {
    return buffer.asUint8Array().slice()
  } finally {
    buffer.destroy()
  }
}

export function pdfBlob(doc: mupdf.PDFDocument, options = SAVE_OPTIONS): Blob {
  return toBlob(pdfBytes(doc, options))
}

/** Ejecuta `fn` y libera el documento aunque lance. */
export async function usingPdf<T>(
  doc: mupdf.PDFDocument,
  fn: (doc: mupdf.PDFDocument) => T | Promise<T>,
): Promise<T> {
  try {
    return await fn(doc)
  } finally {
    doc.destroy()
  }
}

/** Libera el pixmap tras sacar sus bytes, que son una copia. */
export function pixmapToPng(pixmap: mupdf.Pixmap): Uint8Array {
  try {
    return pixmap.asPNG().slice()
  } finally {
    pixmap.destroy()
  }
}

export function pixmapToJpeg(pixmap: mupdf.Pixmap, quality: number): Uint8Array {
  try {
    return pixmap.asJPEG(quality).slice()
  } finally {
    pixmap.destroy()
  }
}

/** Renderiza una página a `scale` (1 = 72 ppp) en RGB opaco, con fondo blanco. */
export function renderPage(page: mupdf.Page, scale: number, alpha = false): mupdf.Pixmap {
  return page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, alpha)
}

/** Copia todas las páginas de `source` al final de `target`. */
export function appendPages(target: mupdf.PDFDocument, source: mupdf.PDFDocument, indices?: number[]): void {
  // Un único graft map comparte fuentes e imágenes entre páginas: sin él se duplican.
  const map = target.newGraftMap()
  try {
    const pages = indices ?? [...Array(source.countPages()).keys()]
    for (const index of pages) map.graftPage(-1, source, index)
  } finally {
    map.destroy()
  }
}

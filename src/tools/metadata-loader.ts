import type { OptionValues } from '@/tools/types'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfInfo = {
  Title?: string
  Author?: string
  Subject?: string
  Keywords?: string
}

/** Mapea la `info` dict de pdfjs a los campos editables. */
function infoToValues(info: PdfInfo): Record<string, string> {
  // Keywords en PDF llegan como string separado por espacios; el impl lo
  // reparsea por comas al guardar, así que se entrega tal cual.
  return {
    title: (info.Title ?? '').trim(),
    author: (info.Author ?? '').trim(),
    subject: (info.Subject ?? '').trim(),
    keywords: (info.Keywords ?? '').trim(),
  }
}

/**
 * Lee los metadatos editables de un PDF con pdfjs. Usado por la Preview y
 * por el workflow para inicializar el paso de metadata.
 */
export async function loadMetadataFromFile(file: File): Promise<OptionValues> {
  const { pdfjs } = await import('@/lib/pdfjs')
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  let doc: PDFDocumentProxy | null = null
  try {
    doc = await task.promise
    const { info } = await doc.getMetadata()
    return infoToValues(info as PdfInfo)
  } finally {
    const closable = doc as (PDFDocumentProxy & { destroy?: () => Promise<void> }) | null
    await closable?.destroy?.()
  }
}

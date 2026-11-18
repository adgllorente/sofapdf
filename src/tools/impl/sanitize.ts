import { t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { openPdf, pdfBlob, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const catalogEntries = [
  'AA',
  'AcroForm',
  'AF',
  'Collection',
  'Metadata',
  'Names',
  'OpenAction',
  'Outlines',
  'PieceInfo',
  'StructTreeRoot',
  'Threads',
  'URI',
  'ViewerPreferences',
]

const pageEntries = ['AA', 'AF', 'Annots', 'Metadata', 'PieceInfo']

/**
 * Se quitan las entradas del catálogo y de cada página, y el Info dict del
 * tráiler; al guardar, `garbage` descarta todo lo que quedó sin referencia.
 */
export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const input = new Uint8Array(await file.arrayBuffer())
  if ((await encryptionState(input)) === 'encrypted') throw new Error(t.errors.sanitizeEncrypted)

  return usingPdf(openPdf(input, file.name), (doc) => {
    ctx.onProgress(0.35, t.progress.sanitizing)
    const trailer = doc.getTrailer()
    const catalog = trailer.get('Root')
    for (const entry of catalogEntries) catalog.delete(entry)
    trailer.delete('Info')

    for (let i = 0; i < doc.countPages(); i++) {
      const page = doc.findPage(i)
      for (const entry of pageEntries) page.delete(entry)
    }

    ctx.onProgress(0.8, t.progress.writingPdf)
    const blob = pdfBlob(doc)
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.sanitized}.pdf`, blob }]
  })
}

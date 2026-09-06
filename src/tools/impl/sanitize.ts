import { PDFDocument, PDFName } from 'pdf-lib'
import { t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { toBlob } from '@/lib/files'
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

function removeEntries(dict: { delete: (key: PDFName) => boolean }, entries: string[]): void {
  for (const entry of entries) dict.delete(PDFName.of(entry))
}

/**
 * Copiar solo las páginas alcanza los objetos que forman su aspecto visible y
 * descarta el resto del catálogo de origen, incluidos objetos ya huérfanos.
 */
export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const input = new Uint8Array(await file.arrayBuffer())
  if ((await encryptionState(input)) === 'encrypted') throw new Error(t.errors.sanitizeEncrypted)

  const source = await PDFDocument.load(input, {
    updateMetadata: false,
  })

  ctx.onProgress(0.35, t.progress.sanitizing)
  removeEntries(source.catalog, catalogEntries)
  for (const page of source.getPages()) removeEntries(page.node, pageEntries)

  // El documento nuevo no conserva el catálogo ni el Info dict del original.
  const output = await PDFDocument.create({ updateMetadata: false })
  const pages = await output.copyPages(source, source.getPageIndices())
  for (const page of pages) {
    removeEntries(page.node, pageEntries)
    output.addPage(page)
  }

  ctx.onProgress(0.8, t.progress.writingPdf)
  const bytes = await output.save()
  ctx.onProgress(1, t.progress.done)

  return [{ name: `${baseName(file.name)}-${t.filenames.sanitized}.pdf`, blob: toBlob(bytes) }]
}

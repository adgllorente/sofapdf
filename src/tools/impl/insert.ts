import { fmt, t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), (doc) => {
    const pageCount = doc.countPages()
    const targets = parsePageList(String(values.pages), pageCount)
    const position = String(values.position)
    const [width, height] = PAGE_SIZES[String(values.pageSize) as keyof typeof PAGE_SIZES] ?? PAGE_SIZES.a4
    const landscape = String(values.orientation) === 'landscape'
    const [blankWidth, blankHeight] = landscape ? [height, width] : [width, height]

    // Se inserta sobre el propio documento, de atrás adelante para no mover los
    // índices pendientes; así se conservan marcadores, enlaces y metadatos.
    for (const [step, index] of [...targets].reverse().entries()) {
      const blank = doc.addPage([0, 0, blankWidth, blankHeight], 0, {}, '')
      doc.insertPage(position === 'before' ? index : index + 1, blank)
      ctx.onProgress((step + 1) / targets.length, fmt(t.progress.page, { n: index + 1 }))
    }

    return [{ name: `${baseName(file.name)}-${t.filenames.inserted}.pdf`, blob: pdfBlob(doc) }]
  })
}

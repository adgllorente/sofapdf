import { fmt, t } from '@/i18n'
import { appendPages, mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  return usingPdf(new mupdf.PDFDocument(), async (merged) => {
    for (const [index, file] of files.entries()) {
      ctx.onProgress(index / files.length, fmt(t.progress.reading, { name: file.name }))
      await yieldToUI()
      // Cada origen se libera al terminar de copiarlo: no se acumulan en memoria.
      await usingPdf(await readPdf(file), (source) => appendPages(merged, source))
    }

    ctx.onProgress(0.95, t.progress.writingPdf)
    return [{ name: `${t.filenames.merged}.pdf`, blob: pdfBlob(merged) }]
  })
}

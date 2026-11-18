import { t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  return usingPdf(await readPdf(file), (doc) => {
    ctx.onProgress(0.35, t.progress.flattening)
    try {
      // Solo los campos de formulario: las anotaciones se quedan como estaban.
      doc.bake(false, true)
    } catch {
      throw new Error(t.errors.flattenFailed)
    }

    ctx.onProgress(0.8, t.progress.writingPdf)
    const blob = pdfBlob(doc)
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.flattened}.pdf`, blob }]
  })
}

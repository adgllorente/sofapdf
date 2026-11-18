import { fmt, t } from '@/i18n'
import { appendPages, mupdf, pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const copies = Number(values.copies)
  if (!Number.isInteger(copies) || copies < 2 || copies > 100) {
    throw new Error(t.errors.invalidCopies)
  }

  return usingPdf(await readPdf(file), (source) => {
    const pageCount = source.countPages()
    const selected = new Set(parsePageList(String(values.pages), pageCount))
    const sourceIndices: number[] = []
    for (let index = 0; index < pageCount; index++) {
      const repetitions = selected.has(index) ? copies : 1
      for (let copy = 0; copy < repetitions; copy++) sourceIndices.push(index)
    }

    ctx.onProgress(0.1, fmt(t.progress.page, { n: 1 }))
    // Un solo graft: las copias comparten fuentes e imágenes en vez de duplicarlas.
    return usingPdf(new mupdf.PDFDocument(), (target) => {
      appendPages(target, source, sourceIndices)
      ctx.onProgress(0.9, t.progress.writingPdf)
      return [{ name: `${baseName(file.name)}-${t.filenames.duplicated}.pdf`, blob: pdfBlob(target) }]
    })
  })
}

import { fmt, t } from '@/i18n'
import { pdfBlob, readPdf, renderPage, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PDFPage = ReturnType<Awaited<ReturnType<typeof readPdf>>['loadPage']>

const WHITE_THRESHOLD = 250
const MAX_RENDER_SIZE = 1600

function isBlankPage(page: PDFPage): boolean {
  const [x0, y0, x1, y1] = page.getBounds()
  const scale = Math.min(1, MAX_RENDER_SIZE / Math.max(x1 - x0, y1 - y0))
  // Sin alfa el fondo es blanco: una página transparente cuenta como impresa en blanco.
  const pixmap = renderPage(page, scale)
  try {
    const pixels = pixmap.getPixels()
    for (const value of pixels) {
      if (value < WHITE_THRESHOLD) return false
    }
    return true
  } finally {
    pixmap.destroy()
  }
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    const pageCount = doc.countPages()
    const blankPages: number[] = []

    try {
      for (let index = 0; index < pageCount; index++) {
        ctx.onProgress(index / pageCount, fmt(t.progress.page, { n: index + 1 }))
        await yieldToUI()
        const page = doc.loadPage(index)
        try {
          if (isBlankPage(page)) blankPages.push(index)
        } finally {
          page.destroy()
        }
      }
    } catch {
      throw new Error(t.errors.blankPagesFailed)
    }

    if (blankPages.length === pageCount) throw new Error(t.errors.blankPagesAll)

    ctx.onProgress(0.9, t.progress.removingBlankPages)
    for (const index of blankPages.reverse()) doc.deletePage(index)

    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.blankPagesRemoved}.pdf`, blob: pdfBlob(doc) }]
  })
}

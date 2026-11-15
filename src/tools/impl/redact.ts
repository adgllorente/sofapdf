import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/** Fracciones 0..1 de la página tal como se ve (rotación y CropBox aplicadas), página 1-indexada. */
type Region = { id: string; page: number; x: number; y: number; width: number; height: number }

function parseRegions(raw: string): Region[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Region[]
    return parsed.filter(
      (r): r is Region =>
        typeof r?.id === 'string' &&
        typeof r?.page === 'number' &&
        typeof r?.x === 'number' &&
        typeof r?.y === 'number' &&
        typeof r?.width === 'number' &&
        typeof r?.height === 'number',
    )
  } catch {
    return []
  }
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const regions = parseRegions(String(values.regions ?? ''))
  if (regions.length === 0) throw new Error(t.errors.redactEmpty)

  ctx.onProgress(0.1, t.progress.readingPdf)
  return usingPdf(await readPdf(file), async (doc) => {
    const total = doc.countPages()
    const pages = [...new Set(regions.map((r) => r.page))]
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b)

    for (const [index, pageNum] of pages.entries()) {
      const page = doc.loadPage(pageNum - 1)
      try {
        // `getBounds` está en el mismo espacio que la vista previa: origen arriba
        // a la izquierda, con la rotación y el CropBox ya aplicados.
        const [x0, y0, x1, y1] = page.getBounds()
        const width = x1 - x0
        const height = y1 - y0
        for (const region of regions.filter((r) => r.page === pageNum)) {
          const annot = page.createAnnotation('Redact')
          annot.setRect([
            x0 + region.x * width,
            y0 + region.y * height,
            x0 + (region.x + region.width) * width,
            y0 + (region.y + region.height) * height,
          ])
        }
        // Borra del content stream el texto, los píxeles y el trazado que quedan
        // debajo; un rectángulo negro encima dejaría el texto copiable.
        page.applyRedactions(
          true,
          mupdf.PDFPage.REDACT_IMAGE_PIXELS,
          mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        )
      } finally {
        page.destroy()
      }
      ctx.onProgress(0.1 + ((index + 1) / pages.length) * 0.8, fmt(t.progress.page, { n: pageNum }))
      await yieldToUI()
    }

    ctx.onProgress(0.95, t.progress.writingPdf)
    return [{ name: `${baseName(file.name)}-${t.filenames.redacted}.pdf`, blob: pdfBlob(doc) }]
  })
}

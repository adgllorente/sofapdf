import { fmt, t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const x = clamp(Number(values.x) || 0, 0, 1)
  const y = clamp(Number(values.y) || 0, 0, 1)
  const width = clamp(Number(values.width) || 1, 0, 1)
  const height = clamp(Number(values.height) || 1, 0, 1)
  const applyAll = String(values.applyTo) !== 'one'
  const selectedPage = Math.max(1, Math.floor(Number(values.page) || 1))

  if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
    throw new Error(t.errors.cropEmpty)
  }

  return usingPdf(await readPdf(file), (doc) => {
    const pageCount = doc.countPages()

    for (let index = 0; index < pageCount; index++) {
      if (!applyAll && index + 1 !== selectedPage) continue
      const page = doc.loadPage(index)
      // Los límites y `setPageBox` usan el espacio visual (arriba a la izquierda,
      // rotación aplicada), el mismo en que la preview mide el recorte.
      const [x0, y0, x1, y1] = page.getBounds()
      const pw = x1 - x0
      const ph = y1 - y0
      page.setPageBox('CropBox', [
        x0 + x * pw,
        y0 + y * ph,
        x0 + (x + width) * pw,
        y0 + (y + height) * ph,
      ])
      page.destroy()
      ctx.onProgress((index + 1) / pageCount, fmt(t.progress.page, { n: index + 1 }))
    }

    return [{ name: `${baseName(file.name)}-${t.filenames.cropped}.pdf`, blob: pdfBlob(doc) }]
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

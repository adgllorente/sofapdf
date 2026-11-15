import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { Overlay } from '@/lib/overlay'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(',')[1] ?? '')
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const dataUrl = String(values.signatureDataUrl ?? '')
  if (!dataUrl) throw new Error(t.errors.signatureEmpty)

  const width = Number(values.signatureWidth) || 120
  const xPct = Number(values.x) || 70
  const yPct = Number(values.y) || 12
  const pageNum = Math.max(1, Math.floor(Number(values.page) || 1))
  const applyAll = String(values.applyTo) === 'all'

  return usingPdf(await readPdf(file), async (doc) => {
    const overlay = new Overlay(doc)
    // MuPDF detecta PNG o JPEG por la firma de los bytes, no por el tipo del data URL.
    const image = new mupdf.Image(dataUrlToBytes(dataUrl))
    try {
      const height = width * (image.getHeight() / image.getWidth())
      // Una sola copia de la imagen aunque se estampe en todas las páginas.
      const ref = doc.addImage(image)
      const count = doc.countPages()
      const targets = applyAll ? [...Array(count).keys()] : [clampIndex(pageNum - 1, count)]

      for (const [index, pageIndex] of targets.entries()) {
        const page = overlay.page(pageIndex)
        // xPct e yPct son el centro de la firma: el lienzo va de 0 a 100.
        const cx = page.x0 + (xPct / 100) * page.width
        const cy = page.y0 + (yPct / 100) * page.height
        page.image(ref, cx - width / 2, cy - height / 2, width, height)
        page.finish()
        ctx.onProgress((index + 1) / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))
        await yieldToUI()
      }
      return [{ name: `${baseName(file.name)}-${t.filenames.signed}.pdf`, blob: pdfBlob(doc) }]
    } finally {
      image.destroy()
      overlay.dispose()
    }
  })
}

function clampIndex(index: number, total: number): number {
  return Math.max(0, Math.min(total - 1, index))
}

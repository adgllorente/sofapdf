import { t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { Overlay, type Rgb } from '@/lib/overlay'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const INK: Rgb = [0.15, 0.15, 0.15]

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    // Helvetica es una de las 14 fuentes base del formato: no embebe nada ni pesa.
    const overlay = new Overlay(doc)
    const count = doc.countPages()
    const size = Number(values.size)
    const margin = Number(values.margin)
    const start = Number(values.start)
    const skipFirst = Boolean(values.skipFirst)
    const position = String(values.position)
    const withTotal = Boolean(values.withTotal)
    const total = count - (skipFirst ? 1 : 0)

    try {
      for (let index = 0; index < count; index++) {
        ctx.onProgress((index + 1) / count)
        await yieldToUI()
        if (skipFirst && index === 0) continue

        const number = start + index - (skipFirst ? 1 : 0)
        const label = withTotal ? `${number} / ${total + start - 1}` : String(number)
        const width = overlay.textWidth('Helvetica', label, size)
        const page = overlay.page(index)

        const x = position.endsWith('right')
          ? page.width - margin - width
          : position.endsWith('left')
            ? margin
            : (page.width - width) / 2
        const y = position.startsWith('top') ? page.height - margin - size : margin

        page.fill(INK)
        page.text(label, page.x0 + x, page.y0 + y, 'Helvetica', size)
        page.finish()
      }
      return [{ name: `${baseName(file.name)}-${t.filenames.numbered}.pdf`, blob: pdfBlob(doc) }]
    } finally {
      overlay.dispose()
    }
  })
}

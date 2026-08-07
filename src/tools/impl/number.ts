import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  // Helvetica es una de las 14 fuentes base del formato: no embebe nada ni pesa.
  const font = await document_.embedFont(StandardFonts.Helvetica)

  const pages = document_.getPages()
  const size = Number(values.size)
  const margin = Number(values.margin)
  const start = Number(values.start)
  const skipFirst = Boolean(values.skipFirst)
  const position = String(values.position)
  const withTotal = Boolean(values.withTotal)
  const total = pages.length - (skipFirst ? 1 : 0)

  for (const [index, page] of pages.entries()) {
    ctx.onProgress((index + 1) / pages.length)
    if (skipFirst && index === 0) continue

    const number = start + index - (skipFirst ? 1 : 0)
    const label = withTotal ? `${number} / ${total + start - 1}` : String(number)
    const width = font.widthOfTextAtSize(label, size)
    const { width: pageWidth, height: pageHeight } = page.getSize()

    const x = position.endsWith('right')
      ? pageWidth - margin - width
      : position.endsWith('left')
        ? margin
        : (pageWidth - width) / 2
    const y = position.startsWith('top') ? pageHeight - margin - size : margin

    page.drawText(label, { x, y, size, font, color: rgb(0.15, 0.15, 0.15) })
  }

  return [{ name: `${baseName(file.name)}-${t.filenames.numbered}.pdf`, blob: toBlob(await document_.save()) }]
}

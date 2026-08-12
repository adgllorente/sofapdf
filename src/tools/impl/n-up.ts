import { PDFDocument, rgb } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const A4 = { width: 595.28, height: 841.89 }

function grid(pagesPerSheet: number, landscape: boolean): { columns: number; rows: number } {
  const portrait = pagesPerSheet === 2
    ? { columns: 1, rows: 2 }
    : pagesPerSheet === 4
      ? { columns: 2, rows: 2 }
      : { columns: 2, rows: pagesPerSheet / 2 }
  return landscape
    ? { columns: portrait.rows, rows: portrait.columns }
    : portrait
}

function fitPage(
  width: number,
  height: number,
  cellWidth: number,
  cellHeight: number,
): { width: number; height: number; x: number; y: number } {
  const scale = Math.min(cellWidth / width, cellHeight / height)
  const fittedWidth = width * scale
  const fittedHeight = height * scale
  return {
    width: fittedWidth,
    height: fittedHeight,
    x: (cellWidth - fittedWidth) / 2,
    y: (cellHeight - fittedHeight) / 2,
  }
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const data = await file.arrayBuffer()
  const source = await PDFDocument.load(data, { ignoreEncryption: true })
  const output = await PDFDocument.create()
  const pagesPerSheet = Number(values.pagesPerSheet)
  const margin = Number(values.margin)
  const landscape = values.orientation === 'landscape'
  const { columns, rows } = grid(pagesPerSheet, landscape)
  const sheet = landscape ? { width: A4.height, height: A4.width } : A4
  const contentWidth = sheet.width - margin * 2
  const contentHeight = sheet.height - margin * 2
  const cellWidth = contentWidth / columns
  const cellHeight = contentHeight / rows
  const orderByColumns = values.order === 'columns'
  // Se incrustan desde los bytes originales para copiar también todos los recursos asociados.
  const embedded = await output.embedPdf(
    data,
    Array.from({ length: source.getPageCount() }, (_, index) => index),
  )

  for (let start = 0; start < embedded.length; start += pagesPerSheet) {
    const target = output.addPage([sheet.width, sheet.height])
    const end = Math.min(start + pagesPerSheet, embedded.length)

    for (let offset = start; offset < end; offset++) {
      const position = offset - start
      const row = orderByColumns ? position % rows : Math.floor(position / columns)
      const column = orderByColumns ? Math.floor(position / rows) : position % columns
      const page = embedded[offset]
      const fitted = fitPage(page.width, page.height, cellWidth, cellHeight)
      const x = margin + column * cellWidth + fitted.x
      const y = sheet.height - margin - (row + 1) * cellHeight + fitted.y
      target.drawPage(page, { x, y, width: fitted.width, height: fitted.height })

      if (values.lines && column < columns - 1) {
        const lineX = margin + (column + 1) * cellWidth
        target.drawLine({
          start: { x: lineX, y: margin },
          end: { x: lineX, y: sheet.height - margin },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
        })
      }
      if (values.lines && row < rows - 1) {
        const lineY = sheet.height - margin - (row + 1) * cellHeight
        target.drawLine({
          start: { x: margin, y: lineY },
          end: { x: sheet.width - margin, y: lineY },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
        })
      }
    }

    ctx.onProgress(end / embedded.length, fmt(t.progress.sheet, { n: output.getPageCount(), total: Math.ceil(embedded.length / pagesPerSheet) }))
  }

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.nUp}.pdf`, blob: toBlob(await output.save()) }]
}

import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PDFDocument = InstanceType<typeof mupdf.PDFDocument>
type PDFGraftMap = InstanceType<typeof mupdf.PDFGraftMap>
type PDFObject = InstanceType<typeof mupdf.PDFObject>
type Matrix = [number, number, number, number, number, number]

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
): { scale: number; width: number; height: number; x: number; y: number } {
  const scale = Math.min(cellWidth / width, cellHeight / height)
  const fittedWidth = width * scale
  const fittedHeight = height * scale
  return {
    scale,
    width: fittedWidth,
    height: fittedHeight,
    x: (cellWidth - fittedWidth) / 2,
    y: (cellHeight - fittedHeight) / 2,
  }
}

/** Une los streams de contenido de una página: `/Contents` puede ser uno o un array. */
function pageContents(page: PDFObject): Uint8Array {
  const contents = page.get('Contents')
  const streams: PDFObject[] = []
  if (contents.isArray()) contents.forEach((item) => streams.push(item))
  else if (contents.isStream()) streams.push(contents)

  const parts = streams.map((stream) => {
    const buffer = stream.readStream()
    try {
      return buffer.asUint8Array().slice()
    } finally {
      buffer.destroy()
    }
  })
  // Un salto de línea entre streams evita que el último token de uno se pegue al siguiente.
  const total = parts.reduce((sum, part) => sum + part.length + 1, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
    joined[offset++] = 0x0a
  }
  return joined
}

type PlacedPage = { xobject: PDFObject; width: number; height: number; toVisual: Matrix }

/**
 * Convierte una página en un Form XObject del documento de salida. Su `BBox` es
 * la caja visible y `toVisual` lleva su espacio PDF al visual (rotación incluida).
 */
function pageAsXObject(output: PDFDocument, map: PDFGraftMap, source: PDFDocument, index: number): PlacedPage {
  const page = source.loadPage(index)
  try {
    const [x0, y0, x1, y1] = page.getBounds()
    const transform = page.getTransform() as Matrix
    const toVisual = mupdf.Matrix.concat(transform, mupdf.Matrix.translate(-x0, -y0)) as Matrix
    const bbox = mupdf.Rect.transform([x0, y0, x1, y1], mupdf.Matrix.invert(transform))
    const pageObject = page.getObject()

    const dict = output.newDictionary()
    dict.put('Type', output.newName('XObject'))
    dict.put('Subtype', output.newName('Form'))
    dict.put('BBox', bbox)
    const resources = pageObject.getInheritable('Resources')
    if (!resources.isNull()) dict.put('Resources', map.graftObject(resources))
    const xobject = output.addStream(pageContents(pageObject), dict)
    return { xobject, width: x1 - x0, height: y1 - y0, toVisual }
  } finally {
    page.destroy()
  }
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString()
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const pagesPerSheet = Number(values.pagesPerSheet)
  const margin = Number(values.margin)
  const landscape = values.orientation === 'landscape'
  const { columns, rows } = grid(pagesPerSheet, landscape)
  const sheet = landscape ? { width: A4.height, height: A4.width } : A4
  const cellWidth = (sheet.width - margin * 2) / columns
  const cellHeight = (sheet.height - margin * 2) / rows
  const orderByColumns = values.order === 'columns'

  return usingPdf(await readPdf(file), (source) =>
    usingPdf(new mupdf.PDFDocument(), async (output) => {
      const pageCount = source.countPages()
      const sheets = Math.ceil(pageCount / pagesPerSheet)
      // Un único graft map: las páginas comparten fuentes e imágenes en la salida.
      const map = output.newGraftMap()

      try {
        for (let start = 0; start < pageCount; start += pagesPerSheet) {
          const end = Math.min(start + pagesPerSheet, pageCount)
          const xobjects: Record<string, PDFObject> = {}
          const content: string[] = []

          for (let offset = start; offset < end; offset++) {
            const position = offset - start
            const row = orderByColumns ? position % rows : Math.floor(position / columns)
            const column = orderByColumns ? Math.floor(position / rows) : position % columns
            const placed = pageAsXObject(output, map, source, offset)
            const fitted = fitPage(placed.width, placed.height, cellWidth, cellHeight)
            // Del espacio visual (y hacia abajo) a la hoja PDF (y hacia arriba).
            const left = margin + column * cellWidth + fitted.x
            const top = margin + row * cellHeight + fitted.y
            const toSheet: Matrix = [fitted.scale, 0, 0, -fitted.scale, left, sheet.height - top]
            const matrix = mupdf.Matrix.concat(placed.toVisual, toSheet)
            const name = `P${position}`
            xobjects[name] = placed.xobject
            content.push(`q ${matrix.map(formatNumber).join(' ')} cm /${name} Do Q`)

            if (values.lines && column < columns - 1) {
              const lineX = formatNumber(margin + (column + 1) * cellWidth)
              content.push(`q 0.75 G 0.5 w ${lineX} ${margin} m ${lineX} ${formatNumber(sheet.height - margin)} l S Q`)
            }
            if (values.lines && row < rows - 1) {
              const lineY = formatNumber(sheet.height - margin - (row + 1) * cellHeight)
              content.push(`q 0.75 G 0.5 w ${margin} ${lineY} m ${formatNumber(sheet.width - margin)} ${lineY} l S Q`)
            }
          }

          const pageObject = output.addPage(
            [0, 0, sheet.width, sheet.height],
            0,
            { XObject: xobjects },
            content.join('\n'),
          )
          output.insertPage(-1, pageObject)

          ctx.onProgress(end / pageCount, fmt(t.progress.sheet, { n: output.countPages(), total: sheets }))
          await yieldToUI()
        }
      } finally {
        map.destroy()
      }

      ctx.onProgress(1, t.progress.done)
      return [{ name: `${baseName(file.name)}-${t.filenames.nUp}.pdf`, blob: pdfBlob(output) }]
    }),
  )
}

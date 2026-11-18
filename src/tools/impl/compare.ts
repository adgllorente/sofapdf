import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, renderPage, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/**
 * Comparación píxel a píxel entre dos PDFs. Por cada par de páginas se
 * genera una página de salida con A a la izquierda y B a la derecha; los
 * píxeles cuya diferencia RGB media supera la tolerancia se pintan de rojo
 * en A y de verde en B. Las páginas se emparejan por índice; las que no
 * tienen par se añaden sin diferencias.
 */
const RENDER_SCALE = 1
const DEFAULT_TOLERANCE = 30

type Pixmap = InstanceType<typeof mupdf.Pixmap>

function renderIfExists(doc: InstanceType<typeof mupdf.PDFDocument>, index: number): Pixmap | null {
  if (index >= doc.countPages()) return null
  const page = doc.loadPage(index)
  try {
    return renderPage(page, RENDER_SCALE)
  } finally {
    page.destroy()
  }
}

/** Copia `source` en `target` a partir de la columna `offsetX`. */
function blit(target: Pixmap, source: Pixmap, offsetX: number): void {
  const dst = target.getPixels()
  const src = source.getPixels()
  const dstStride = target.getStride()
  const srcStride = source.getStride()
  const rowBytes = source.getWidth() * 3
  for (let y = 0; y < source.getHeight(); y++) {
    dst.set(src.subarray(y * srcStride, y * srcStride + rowBytes), y * dstStride + offsetX * 3)
  }
}

function markDifferences(combined: Pixmap, a: Pixmap, b: Pixmap, tolerance: number): void {
  const out = combined.getPixels()
  const pa = a.getPixels()
  const pb = b.getPixels()
  const outStride = combined.getStride()
  const strideA = a.getStride()
  const strideB = b.getStride()
  const offsetB = a.getWidth() * 3
  const width = Math.min(a.getWidth(), b.getWidth())
  const height = Math.min(a.getHeight(), b.getHeight())
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ia = y * strideA + x * 3
      const ib = y * strideB + x * 3
      const diff =
        (Math.abs(pa[ia] - pb[ib]) + Math.abs(pa[ia + 1] - pb[ib + 1]) + Math.abs(pa[ia + 2] - pb[ib + 2])) / 3
      if (diff <= tolerance) continue
      // Rojo en A = lo que había y ya no está. Verde en B = lo nuevo.
      const oa = y * outStride + x * 3
      const ob = oa + offsetB
      out[oa] = 220
      out[oa + 1] = 38
      out[oa + 2] = 38
      out[ob] = 22
      out[ob + 1] = 163
      out[ob + 2] = 74
    }
  }
}

export const run: ToolRun = async (files, values, ctx) => {
  if (files.length < 2) throw new Error(t.errors.compareNeedTwo)

  const [fileA, fileB] = files
  const tolerance = Math.max(0, Math.min(255, Number(values.tolerance) || DEFAULT_TOLERANCE))

  const docA = await readPdf(fileA)
  const blob = await usingPdf(docA, async () =>
    usingPdf(await readPdf(fileB), async (docB) => {
      const output = new mupdf.PDFDocument()
      try {
        const numPages = Math.max(docA.countPages(), docB.countPages())

        for (let i = 0; i < numPages; i++) {
          ctx.onProgress(i / numPages, fmt(t.progress.page, { n: i + 1 }))
          await yieldToUI()

          const a = renderIfExists(docA, i)
          const b = renderIfExists(docB, i)
          const widthA = a?.getWidth() ?? b?.getWidth() ?? 612
          const widthB = b?.getWidth() ?? widthA
          const height = Math.max(a?.getHeight() ?? 0, b?.getHeight() ?? 0) || 792

          const combined = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, widthA + widthB, height], false)
          try {
            combined.clear(255)
            // Las vistas de píxeles apuntan al heap del WASM: se piden después
            // de todas las reservas para que un crecimiento no las invalide.
            if (a) blit(combined, a, 0)
            if (b) blit(combined, b, widthA)
            if (a && b) markDifferences(combined, a, b, tolerance)

            const image = output.addImage(new mupdf.Image(combined))
            const resources = output.addObject({ XObject: { Im0: image } })
            const w = widthA + widthB
            output.insertPage(-1, output.addPage([0, 0, w, height], 0, resources, `q ${w} 0 0 ${height} 0 0 cm /Im0 Do Q`))
          } catch {
            throw new Error(t.errors.compareFailed)
          } finally {
            combined.destroy()
            a?.destroy()
            b?.destroy()
          }
        }
        ctx.onProgress(1, t.progress.done)
        return pdfBlob(output)
      } finally {
        output.destroy()
      }
    }),
  )

  return [{ name: `${baseName(fileA.name)}-vs-${baseName(fileB.name)}.pdf`, blob }]
}

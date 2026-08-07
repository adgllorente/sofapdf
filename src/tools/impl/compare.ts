import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/**
 * Comparación píxel a píxel entre dos PDFs. Por cada par de páginas se
 * genera una página de salida con A a la izquierda y B a la derecha; los
 * píxeles cuya diferencia RGB media supera la tolerancia se pintan de
 * rojo en ambas mitades.
 *
 * Las páginas se emparejan por índice. Si un PDF tiene más páginas que
 * el otro, las sobrantes se añaden tal cual (sin dif porque no tienen
 * par).
 */
const RENDER_SCALE = 1
const DEFAULT_TOLERANCE = 30

export const run: ToolRun = async (files, values, ctx) => {
  if (files.length < 2) throw new Error(t.errors.compareNeedTwo)

  const [fileA, fileB] = files
  const tolerance = Math.max(
    0,
    Math.min(255, Number(values.tolerance) || DEFAULT_TOLERANCE),
  )

  const { pdfjs } = await import('@/lib/pdfjs')
  const dataA = new Uint8Array(await fileA.arrayBuffer())
  const dataB = new Uint8Array(await fileB.arrayBuffer())
  const outputDoc = await PDFDocument.create()

  const taskA = pdfjs.getDocument({ data: dataA })
  const taskB = pdfjs.getDocument({ data: dataB })

  try {
    const docA = await taskA.promise
    const docB = await taskB.promise
    const numPages = Math.max(docA.numPages, docB.numPages)

    for (let i = 1; i <= numPages; i++) {
      ctx.onProgress((i - 1) / numPages, fmt(t.progress.page, { n: i }))

      // Renderiza cada PDF a canvas solo si la página existe. Una página
      // que no tiene par en el otro PDF se añade tal cual desde el original.
      const canvasA = await renderPageIfExists(docA, i)
      const canvasB = await renderPageIfExists(docB, i)

      const widthA = canvasA?.width ?? canvasB?.width ?? 612
      const widthB = canvasB?.width ?? widthA
      const heightA = canvasA?.height ?? canvasB?.height ?? 792
      const heightB = canvasB?.height ?? heightA

      if (!canvasA && !canvasB) continue

      // Página de salida: A a la izquierda, B a la derecha, misma altura.
      const combinedWidth = widthA + widthB
      const combinedHeight = Math.max(heightA, heightB)
      const combined = document.createElement('canvas')
      combined.width = combinedWidth
      combined.height = combinedHeight
      const combinedCtx = combined.getContext('2d', { willReadFrequently: true })
      if (!combinedCtx) throw new Error(t.errors.compareFailed)

      if (canvasA) combinedCtx.drawImage(canvasA, 0, 0)
      if (canvasB) combinedCtx.drawImage(canvasB, widthA, 0)

      // Diff píxel a píxel. Solo donde ambos canvas existen y comparten
      // tamaño: si una página es más grande que la otra, el "extra" no se
      // compara y queda tal cual.
      if (canvasA && canvasB) {
        const sharedW = Math.min(widthA, widthB)
        const sharedH = Math.min(heightA, heightB)
        const overlay = combinedCtx.getImageData(0, 0, combinedWidth, combinedHeight)
        const imgA = canvasA.getContext('2d')!.getImageData(0, 0, sharedW, sharedH)
        const imgB = canvasB.getContext('2d')!.getImageData(0, 0, sharedW, sharedH)

        for (let y = 0; y < sharedH; y++) {
          for (let x = 0; x < sharedW; x++) {
            const i4 = (y * sharedW + x) * 4
            const dr = Math.abs(imgA.data[i4] - imgB.data[i4])
            const dg = Math.abs(imgA.data[i4 + 1] - imgB.data[i4 + 1])
            const db = Math.abs(imgA.data[i4 + 2] - imgB.data[i4 + 2])
            if ((dr + dg + db) / 3 > tolerance) {
              // Rojo en A = lo que había y ya no está. Verde en B = lo nuevo.
              const iA = (y * combinedWidth + x) * 4
              const iB = (y * combinedWidth + (x + widthA)) * 4
              overlay.data[iA] = 220
              overlay.data[iA + 1] = 38
              overlay.data[iA + 2] = 38
              overlay.data[iA + 3] = 255
              overlay.data[iB] = 22
              overlay.data[iB + 1] = 163
              overlay.data[iB + 2] = 74
              overlay.data[iB + 3] = 255
            }
          }
        }
        combinedCtx.putImageData(overlay, 0, 0)
      }

      // A PNG y de ahí al PDF. `toBlob` es async pero barato.
      const blob = await new Promise<Blob | null>((resolve) =>
        combined.toBlob(resolve, 'image/png'),
      )
      if (!blob) throw new Error(t.errors.compareFailed)
      const pngImage = await outputDoc.embedPng(new Uint8Array(await blob.arrayBuffer()))
      const newPage = outputDoc.addPage([combinedWidth, combinedHeight])
      newPage.drawImage(pngImage, { x: 0, y: 0, width: combinedWidth, height: combinedHeight })

      // Liberar los bitmaps antes de la siguiente vuelta.
      if (canvasA) { canvasA.width = 0; canvasA.height = 0 }
      if (canvasB) { canvasB.width = 0; canvasB.height = 0 }
      combined.width = 0
      combined.height = 0
    }
    ctx.onProgress(1, t.progress.done)
  } finally {
    await taskA.destroy()
    await taskB.destroy()
  }

  return [
    {
      name: `${baseName(fileA.name)}-vs-${baseName(fileB.name)}.pdf`,
      blob: toBlob(await outputDoc.save()),
    },
  ]
}

async function renderPageIfExists(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNum: number,
): Promise<HTMLCanvasElement | null> {
  if (pageNum > doc.numPages) return null
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale: RENDER_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    page.cleanup()
    return null
  }
  await page.render({ canvas, viewport }).promise
  page.cleanup()
  return canvas
}

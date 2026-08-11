import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/**
 * OCR con tesseract.js + capa de texto invisible. La página original se
 * rasteriza y se embebe como imagen de fondo; encima se dibuja el texto
 * reconocido con `opacity: 0` para que el PDF resultante sea buscable
 * y seleccionable sin alterar la apariencia visual.
 *
 * El modelo de idioma y los binarios de tesseract se sirven desde
 * `public/tesseract/` (mismo origen), nunca del CDN por defecto de la
 * librería. El import de tesseract.js es dinámico: solo se carga al
 * ejecutar esta herramienta.
 */
const RENDER_SCALE = 2

type Word = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

function flattenWords(data: { blocks?: unknown } | null | undefined): Word[] {
  const words: Word[] = []
  const blocks = (data?.blocks ?? []) as Array<{
    paragraphs?: Array<{ lines?: Array<{ words?: Word[] | null }> }>
  }>
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          if (word?.text?.trim()) words.push(word)
        }
      }
    }
  }
  return words
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const language = String(values.language) === 'eng' ? 'eng' : 'spa'

  // Carga perezosa: tesseract.js pesa y solo lo necesitamos al ejecutar.
  const { createWorker } = await import('tesseract.js')
  const { getPdfDocument } = await import('@/lib/pdfjs')

  const data = new Uint8Array(await file.arrayBuffer())
  const sourceDoc = await PDFDocument.load(data, { ignoreEncryption: true })
  const outputDoc = await PDFDocument.create()
  const font = await outputDoc.embedFont(StandardFonts.Helvetica)

  const task = getPdfDocument(data)
  try {
    const pdfDoc = await task.promise
      const worker = await createWorker(language, 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core.wasm.js',
        // Los modelos .traineddata viven junto al core; el worker resuelve
        // `./{lang}.traineddata` relativo a su propia ubicación.
      })

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        ctx.onProgress((i - 1) / pdfDoc.numPages, fmt(t.progress.page, { n: i }))

        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: RENDER_SCALE })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const canvasCtx = canvas.getContext('2d')
        if (!canvasCtx) throw new Error(t.errors.ocrFailed.replace('{n}', String(i)))

        await page.render({ canvas, viewport }).promise

        // El reconocimiento es la parte que tarda: el worker ya está
        // cargado, así que las páginas siguientes van mucho más rápido.
        let recognized: Awaited<ReturnType<typeof worker.recognize>>
        try {
          recognized = await worker.recognize(canvas)
        } catch {
          throw new Error(t.errors.ocrFailed.replace('{n}', String(i)))
        }

        // Pasa la imagen a PNG y la embebe en la página de salida.
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        )
        canvas.width = 0
        canvas.height = 0
        page.cleanup()

        if (!blob) throw new Error(t.errors.ocrFailed.replace('{n}', String(i)))
        const pngBytes = new Uint8Array(await blob.arrayBuffer())
        const pngImage = await outputDoc.embedPng(pngBytes)

        const [originalPage] = await outputDoc.copyPages(sourceDoc, [i - 1])
        const { width, height } = originalPage.getSize()
        const newPage = outputDoc.addPage([width, height])
        newPage.drawImage(pngImage, { x: 0, y: 0, width, height })

        // Capa de texto invisible para que el PDF sea buscable. tesseract
        // expone las palabras anidadas en blocks[].paragraphs[].lines[]:
        // hay que aplanar el árbol para iterarlas. Las coordenadas están
        // en píxeles de la imagen con y desde arriba; el PDF usa y desde
        // abajo, así que se invierte.
        for (const word of flattenWords(recognized.data)) {
          const wordHeight = word.bbox.y1 - word.bbox.y0
          if (wordHeight <= 0) continue
          newPage.drawText(word.text, {
            x: (word.bbox.x0 / viewport.width) * width,
            y: height - (word.bbox.y1 / viewport.height) * height,
            size: wordHeight,
            font,
            color: rgb(0, 0, 0),
            opacity: 0,
          })
        }
      }
      ctx.onProgress(1, t.progress.done)
    } finally {
      await worker.terminate()
    }
  } finally {
    await task.destroy()
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.ocr}.pdf`,
      blob: toBlob(await outputDoc.save()),
    },
  ]
}

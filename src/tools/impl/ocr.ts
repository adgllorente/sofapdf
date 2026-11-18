import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, renderPage, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/**
 * OCR con tesseract.js + capa de texto invisible. La página original se
 * rasteriza y se embebe como imagen de fondo; encima va el texto reconocido
 * en modo de render 3 (invisible) para que el PDF sea buscable y
 * seleccionable sin alterar la apariencia.
 *
 * El modelo de idioma y los binarios de tesseract se sirven desde
 * `public/tesseract/` (mismo origen), nunca del CDN por defecto de la
 * librería. El import de tesseract.js es dinámico.
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

// La fuente simple «Latin» de MuPDF usa WinAnsiEncoding: Latin-1 coincide con
// Unicode y el tramo 0x80–0x9F lleva la tipografía habitual.
const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99,
}

function winAnsiCode(char: string): number {
  const code = char.codePointAt(0) ?? 0x3f
  if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return code
  return WIN_ANSI_EXTRA[char] ?? 0x3f
}

function hex(code: number): string {
  return code.toString(16).padStart(2, '0')
}

/** Texto invisible escalado en horizontal para cubrir la caja de la palabra. */
function wordOperators(word: Word, font: InstanceType<typeof mupdf.Font>, toX: number, toY: number, pageHeight: number): string {
  const size = (word.bbox.y1 - word.bbox.y0) * toY
  const width = (word.bbox.x1 - word.bbox.x0) * toX
  if (size <= 0 || width <= 0) return ''
  const chars = [...word.text.trim()]
  const advance = chars.reduce((sum, char) => sum + font.advanceGlyph(font.encodeCharacter(char), 0), 0) * size
  const stretch = advance > 0 ? (width / advance) * 100 : 100
  const x = word.bbox.x0 * toX
  const y = pageHeight - word.bbox.y1 * toY
  const codes = chars.map((char) => hex(winAnsiCode(char))).join('')
  return `BT 3 Tr /F1 ${size.toFixed(2)} Tf ${stretch.toFixed(2)} Tz 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${codes}> Tj ET\n`
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const language = String(values.language) === 'eng' ? 'eng' : 'spa'

  // Carga perezosa: tesseract.js pesa y solo lo necesitamos al ejecutar.
  const { createWorker } = await import('tesseract.js')

  const blob = await usingPdf(await readPdf(file), async (source) => {
    const output = new mupdf.PDFDocument()
    const font = new mupdf.Font('Helvetica')
    const fontRef = output.addSimpleFont(font, 'Latin')
    const worker = await createWorker(language, 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core.wasm.js',
      // Los modelos .traineddata viven junto al core; el worker resuelve
      // `./{lang}.traineddata` relativo a su propia ubicación.
    })

    try {
      const total = source.countPages()
      for (let i = 0; i < total; i++) {
        ctx.onProgress(i / total, fmt(t.progress.page, { n: i + 1 }))
        await yieldToUI()

        const page = source.loadPage(i)
        const [x0, y0, x1, y1] = page.getBounds()
        const width = x1 - x0
        const height = y1 - y0
        const pixmap = renderPage(page, RENDER_SCALE)
        page.destroy()

        let words: Word[]
        let image: InstanceType<typeof mupdf.PDFObject>
        const pixelWidth = pixmap.getWidth()
        const pixelHeight = pixmap.getHeight()
        try {
          const png = pixmap.asPNG().slice()
          image = output.addImage(new mupdf.Image(pixmap))
          // El reconocimiento es la parte que tarda: el worker ya está cargado.
          // tesseract.js 5+ solo devuelve `blocks` si se pide: sin él no hay palabras ni capa de texto.
          const recognized = await worker.recognize(
            new Blob([png as BlobPart], { type: 'image/png' }),
            {},
            { blocks: true },
          )
          words = flattenWords(recognized.data)
        } catch {
          throw new Error(fmt(t.errors.ocrFailed, { n: i + 1 }))
        } finally {
          pixmap.destroy()
        }

        // Tesseract mide en píxeles con y hacia abajo; el PDF, en puntos con y hacia arriba.
        const toX = width / pixelWidth
        const toY = height / pixelHeight
        let contents = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q\n`
        for (const word of words) contents += wordOperators(word, font, toX, toY, height)

        const resources = output.addObject({ XObject: { Im0: image }, Font: { F1: fontRef } })
        output.insertPage(-1, output.addPage([0, 0, width, height], 0, resources, contents))
      }
      ctx.onProgress(1, t.progress.done)
      return pdfBlob(output)
    } finally {
      await worker.terminate()
      font.destroy()
      output.destroy()
    }
  })

  return [{ name: `${baseName(file.name)}-${t.filenames.ocr}.pdf`, blob }]
}

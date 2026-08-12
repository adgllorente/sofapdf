import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { getPdfDocument } from '@/lib/pdfjs'
import type { ToolRun } from '@/tools/types'

const WHITE_THRESHOLD = 250
const MAX_RENDER_SIZE = 1600

function pageScale(width: number, height: number): number {
  return Math.min(1, MAX_RENDER_SIZE / Math.max(width, height))
}

async function isBlankPage(document_: import('pdfjs-dist').PDFDocumentProxy, pageNumber: number): Promise<boolean> {
  const page = await document_.getPage(pageNumber)
  const initialViewport = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: pageScale(initialViewport.width, initialViewport.height) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width))
  canvas.height = Math.max(1, Math.ceil(viewport.height))
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    page.cleanup()
    throw new Error(t.errors.blankPagesFailed)
  }

  try {
    // El fondo blanco hace que una página transparente se comporte como una página impresa.
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, viewport }).promise
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index] < WHITE_THRESHOLD ||
        pixels[index + 1] < WHITE_THRESHOLD ||
        pixels[index + 2] < WHITE_THRESHOLD
      ) return false
    }
    return true
  } finally {
    page.cleanup()
    canvas.width = 0
    canvas.height = 0
  }
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const outputDoc = await PDFDocument.load(data)
  const task = getPdfDocument(data)

  try {
    const document_ = await task.promise
    const blankPages: number[] = []
    for (let pageNumber = 1; pageNumber <= document_.numPages; pageNumber++) {
      ctx.onProgress((pageNumber - 1) / document_.numPages, fmt(t.progress.page, { n: pageNumber }))
      if (await isBlankPage(document_, pageNumber)) blankPages.push(pageNumber)
    }

    if (blankPages.length === document_.numPages) throw new Error(t.errors.blankPagesAll)

    ctx.onProgress(0.9, t.progress.removingBlankPages)
    for (let index = blankPages.length - 1; index >= 0; index--) {
      outputDoc.removePage(blankPages[index] - 1)
    }
    const bytes = await outputDoc.save()
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.blankPagesRemoved}.pdf`, blob: toBlob(bytes) }]
  } catch (error) {
    if (error instanceof Error && error.message === t.errors.blankPagesAll) throw error
    throw new Error(t.errors.blankPagesFailed)
  } finally {
    await task.destroy()
  }
}

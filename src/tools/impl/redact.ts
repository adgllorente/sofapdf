import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const RENDER_SCALE = 2

type Region = { id: string; page: number; x: number; y: number; width: number; height: number }

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const raw = String(values.regions ?? '')
  if (!raw) throw new Error(t.errors.redactEmpty)

  let regions: Region[]
  try {
    const parsed = JSON.parse(raw) as Region[]
    regions = parsed.filter(
      (r): r is Region =>
        typeof r?.id === 'string' &&
        typeof r?.page === 'number' &&
        typeof r?.x === 'number' &&
        typeof r?.y === 'number' &&
        typeof r?.width === 'number' &&
        typeof r?.height === 'number',
    )
  } catch {
    throw new Error(t.errors.redactEmpty)
  }
  if (regions.length === 0) throw new Error(t.errors.redactEmpty)

  const data = new Uint8Array(await file.arrayBuffer())
  const sourceDoc = await PDFDocument.load(data, { ignoreEncryption: true })
  const outputDoc = await PDFDocument.create()

  // Páginas que hay que re-rasterizar: solo las que tengan al menos una
  // región. El resto se copian tal cual desde el documento original.
  const pagesToRedact = new Set(regions.map((r) => r.page))

  // pdfjs se usa dentro de un try/finally para destruir el worker al final,
  // aunque haya error a mitad del proceso.
  const { pdfjs } = await import('@/lib/pdfjs')
  const task = pdfjs.getDocument({ data })
  const rendered = new Map<number, Uint8Array>()

  try {
    const pdfDoc = await task.promise
    const sortedPages = [...pagesToRedact]
      .filter((p) => p >= 1 && p <= pdfDoc.numPages)
      .sort((a, b) => a - b)

    for (let i = 0; i < sortedPages.length; i++) {
      const pageNum = sortedPages[i]
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const canvasCtx = canvas.getContext('2d')
      if (!canvasCtx) throw new Error(t.errors.redactFailed)

      await page.render({ canvas, viewport }).promise

      // Dibuja cada rectángulo como un cuadrado negro opaco sobre el canvas.
      // Al exportar el canvas a PNG, las áreas quedan como píxeles negros
      // y el texto bajo ellas deja de existir en el PDF resultante.
      canvasCtx.fillStyle = '#000000'
      for (const region of regions.filter((r) => r.page === pageNum)) {
        canvasCtx.fillRect(
          region.x * canvas.width,
          region.y * canvas.height,
          region.width * canvas.width,
          region.height * canvas.height,
        )
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      // Limpieza inmediata: el bitmap puede ocupar varios MB a 2×.
      canvas.width = 0
      canvas.height = 0
      page.cleanup()

      if (!blob) throw new Error(t.errors.redactFailed)
      rendered.set(pageNum, new Uint8Array(await blob.arrayBuffer()))
      ctx.onProgress((i + 1) / sortedPages.length, fmt(t.progress.page, { n: pageNum }))
    }
  } finally {
    await task.destroy()
  }

  // Construye el documento de salida. Las páginas censuradas se sustituyen
  // por la imagen del canvas; las demás se copian tal cual.
  for (let i = 0; i < sourceDoc.getPageCount(); i++) {
    const pageNum = i + 1
    const sourcePage = sourceDoc.getPages()[i]
    const { width, height } = sourcePage.getSize()

    if (rendered.has(pageNum)) {
      const pngBytes = rendered.get(pageNum)!
      const pngImage = await outputDoc.embedPng(pngBytes)
      const newPage = outputDoc.addPage([width, height])
      newPage.drawImage(pngImage, { x: 0, y: 0, width, height })
    } else {
      const [copied] = await outputDoc.copyPages(sourceDoc, [i])
      outputDoc.addPage(copied)
    }
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.redacted}.pdf`,
      blob: toBlob(await outputDoc.save()),
    },
  ]
}

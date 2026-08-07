import { PDFDocument, PDFName, JpegEmbedder, PDFNumber, PDFRawStream } from 'pdf-lib/es'
import type { PDFRef } from 'pdf-lib/es'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type ImageSettings = {
  scale: number
  quality: number
}

const PRESETS: Record<string, ImageSettings> = {
  light: { scale: 0.9, quality: 0.85 },
  balanced: { scale: 0.7, quality: 0.75 },
  max: { scale: 0.5, quality: 0.6 },
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

async function recompressJpeg(
  bytes: Uint8Array,
  width: number,
  height: number,
  settings: ImageSettings,
): Promise<Uint8Array | null> {
  const newWidth = Math.max(1, Math.round(width * settings.scale))
  const newHeight = Math.max(1, Math.round(height * settings.scale))

  const bitmap = await createImageBitmap(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/jpeg' }))
  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
  bitmap.close()

  const blob = await canvasToJpeg(canvas, settings.quality)
  canvas.width = 0
  canvas.height = 0
  if (!blob) return null

  return new Uint8Array(await blob.arrayBuffer())
}

async function tryRecompressImage(
  pdfDoc: PDFDocument,
  ref: PDFRef,
  stream: PDFRawStream,
  settings: ImageSettings,
): Promise<boolean> {
  const widthObj = stream.dict.lookup(PDFName.of('Width'))
  const heightObj = stream.dict.lookup(PDFName.of('Height'))
  const width = widthObj instanceof PDFNumber ? widthObj.asNumber() : 0
  const height = heightObj instanceof PDFNumber ? heightObj.asNumber() : 0
  if (!width || !height) return false

  const original = stream.contents
  const recompressed = await recompressJpeg(original, width, height, settings)
  if (!recompressed || recompressed.length >= original.length) return false

  const embedder = await JpegEmbedder.for(recompressed)
  await embedder.embedIntoContext(pdfDoc.context, ref)
  return true
}

async function compressEmbeddedImages(
  pdfDoc: PDFDocument,
  settings: ImageSettings,
  onProgress: (ratio: number) => void,
) {
  const images: { ref: PDFRef; stream: PDFRawStream }[] = []
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      const subtype = obj.dict.lookup(PDFName.of('Subtype'))
      const filter = obj.dict.lookup(PDFName.of('Filter'))
      if (subtype === PDFName.of('Image') && filter === PDFName.of('DCTDecode')) {
        images.push({ ref, stream: obj })
      }
    }
  }

  let recompressed = 0
  for (const [index, { ref, stream }] of images.entries()) {
    onProgress((index + 1) / images.length)
    try {
      const ok = await tryRecompressImage(pdfDoc, ref, stream, settings)
      if (ok) recompressed++
    } catch {
      // Si una imagen individual no puede re-encodearse, continuamos con las demás.
    }
  }
  return recompressed
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const settings = PRESETS[values.level as string] ?? PRESETS.balanced

  ctx.onProgress(0.1, t.progress.readingPdf)
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })

  ctx.onProgress(0.25, t.progress.compressingImages)
  await compressEmbeddedImages(pdfDoc, settings, (ratio) => ctx.onProgress(0.25 + ratio * 0.55))

  ctx.onProgress(0.85, t.progress.writingPdf)
  const bytes = await pdfDoc.save({ useObjectStreams: true })

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.compressed}.pdf`, blob: toBlob(bytes) }]
}

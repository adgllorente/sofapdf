import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type ImageSettings = {
  scale: number
  /** 0..100, como lo espera `asJPEG`. */
  quality: number
}

const PRESETS: Record<string, ImageSettings> = {
  light: { scale: 0.9, quality: 85 },
  balanced: { scale: 0.7, quality: 75 },
  max: { scale: 0.5, quality: 60 },
}

/** Por debajo de esto una imagen suele ser un icono o un trazo: no compensa tocarla. */
const MIN_PIXELS = 64 * 64

const SAVE_OPTIONS = 'garbage=deduplicate,compress,compress-fonts,compress-images,objstms,encrypt=none'

/**
 * Solo se re-encodean imágenes en gris o RGB. Las CMYK cambian de color según
 * el lector al pasar por JPEG, las indexadas y separaciones dependen de su
 * paleta, y las de 1 bit (máscaras, faxes) quedan peor en JPEG que en CCITT/JBIG2.
 */
function isRecompressible(dict: mupdf.PDFObject): boolean {
  if (dict.get('ImageMask').valueOf() === true) return false
  if (dict.get('BitsPerComponent').valueOf() === 1) return false
  // Una máscara por rango de color exige valores exactos que el JPEG no conserva.
  if (dict.get('Mask').isArray()) return false
  const filter = dict.get('Filter')
  const name = filter.isArray() ? filter.get(filter.length - 1) : filter
  if (name.isName() && ['JBIG2Decode', 'CCITTFaxDecode', 'JPXDecode'].includes(name.asName())) return false
  return true
}

function jpegColorSpace(image: mupdf.Image): mupdf.ColorSpace | null {
  const cs = image.getColorSpace()
  if (!cs) return null
  if (cs.isGray()) return mupdf.ColorSpace.DeviceGray
  if (cs.isRGB()) return mupdf.ColorSpace.DeviceRGB
  return null
}

/** Dibuja la imagen al tamaño nuevo: el remuestreo de MuPDF es mejor que tirar píxeles. */
function resample(image: mupdf.Image, cs: mupdf.ColorSpace, width: number, height: number): mupdf.Pixmap {
  const pixmap = new mupdf.Pixmap(cs, [0, 0, width, height], false)
  pixmap.clear(255)
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap)
  try {
    device.fillImage(image, [width, 0, 0, height, 0, 0], 1)
    device.close()
  } finally {
    device.destroy()
  }
  return pixmap
}

function recompress(doc: mupdf.PDFDocument, ref: mupdf.PDFObject, settings: ImageSettings): boolean {
  const dict = ref.resolve()
  if (!isRecompressible(dict)) return false

  const image = doc.loadImage(ref)
  try {
    const width = image.getWidth()
    const height = image.getHeight()
    const cs = jpegColorSpace(image)
    if (!cs || width * height < MIN_PIXELS) return false

    const newWidth = Math.max(1, Math.round(width * settings.scale))
    const newHeight = Math.max(1, Math.round(height * settings.scale))
    const pixmap = resample(image, cs, newWidth, newHeight)
    let jpeg: Uint8Array
    try {
      jpeg = pixmap.asJPEG(settings.quality, false).slice()
    } finally {
      pixmap.destroy()
    }

    const original = ref.readRawStream()
    const originalSize = original.getLength()
    original.destroy()
    if (jpeg.length >= originalSize) return false

    // La SMask es un objeto aparte y se conserva; Decode ya va aplicado en los píxeles.
    ref.writeRawStream(jpeg)
    dict.put('Filter', doc.newName('DCTDecode'))
    dict.put('Width', newWidth)
    dict.put('Height', newHeight)
    dict.put('BitsPerComponent', 8)
    dict.put('ColorSpace', doc.newName(cs.isGray() ? 'DeviceGray' : 'DeviceRGB'))
    dict.delete('DecodeParms')
    dict.delete('Decode')
    return true
  } finally {
    image.destroy()
  }
}

function findImages(doc: mupdf.PDFDocument): mupdf.PDFObject[] {
  const images: mupdf.PDFObject[] = []
  for (let num = 1; num < doc.countObjects(); num++) {
    // `isStream` solo responde bien sobre la referencia indirecta, no sobre el objeto resuelto.
    const ref = doc.newIndirect(num)
    if (ref.isStream() && ref.get('Subtype').valueOf() === 'Image') images.push(ref)
  }
  return images
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const settings = PRESETS[values.level as string] ?? PRESETS.balanced

  ctx.onProgress(0.1, t.progress.readingPdf)
  return usingPdf(await readPdf(file), async (doc) => {
    ctx.onProgress(0.25, t.progress.compressingImages)
    await yieldToUI()
    const images = findImages(doc)
    for (const [index, ref] of images.entries()) {
      try {
        recompress(doc, ref, settings)
      } catch {
        // Si una imagen no se deja decodificar, se queda como estaba.
      }
      ctx.onProgress(
        0.25 + ((index + 1) / images.length) * 0.55,
        fmt(t.progress.image, { n: index + 1, total: images.length }),
      )
      await yieldToUI()
    }

    ctx.onProgress(0.85, t.progress.writingPdf)
    await yieldToUI()
    const blob = pdfBlob(doc, SAVE_OPTIONS)
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.compressed}.pdf`, blob }]
  })
}

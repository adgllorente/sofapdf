import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PdfObject = InstanceType<typeof mupdf.PDFObject>
type PdfDoc = InstanceType<typeof mupdf.PDFDocument>

const JPEG_QUALITY = 92

function luminance(red: number, green: number, blue: number): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function grayFromCmyk(cyan: number, magenta: number, yellow: number, black: number): number {
  return luminance(1 - Math.min(1, cyan + black), 1 - Math.min(1, magenta + black), 1 - Math.min(1, yellow + black))
}

function number(value: string): number {
  return Number.parseFloat(value)
}

function format(value: number): string {
  return Math.max(0, Math.min(1, value)).toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
}

/** Convierte los operadores de color básicos sin tocar los operadores de texto. */
function convertContentColors(content: string): string {
  const cmyk = /(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(k|K|sc|SC|scn|SCN)(?=\s|$)/g
  content = content.replace(cmyk, (_, cyan, magenta, yellow, black, operator: string) => {
    const gray = grayFromCmyk(number(cyan), number(magenta), number(yellow), number(black))
    return `${format(gray)} ${operator === operator.toUpperCase() ? 'G' : 'g'}`
  })
  const rgb = /(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(rg|RG|sc|SC|scn|SCN)(?=\s|$)/g
  return content.replace(rgb, (_, red, green, blue, operator: string) => {
    const gray = luminance(number(red), number(green), number(blue))
    return `${format(gray)} ${operator === operator.toUpperCase() ? 'G' : 'g'}`
  })
}

function nameOf(object: PdfObject): string | null {
  return object.isName() ? object.asName() : null
}

/** Último filtro de la cadena: el que define el códec de la imagen. */
function codec(stream: PdfObject): string | null {
  const filter = stream.get('Filter')
  if (filter.isArray()) return filter.length > 0 ? nameOf(filter.get(filter.length - 1)) : null
  return nameOf(filter)
}

// Latin-1 byte a byte: UTF-8 o windows-1252 alterarían los bytes binarios de
// las imágenes inline al volver a escribir el stream.
function latin1Decode(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return text
}

function latin1Encode(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

function convertContentStream(stream: PdfObject): void {
  const decoded = stream.readStream()
  let content: string
  try {
    content = latin1Decode(decoded.asUint8Array())
  } finally {
    decoded.destroy()
  }
  const converted = convertContentColors(content)
  // Al reescribir el stream MuPDF quita el filtro; el guardado vuelve a comprimir.
  if (converted !== content) stream.writeStream(latin1Encode(converted))
}

/** Sustituye la imagen por su versión en gris conservando el objeto y su SMask. */
function convertImage(doc: PdfDoc, stream: PdfObject): void {
  if (stream.get('ImageMask').isBoolean() && stream.get('ImageMask').asBoolean()) return
  const image = doc.loadImage(stream)
  try {
    const colorspace = image.getColorSpace()
    if (!colorspace || colorspace.isGray()) return
    const source = image.toPixmap()
    const gray = source.convertToColorSpace(mupdf.ColorSpace.DeviceGray, false)
    source.destroy()
    try {
      const wasJpeg = codec(stream) === 'DCTDecode' || codec(stream) === 'JPXDecode'
      for (const key of ['Filter', 'DecodeParms', 'Decode', 'ColorSpace', 'BitsPerComponent']) stream.delete(key)
      // Un color key se expresa en el espacio de color original: deja de valer en gris.
      if (stream.get('Mask').isArray()) stream.delete('Mask')
      stream.put('ColorSpace', doc.newName('DeviceGray'))
      stream.put('BitsPerComponent', 8)
      stream.put('Width', gray.getWidth())
      stream.put('Height', gray.getHeight())
      if (wasJpeg) {
        stream.writeRawStream(gray.asJPEG(JPEG_QUALITY).slice())
        stream.put('Filter', doc.newName('DCTDecode'))
      } else {
        stream.writeStream(packedSamples(gray))
      }
    } finally {
      gray.destroy()
    }
  } finally {
    image.destroy()
  }
}

/** Muestras de 8 bits sin el relleno de fila que pueda llevar el pixmap. */
function packedSamples(pixmap: InstanceType<typeof mupdf.Pixmap>): Uint8Array {
  const width = pixmap.getWidth()
  const height = pixmap.getHeight()
  const stride = pixmap.getStride()
  const pixels = pixmap.getPixels()
  if (stride === width) return pixels.slice() as unknown as Uint8Array
  const packed = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) packed.set(pixels.subarray(y * stride, y * stride + width), y * width)
  return packed
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  ctx.onProgress(0.05, t.progress.readingPdf)
  await yieldToUI()

  const blob = await usingPdf(await readPdf(file), async (doc) => {
    const contents: PdfObject[] = []
    const images: PdfObject[] = []
    for (let num = 1; num < doc.countObjects(); num++) {
      const object = doc.newIndirect(num)
      if (!object.isStream()) continue
      const subtype = nameOf(object.get('Subtype'))
      if (subtype === 'Image') images.push(object)
      else if (!subtype || subtype === 'Form') contents.push(object)
    }

    for (const stream of contents) {
      try {
        convertContentStream(stream)
      } catch {
        // Un stream que no se deja decodificar se queda como estaba.
      }
    }

    ctx.onProgress(0.35, t.progress.grayscalingImages)
    for (const [index, stream] of images.entries()) {
      try {
        convertImage(doc, stream)
      } catch {
        // Las imágenes no compatibles conservan su formato original.
      }
      ctx.onProgress(
        0.35 + ((index + 1) / Math.max(1, images.length)) * 0.5,
        fmt(t.progress.image, { n: index + 1, total: images.length }),
      )
      await yieldToUI()
    }

    ctx.onProgress(0.9, t.progress.writingPdf)
    await yieldToUI()
    return pdfBlob(doc)
  })

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.grayscale}.pdf`, blob }]
}

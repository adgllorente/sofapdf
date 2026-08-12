import { PDFArray, PDFDocument, PDFName, PDFNumber, PDFRawStream, JpegEmbedder } from 'pdf-lib/es'
import { decodePDFRawStream } from 'pdf-lib/es/core'
import { JpxImage } from 'pdfjs-dist/image_decoders/pdf.image_decoders.mjs'
import type { PDFRef } from 'pdf-lib/es'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { wasmUrl } from '@/lib/pdfjs'
import type { ToolRun } from '@/tools/types'

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
function convertContentColors(bytes: Uint8Array): Uint8Array {
  let content = new TextDecoder('latin1').decode(bytes)
  const cmyk = /(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(k|K|sc|SC|scn|SCN)(?=\s|$)/g
  content = content.replace(cmyk, (_, cyan, magenta, yellow, black, operator: string) => {
    const gray = grayFromCmyk(number(cyan), number(magenta), number(yellow), number(black))
    return `${format(gray)} ${operator === operator.toUpperCase() ? 'G' : 'g'}`
  })
  const rgb = /(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(-?(?:\d*\.)?\d+)\s+(rg|RG|sc|SC|scn|SCN)(?=\s|$)/g
  content = content.replace(rgb, (_, red, green, blue, operator: string) => {
    const gray = luminance(number(red), number(green), number(blue))
    return `${format(gray)} ${operator === operator.toUpperCase() ? 'G' : 'g'}`
  })
  return new TextEncoder().encode(content)
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

async function grayscaleJpeg(bytes: Uint8Array, width: number, height: number): Promise<Uint8Array | null> {
  const bitmap = await createImageBitmap(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/jpeg' }))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return null
  }
  context.filter = 'grayscale(1)'
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  canvas.width = 0
  canvas.height = 0
  return result ? new Uint8Array(await result.arrayBuffer()) : null
}

async function grayscaleJpx(bytes: Uint8Array, width: number, height: number): Promise<Uint8Array | null> {
  JpxImage.setOptions({ useWasm: true, useWorkerFetch: false, wasmUrl })
  const decoded = await JpxImage.instance.decode(bytes, { numComponents: 3 })
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let source = 0, target = 0; target < pixels.length; source += 3, target += 4) {
    const gray = luminance(decoded[source], decoded[source + 1], decoded[source + 2])
    pixels[target] = gray
    pixels[target + 1] = gray
    pixels[target + 2] = gray
    pixels[target + 3] = 255
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
  const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  canvas.width = 0
  canvas.height = 0
  return result ? new Uint8Array(await result.arrayBuffer()) : null
}

function imageCodec(stream: PDFRawStream): PDFName | undefined {
  const filter = stream.dict.lookup(PDFName.of('Filter'))
  if (filter instanceof PDFName) return filter
  if (filter instanceof PDFArray && filter.size() > 0) {
    return filter.lookup(filter.size() - 1, PDFName)
  }
  return undefined
}

function imageBytes(stream: PDFRawStream): Uint8Array {
  const filter = stream.dict.lookup(PDFName.of('Filter'))
  if (!(filter instanceof PDFArray) || filter.size() < 2) return stream.contents

  // Algunos exportadores envuelven el JPEG en Flate para el transporte del objeto.
  const first = filter.lookup(0, PDFName)
  if (first !== PDFName.of('FlateDecode')) return stream.contents
  const dict = stream.dict.clone()
  dict.set(PDFName.of('Filter'), first)
  const params = stream.dict.lookup(PDFName.of('DecodeParms'))
  if (params instanceof PDFArray) {
    const firstParams = params.lookup(0)
    if (firstParams) dict.set(PDFName.of('DecodeParms'), firstParams)
    else dict.delete(PDFName.of('DecodeParms'))
  } else dict.delete(PDFName.of('DecodeParms'))
  return decodePDFRawStream(PDFRawStream.of(dict, stream.contents)).decode()
}

async function convertImages(document_: PDFDocument, onProgress: (ratio: number) => void): Promise<void> {
  const images: { ref: PDFRef; stream: PDFRawStream }[] = []
  for (const [ref, object] of document_.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue
    if (object.dict.lookup(PDFName.of('Subtype')) !== PDFName.of('Image')) continue
    const codec = imageCodec(object)
    if (codec !== PDFName.of('DCTDecode') && codec !== PDFName.of('JPXDecode')) continue
    images.push({ ref, stream: object })
  }
  for (const [index, image] of images.entries()) {
    const width = image.stream.dict.lookup(PDFName.of('Width'))
    const height = image.stream.dict.lookup(PDFName.of('Height'))
    const widthValue = width instanceof PDFNumber ? width.asNumber() : 0
    const heightValue = height instanceof PDFNumber ? height.asNumber() : 0
    if (widthValue && heightValue) {
      try {
        const codec = imageCodec(image.stream)
        const bytes = imageBytes(image.stream)
        const gray = codec === PDFName.of('JPXDecode')
          ? await grayscaleJpx(bytes, widthValue, heightValue)
          : await grayscaleJpeg(bytes, widthValue, heightValue)
        if (gray) {
          const embedder = await JpegEmbedder.for(gray)
          await embedder.embedIntoContext(document_.context, image.ref)
        }
      } catch {
        // Las imágenes no compatibles conservan su formato original.
      }
    }
    onProgress((index + 1) / Math.max(1, images.length))
  }
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  ctx.onProgress(0.05, t.progress.readingPdf)
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })

  const streams = [...document_.context.enumerateIndirectObjects()]
    .filter(([, object]) => {
      if (!(object instanceof PDFRawStream)) return false
      const subtype = object.dict.lookup(PDFName.of('Subtype'))
      return !subtype || subtype === PDFName.of('Form')
    })
  for (const [ref, object] of streams) {
    if (!(object instanceof PDFRawStream)) continue
    let decoded: Uint8Array
    try {
      decoded = decodePDFRawStream(object).decode()
    } catch {
      continue
    }
    const converted = convertContentColors(decoded)
    if (!sameBytes(decoded, converted)) {
      // Se escribe sin filtro porque el contenido ya se ha decodificado.
      const dict = object.dict.clone(document_.context)
      dict.delete(PDFName.of('Filter'))
      dict.delete(PDFName.of('DecodeParms'))
      document_.context.assign(ref, PDFRawStream.of(dict, converted))
    }
  }

  ctx.onProgress(0.35, t.progress.grayscalingImages)
  await convertImages(document_, (ratio) => ctx.onProgress(0.35 + ratio * 0.5))
  ctx.onProgress(0.9, t.progress.writingPdf)
  const bytes = await document_.save()
  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.grayscale}.pdf`, blob: toBlob(bytes) }]
}

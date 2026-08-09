import { fmt, t } from '@/i18n'
import { pdfjs } from '@/lib/pdfjs'
import { baseName, padIndex } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

type ImageObject = {
  width: number
  height: number
  data?: Uint8Array | Uint8ClampedArray
  bitmap?: ImageBitmap
  kind?: number
}

type PDFObjectStore = {
  get: (id: string, callback: (value: unknown) => void) => unknown
}

function getResolvedImage(store: PDFObjectStore, key: string): Promise<ImageObject | undefined> {
  return new Promise((resolve) => {
    try {
      store.get(key, (value) => resolve(value as ImageObject))
    } catch {
      resolve(undefined)
    }
  })
}

function putImage(ctx: CanvasRenderingContext2D, image: ImageObject): boolean {
  if (image.bitmap) {
    ctx.drawImage(image.bitmap, 0, 0, image.bitmap.width, image.bitmap.height)
    return true
  }

  if (!image.width || !image.height) return false

  if (!image.data) return false
  const { width, height, data } = image
  const rgba = new Uint8ClampedArray(width * height * 4)

  if (data.length === rgba.length) {
    rgba.set(data)
  } else if (data.length === width * height * 3) {
    for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
      rgba[target] = data[source]
      rgba[target + 1] = data[source + 1]
      rgba[target + 2] = data[source + 2]
      rgba[target + 3] = 255
    }
  } else if (data.length === width * height) {
    for (let source = 0, target = 0; source < data.length; source++, target += 4) {
      rgba[target] = data[source]
      rgba[target + 1] = data[source]
      rgba[target + 2] = data[source]
      rgba[target + 3] = 255
    }
  } else if (image.kind === pdfjs.ImageKind.GRAYSCALE_1BPP && data.length === Math.ceil(width * height / 8)) {
    for (let pixel = 0; pixel < width * height; pixel++) {
      const value = data[Math.floor(pixel / 8)] & (128 >> (pixel % 8)) ? 255 : 0
      const target = pixel * 4
      rgba[target] = value
      rgba[target + 1] = value
      rgba[target + 2] = value
      rgba[target + 3] = 255
    }
  } else {
    return false
  }

  ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  return true
}

async function imageToPng(image: ImageObject): Promise<Blob | null> {
  const width = image.bitmap?.width ?? image.width
  const height = image.bitmap?.height ?? image.height
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx || !putImage(ctx, image)) {
    canvas.width = 0
    canvas.height = 0
    return null
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  image.bitmap?.close()
  canvas.width = 0
  canvas.height = 0
  return blob
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const document_ = await task.promise
  const outputs: OutputFile[] = []
  const seen = new Set<string>()
  const stem = baseName(file.name)

  try {
    for (let pageNumber = 1; pageNumber <= document_.numPages; pageNumber++) {
      ctx.onProgress((pageNumber - 1) / document_.numPages, fmt(t.progress.page, { n: pageNumber }))
      const page = await document_.getPage(pageNumber)
      const operatorList = await page.getOperatorList()

      for (let index = 0; index < operatorList.fnArray.length; index++) {
        const fn = operatorList.fnArray[index]
        const args = operatorList.argsArray[index] as unknown[]
        let image: ImageObject | undefined
        let key: string | undefined

        if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintImageXObjectRepeat) {
          key = String(args[0])
          const store = key.startsWith('g_') ? page.commonObjs : page.objs
          image = await getResolvedImage(store, key)
        } else if (fn === pdfjs.OPS.paintInlineImageXObject || fn === pdfjs.OPS.paintInlineImageXObjectGroup) {
          image = args[0] as ImageObject
          key = `inline-${pageNumber}-${index}`
        }

        if (!image || !key || seen.has(key)) continue
        seen.add(key)
        const blob = await imageToPng(image)
        if (blob) {
          outputs.push({
            name: `${stem}-${t.filenames.extractedImages}-${padIndex(outputs.length + 1, 3)}.png`,
            blob,
          })
        }
      }

      page.cleanup()
    }
  } finally {
    await task.destroy()
  }

  if (outputs.length === 0) throw new Error(t.errors.noImages)
  ctx.onProgress(1, t.progress.done)
  return outputs
}

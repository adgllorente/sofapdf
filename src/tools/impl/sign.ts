import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const dataUrl = String(values.signatureDataUrl ?? '')
  if (!dataUrl) throw new Error(t.errors.signatureEmpty)

  const width = Number(values.signatureWidth) || 120
  const xPct = Number(values.x) || 70
  const yPct = Number(values.y) || 12
  const pageNum = Math.max(1, Math.floor(Number(values.page) || 1))
  const applyAll = String(values.applyTo) === 'all'

  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pages = document_.getPages()

  const bytes = await dataUrlToBytes(dataUrl)
  // El preview produce PNG; una imagen subida por el usuario puede ser JPEG.
  const image = dataUrl.startsWith('data:image/jpeg')
    ? await document_.embedJpg(bytes)
    : await document_.embedPng(bytes)
  const aspect = image.height / image.width
  const height = width * aspect

  const targets = applyAll ? pages.map((_, i) => i) : [clampIndex(pageNum - 1, pages.length)]

  for (const [index, pageIndex] of targets.entries()) {
    const page = pages[pageIndex]
    const { width: pw } = page.getSize()
    // xPct e yPct son el centro de la firma: el lienzo va de 0 a 100.
    const cx = (xPct / 100) * pw
    const cy = (yPct / 100) * page.getHeight()
    page.drawImage(image, {
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
    })
    ctx.onProgress((index + 1) / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.signed}.pdf`,
      blob: toBlob(await document_.save()),
    },
  ]
}

function clampIndex(index: number, total: number): number {
  return Math.max(0, Math.min(total - 1, index))
}

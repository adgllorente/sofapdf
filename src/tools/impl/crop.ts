import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const x = clamp(Number(values.x) || 0, 0, 1)
  const y = clamp(Number(values.y) || 0, 0, 1)
  const width = clamp(Number(values.width) || 1, 0, 1)
  const height = clamp(Number(values.height) || 1, 0, 1)
  const applyAll = String(values.applyTo) !== 'one'
  const selectedPage = Math.max(1, Math.floor(Number(values.page) || 1))

  if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
    throw new Error(t.errors.cropEmpty)
  }

  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pages = document_.getPages()

  for (const [index, page] of pages.entries()) {
    if (!applyAll && index + 1 !== selectedPage) continue
    const { width: pw, height: ph } = page.getSize()
    // La preview mide `y` desde arriba; el sistema de coordenadas del PDF
    // va de abajo arriba, así que hay que invertir: la esquina inferior
    // del recorte está a `(1 - y - height)` desde la base de la página.
    page.setCropBox(
      x * pw,
      (1 - y - height) * ph,
      width * pw,
      height * ph,
    )
    ctx.onProgress((index + 1) / pages.length, fmt(t.progress.page, { n: index + 1 }))
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.cropped}.pdf`,
      blob: toBlob(await document_.save()),
    },
  ]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

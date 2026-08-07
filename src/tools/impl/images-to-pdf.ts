import { PDFDocument } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import type { ToolRun } from '@/tools/types'

/** Tamaños en puntos PostScript (1 pt = 1/72"). */
const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

export const run: ToolRun = async (files, values, ctx) => {
  const document_ = await PDFDocument.create()
  const sizeKey = String(values.pageSize)
  const margin = Number(values.margin)
  const landscape = Boolean(values.landscape)

  for (const [index, file] of files.entries()) {
    ctx.onProgress(index / files.length, file.name)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name)
    const image = isPng ? await document_.embedPng(bytes) : await document_.embedJpg(bytes)

    if (sizeKey === 'fit') {
      // La página adopta el tamaño exacto de la imagen: sin bandas ni reescalado.
      const page = document_.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      continue
    }

    const [w, h] = PAGE_SIZES[sizeKey] ?? PAGE_SIZES.a4
    const [pageWidth, pageHeight] = landscape ? [h, w] : [w, h]
    const page = document_.addPage([pageWidth, pageHeight])

    const boxWidth = pageWidth - margin * 2
    const boxHeight = pageHeight - margin * 2
    const scale = Math.min(boxWidth / image.width, boxHeight / image.height)
    const width = image.width * scale
    const height = image.height * scale

    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    })
  }

  if (document_.getPageCount() === 0) throw new Error(t.errors.noImages)
  return [{ name: `${t.filenames.images}.pdf`, blob: toBlob(await document_.save()) }]
}

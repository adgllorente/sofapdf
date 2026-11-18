import { t } from '@/i18n'
import { mupdf, pdfBlob, yieldToUI } from '@/lib/mupdf'
import { num } from '@/lib/overlay'
import type { ToolRun } from '@/tools/types'

/** Tamaños en puntos PostScript (1 pt = 1/72"). */
const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

export const run: ToolRun = async (files, values, ctx) => {
  const doc = new mupdf.PDFDocument()
  const sizeKey = String(values.pageSize)
  const margin = Number(values.margin)
  const landscape = Boolean(values.landscape)

  try {
    for (const [index, file] of files.entries()) {
      ctx.onProgress(index / files.length, file.name)
      await yieldToUI()
      let image: mupdf.Image
      try {
        image = new mupdf.Image(new Uint8Array(await file.arrayBuffer()))
      } catch {
        // Una imagen ilegible no tumba el resto; si no queda ninguna, se avisa abajo.
        continue
      }
      const imageWidth = image.getWidth()
      const imageHeight = image.getHeight()
      const ref = doc.addImage(image)
      image.destroy()

      let pageWidth = imageWidth
      let pageHeight = imageHeight
      let box = { x: 0, y: 0, width: imageWidth, height: imageHeight }
      // Con «fit» la página adopta el tamaño exacto de la imagen: sin bandas ni reescalado.
      if (sizeKey !== 'fit') {
        const [w, h] = PAGE_SIZES[sizeKey] ?? PAGE_SIZES.a4
        ;[pageWidth, pageHeight] = landscape ? [h, w] : [w, h]
        const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight)
        const width = imageWidth * scale
        const height = imageHeight * scale
        box = { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height }
      }

      const contents = `q ${num(box.width)} 0 0 ${num(box.height)} ${num(box.x)} ${num(box.y)} cm /Im0 Do Q`
      const page = doc.addPage([0, 0, pageWidth, pageHeight], 0, { XObject: { Im0: ref } }, contents)
      doc.insertPage(-1, page)
    }

    if (doc.countPages() === 0) throw new Error(t.errors.noImages)
    return [{ name: `${t.filenames.images}.pdf`, blob: pdfBlob(doc) }]
  } finally {
    doc.destroy()
  }
}

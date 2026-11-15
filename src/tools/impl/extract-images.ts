import { fmt, t } from '@/i18n'
import { mupdf, pixmapToPng, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName, padIndex } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

type PdfObject = InstanceType<typeof mupdf.PDFObject>
type PdfDoc = InstanceType<typeof mupdf.PDFDocument>

/** Recorre los XObject de imagen, entrando en los formularios anidados. */
function collectImages(resources: PdfObject, seen: Set<number>, found: PdfObject[]): void {
  // `get` sobre el objeto nulo de MuPDF lanza: una página puede no tener recursos.
  if (!resources.isDictionary()) return
  const xobjects = resources.get('XObject')
  if (!xobjects.isDictionary()) return
  xobjects.forEach((ref) => {
    if (!ref.isDictionary()) return
    // Sin número de objeto no hay forma de deduplicar; son raros y se aceptan.
    const id = ref.isIndirect() ? ref.asIndirect() : -1
    if (id >= 0 && seen.has(id)) return
    if (id >= 0) seen.add(id)
    const subtype = ref.get('Subtype')
    if (subtype.isName() && subtype.asName() === 'Image') found.push(ref)
    else if (subtype.isName() && subtype.asName() === 'Form') collectImages(ref.get('Resources'), seen, found)
  })
}

function imageToPng(doc: PdfDoc, ref: PdfObject): Uint8Array | null {
  const image = doc.loadImage(ref)
  try {
    let pixmap = image.toPixmap()
    const colorspace = pixmap.getColorSpace()
    // PNG solo admite gris o RGB; las máscaras de stencil no tienen color propio.
    if (!colorspace) {
      pixmap.destroy()
      return null
    }
    if (!colorspace.isGray() && !colorspace.isRGB()) {
      const rgb = pixmap.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false)
      pixmap.destroy()
      pixmap = rgb
    }
    return pixmapToPng(pixmap)
  } finally {
    image.destroy()
  }
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const stem = baseName(file.name)

  const outputs = await usingPdf(await readPdf(file), async (doc) => {
    const total = doc.countPages()
    const seen = new Set<number>()
    const results: OutputFile[] = []

    for (let i = 0; i < total; i++) {
      ctx.onProgress(i / total, fmt(t.progress.page, { n: i + 1 }))
      await yieldToUI()

      const page = doc.loadPage(i)
      const refs: PdfObject[] = []
      collectImages(page.getObject().getInheritable('Resources'), seen, refs)
      page.destroy()

      for (const ref of refs) {
        let png: Uint8Array | null = null
        try {
          png = imageToPng(doc, ref)
        } catch {
          // Un códec que MuPDF no sabe decodificar no debe tumbar el resto.
          png = null
        }
        if (!png) continue
        results.push({
          name: `${stem}-${t.filenames.extractedImages}-${padIndex(results.length + 1, 3)}.png`,
          blob: new Blob([png as BlobPart], { type: 'image/png' }),
        })
      }
    }
    return results
  })

  if (outputs.length === 0) throw new Error(t.errors.noImages)
  ctx.onProgress(1, t.progress.done)
  return outputs
}

import { fmt, t } from '@/i18n'
import { pixmapToJpeg, pixmapToPng, readPdf, renderPage, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName, padIndex, parsePageList } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    const total = doc.countPages()
    const targets = parsePageList(String(values.pages), total)
    const scale = Number(values.scale)
    const png = String(values.format) === 'png'
    const quality = Number(values.quality)
    const stem = baseName(file.name)

    const outputs: OutputFile[] = []
    for (const [index, pageIndex] of targets.entries()) {
      ctx.onProgress(index / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))
      await yieldToUI()

      const page = doc.loadPage(pageIndex)
      let bytes: Uint8Array
      try {
        // Sin alfa: el fondo queda blanco, que es lo que necesita un JPEG.
        const pixmap = renderPage(page, scale)
        bytes = png ? pixmapToPng(pixmap) : pixmapToJpeg(pixmap, quality)
      } catch {
        throw new Error(fmt(t.errors.exportPage, { page: pageIndex + 1 }))
      } finally {
        page.destroy()
      }

      outputs.push({
        name: `${stem}-${padIndex(pageIndex + 1, total)}.${png ? 'png' : 'jpg'}`,
        blob: new Blob([bytes as BlobPart], { type: png ? 'image/png' : 'image/jpeg' }),
      })
    }

    return outputs
  })
}

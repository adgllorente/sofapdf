import { fmt, t } from '@/i18n'
import { pdfjs } from '@/lib/pdfjs'
import { baseName, padIndex, parsePageList } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const document_ = await task.promise

  try {
    const targets = parsePageList(String(values.pages), document_.numPages)
    const scale = Number(values.scale)
    const format = String(values.format)
    const quality = Number(values.quality) / 100
    const mime = format === 'png' ? 'image/png' : 'image/jpeg'
    const stem = baseName(file.name)

    const outputs: OutputFile[] = []
    for (const [index, pageIndex] of targets.entries()) {
      ctx.onProgress(index / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))

      const page = await document_.getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)

      // pdf.js pinta fondo blanco por defecto: necesario porque JPEG no tiene alfa.
      await page.render({ canvas, viewport }).promise
      page.cleanup()

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, format === 'png' ? undefined : quality),
      )
      if (!blob) throw new Error(fmt(t.errors.exportPage, { page: pageIndex + 1 }))

      outputs.push({
        name: `${stem}-${padIndex(pageIndex + 1, document_.numPages)}.${format === 'png' ? 'png' : 'jpg'}`,
        blob,
      })

      // Liberar el bitmap cuanto antes: son varios MB por página a 288 ppp.
      canvas.width = 0
      canvas.height = 0
    }

    return outputs
  } finally {
    await task.destroy()
  }
}

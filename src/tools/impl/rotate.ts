import { t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), (doc) => {
    const targets = parsePageList(String(values.pages), doc.countPages())
    const turn = Number(values.angle)

    for (const [index, pageIndex] of targets.entries()) {
      const page = doc.findPage(pageIndex)
      // La rotación es acumulativa sobre la que ya trae la página, que puede heredarse del árbol.
      const current = page.getInheritable('Rotate')
      const angle = current.isNumber() ? current.asNumber() : 0
      page.put('Rotate', (((angle + turn) % 360) + 360) % 360)
      ctx.onProgress((index + 1) / targets.length)
    }

    return [{ name: `${baseName(file.name)}-${t.filenames.rotated}.pdf`, blob: pdfBlob(doc) }]
  })
}

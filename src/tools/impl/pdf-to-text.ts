import { fmt, t } from '@/i18n'
import { readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    const total = doc.countPages()
    const pages: string[] = []
    for (let i = 0; i < total; i++) {
      const page = doc.loadPage(i)
      const stext = page.toStructuredText('')
      pages.push(
        stext
          .asText()
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim(),
      )
      stext.destroy()
      page.destroy()
      ctx.onProgress((i + 1) / total, fmt(t.progress.page, { n: i + 1 }))
      await yieldToUI()
    }
    return [
      {
        name: `${baseName(file.name)}.txt`,
        blob: new Blob([pages.join('\n\n')], { type: 'text/plain;charset=utf-8' }),
      },
    ]
  })
}

import { pdfjs } from '@/lib/pdfjs'
import { fmt, t } from '@/i18n'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  try {
    const doc = await task.promise
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const textContent = await page.getTextContent()
      // Cada item trae su `str` y, opcionalmente, `hasEOL`. pdfjs no garantiza
      // saltos de línea significativos: juntamos con espacio y respetamos los
      // `hasEOL` reales. Luego recortamos para limpiar espacios al borde.
      const text = textContent.items
        .map((item, index, arr) => {
          if (!('str' in item)) return ''
          let piece = item.str
          if ('hasEOL' in item && item.hasEOL) piece += '\n'
          else if (index < arr.length - 1) piece += ' '
          return piece
        })
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      pages.push(text)
      ctx.onProgress(i / doc.numPages, fmt(t.progress.page, { n: i }))
      page.cleanup()
    }
    const fullText = pages.join('\n\n')
    return [
      {
        name: `${baseName(file.name)}.txt`,
        blob: new Blob([fullText], { type: 'text/plain;charset=utf-8' }),
      },
    ]
  } finally {
    await task.destroy()
  }
}

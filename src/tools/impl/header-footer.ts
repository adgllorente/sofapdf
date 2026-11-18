import { t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { Overlay, type PageCanvas, type Rgb } from '@/lib/overlay'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const INK: Rgb = [0.15, 0.15, 0.15]

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const header = String(values.header ?? '').trim()
  const footer = String(values.footer ?? '').trim()
  if (!header && !footer) throw new Error(t.errors.headerFooterEmpty)

  return usingPdf(await readPdf(file), async (doc) => {
    const overlay = new Overlay(doc)
    const count = doc.countPages()
    const targets = parsePageList(String(values.pages), count)
    const size = Number(values.size)
    const margin = Number(values.margin)
    const date = new Date().toLocaleDateString()

    try {
      for (const [index, pageIndex] of targets.entries()) {
        const page = overlay.page(pageIndex)
        const variables = { page: String(pageIndex + 1), total: String(count), file: file.name, date }

        drawText(overlay, page, expand(header, variables), size, margin, true)
        drawText(overlay, page, expand(footer, variables), size, margin, false)
        page.finish()
        ctx.onProgress((index + 1) / targets.length)
        await yieldToUI()
      }
      return [{ name: `${baseName(file.name)}-${t.filenames.headerFooter}.pdf`, blob: pdfBlob(doc) }]
    } finally {
      overlay.dispose()
    }
  })
}

type Variables = { page: string; total: string; file: string; date: string }

function expand(text: string, variables: Variables): string {
  return text.replace(/\{(page|total|file|date)\}/g, (_, key: keyof Variables) => variables[key])
}

function drawText(
  overlay: Overlay,
  page: PageCanvas,
  text: string,
  size: number,
  margin: number,
  header: boolean,
): void {
  if (!text) return
  const textWidth = overlay.textWidth('Helvetica', text, size)
  const x = Math.max(margin, (page.width - textWidth) / 2)
  const y = header ? page.height - margin - size : margin
  page.fill(INK)
  page.text(text, page.x0 + x, page.y0 + y, 'Helvetica', size)
}

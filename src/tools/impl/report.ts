import { fmt, t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { formatBytes } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { getPdfDocument, pdfjs } from '@/lib/pdfjs'
import type { ToolRun } from '@/tools/types'

type PageReport = { number: number; width: number; height: number; fonts: string[]; images: number }

function valueOrNone(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : t.report.none
}

function formatFonts(fonts: string[]): string {
  return fonts.length > 0 ? fonts.join(', ') : t.report.none
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const encryption = await encryptionState(data)
  const lines = [
    t.report.title,
    `${t.report.file}: ${file.name}`,
    `${t.report.size}: ${formatBytes(file.size)}`,
    '',
    `${t.report.encryption}: ${
      encryption === 'encrypted'
        ? t.report.encrypted
        : encryption === 'plain'
          ? t.report.plain
          : t.report.unknown
    }`,
  ]

  if (encryption === 'encrypted') {
    lines.push('', `${t.report.unavailable}:`, `- ${t.report.encryptedContent}`, `- ${t.report.embeddingUnknown}`, '', t.report.footer)
    return [{ name: `${baseName(file.name)}-${t.filenames.report}.txt`, blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }) }]
  }

  const task = getPdfDocument(data)
  try {
    let document_: Awaited<typeof task.promise>
    try {
      document_ = await task.promise
    } catch {
      lines.push('', `${t.report.unavailable}:`, `- ${t.report.unavailableDetails}`, '', t.report.footer)
      return [{ name: `${baseName(file.name)}-${t.filenames.report}.txt`, blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }) }]
    }
    const metadata = await document_.getMetadata().catch(() => null)
    const pages: PageReport[] = []
    const fonts = new Set<string>()
    let images = 0

    for (let number = 1; number <= document_.numPages; number++) {
      try {
        const page = await document_.getPage(number)
        const viewport = page.getViewport({ scale: 1 })
        const text = await page.getTextContent()
        const pageFonts = Object.values(text.styles)
          .map((style) => style.fontFamily)
          .filter((font): font is string => Boolean(font))
        pageFonts.forEach((font) => fonts.add(font))
        const operators = await page.getOperatorList()
        const pageImages = operators.fnArray.filter(
          (fn: number) =>
            fn === pdfjs.OPS.paintImageXObject ||
            fn === pdfjs.OPS.paintInlineImageXObject ||
            fn === pdfjs.OPS.paintImageMaskXObject,
        ).length
        images += pageImages
        pages.push({ number, width: viewport.width, height: viewport.height, fonts: pageFonts, images: pageImages })
        page.cleanup()
      } catch {
        lines.push(`${t.report.page} ${number}: ${t.report.pageError}`)
      }
      ctx.onProgress(number / document_.numPages, fmt(t.progress.page, { n: number }))
    }

    const fields = await document_.getFieldObjects().catch(() => undefined)
    const fieldCount = fields ? Object.values(fields).flat().length : 0
    lines.push('', `${t.report.pages}: ${document_.numPages}`)
    lines.push(`${t.report.fonts}: ${formatFonts([...fonts])}`)
    lines.push(`${t.report.images}: ${images}`)
    lines.push(`${t.report.forms}: ${fields === undefined ? t.report.unavailable : fieldCount > 0 ? t.report.detected : t.report.none}`)
    lines.push(`${t.report.fields}: ${fields === undefined ? t.report.unavailable : fieldCount}`)
    const info = (metadata?.info ?? {}) as Record<string, unknown>
    lines.push('', t.report.metadata)
    const metadataValue = (value: unknown) =>
      metadata === null ? t.report.unavailable : valueOrNone(value)
    lines.push(`${t.report.titleField}: ${metadataValue(info.Title)}`)
    lines.push(`${t.report.author}: ${metadataValue(info.Author)}`)
    lines.push(`${t.report.subject}: ${metadataValue(info.Subject)}`)
    lines.push(`${t.report.keywords}: ${metadataValue(info.Keywords)}`)
    lines.push('', t.report.pageDetails)
    pages.forEach((page) => {
      lines.push(
        `${t.report.page} ${page.number}: ${t.report.dimensions} ${Math.round(page.width)} × ${Math.round(page.height)} pt; ${t.report.fonts.toLowerCase()}: ${formatFonts(page.fonts)}; ${t.report.images.toLowerCase()}: ${page.images}`,
      )
    })
    lines.push('', `${t.report.unavailable}:`, `- ${t.report.embeddingUnknown}`)
    lines.push('', t.report.footer)

    return [{ name: `${baseName(file.name)}-${t.filenames.report}.txt`, blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }) }]
  } finally {
    await task.destroy()
  }
}

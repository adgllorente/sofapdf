import { fmt, t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { formatBytes } from '@/lib/files'
import { mupdf, openPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PdfObject = InstanceType<typeof mupdf.PDFObject>
type PageReport = { number: number; width: number; height: number; fonts: string[]; images: number }

function valueOrNone(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : t.report.none
}

function formatFonts(fonts: string[]): string {
  return fonts.length > 0 ? fonts.join(', ') : t.report.none
}

function textFile(file: File, lines: string[]) {
  return [
    {
      name: `${baseName(file.name)}-${t.filenames.report}.txt`,
      blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
    },
  ]
}

/** Nombres de las fuentes de la página y de sus formularios, sin el prefijo de subconjunto. */
function collectFonts(resources: PdfObject, into: Set<string>, seen: Set<number>): void {
  // `get` sobre el objeto nulo de MuPDF lanza: una página puede no tener recursos.
  if (!resources.isDictionary()) return
  const fonts = resources.get('Font')
  if (fonts.isDictionary()) {
    fonts.forEach((font) => {
      if (!font.isDictionary()) return
      const name = font.get('BaseFont')
      if (name.isName()) into.add(name.asName().replace(/^[A-Z]{6}\+/, ''))
    })
  }
  const xobjects = resources.get('XObject')
  if (!xobjects.isDictionary()) return
  xobjects.forEach((xobject) => {
    if (!xobject.isDictionary()) return
    if (xobject.isIndirect()) {
      if (seen.has(xobject.asIndirect())) return
      seen.add(xobject.asIndirect())
    }
    const subtype = xobject.get('Subtype')
    if (subtype.isName() && subtype.asName() === 'Form') collectFonts(xobject.get('Resources'), into, seen)
  })
}

/** Cuenta las imágenes pintadas, incluidas las inline y las máscaras. */
function countImages(page: InstanceType<typeof mupdf.PDFPage>): number {
  let images = 0
  const device = new mupdf.Device({
    fillImage: () => void images++,
    fillImageMask: () => void images++,
  })
  try {
    page.runPageContents(device, mupdf.Matrix.identity)
    device.close()
  } finally {
    device.destroy()
  }
  return images
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
    return textFile(file, lines)
  }

  let doc: InstanceType<typeof mupdf.PDFDocument>
  try {
    doc = openPdf(data, file.name)
  } catch {
    lines.push('', `${t.report.unavailable}:`, `- ${t.report.unavailableDetails}`, '', t.report.footer)
    return textFile(file, lines)
  }

  return usingPdf(doc, async () => {
    const total = doc.countPages()
    const pages: PageReport[] = []
    const fonts = new Set<string>()
    let images = 0
    let fields = 0

    for (let number = 1; number <= total; number++) {
      try {
        const page = doc.loadPage(number - 1)
        try {
          const [x0, y0, x1, y1] = page.getBounds()
          const pageFonts = new Set<string>()
          collectFonts(page.getObject().getInheritable('Resources'), pageFonts, new Set())
          pageFonts.forEach((font) => fonts.add(font))
          const pageImages = countImages(page)
          images += pageImages
          fields += page.getWidgets().length
          pages.push({ number, width: x1 - x0, height: y1 - y0, fonts: [...pageFonts], images: pageImages })
        } finally {
          page.destroy()
        }
      } catch {
        lines.push(`${t.report.page} ${number}: ${t.report.pageError}`)
      }
      ctx.onProgress(number / total, fmt(t.progress.page, { n: number }))
      await yieldToUI()
    }

    lines.push('', `${t.report.pages}: ${total}`)
    lines.push(`${t.report.fonts}: ${formatFonts([...fonts])}`)
    lines.push(`${t.report.images}: ${images}`)
    lines.push(`${t.report.forms}: ${fields > 0 ? t.report.detected : t.report.none}`)
    lines.push(`${t.report.fields}: ${fields}`)
    lines.push('', t.report.metadata)
    lines.push(`${t.report.titleField}: ${valueOrNone(doc.getMetaData(mupdf.Document.META_INFO_TITLE))}`)
    lines.push(`${t.report.author}: ${valueOrNone(doc.getMetaData(mupdf.Document.META_INFO_AUTHOR))}`)
    lines.push(`${t.report.subject}: ${valueOrNone(doc.getMetaData(mupdf.Document.META_INFO_SUBJECT))}`)
    lines.push(`${t.report.keywords}: ${valueOrNone(doc.getMetaData(mupdf.Document.META_INFO_KEYWORDS))}`)
    lines.push('', t.report.pageDetails)
    pages.forEach((page) => {
      lines.push(
        `${t.report.page} ${page.number}: ${t.report.dimensions} ${Math.round(page.width)} × ${Math.round(page.height)} pt; ${t.report.fonts.toLowerCase()}: ${formatFonts(page.fonts)}; ${t.report.images.toLowerCase()}: ${page.images}`,
      )
    })
    lines.push('', `${t.report.unavailable}:`, `- ${t.report.embeddingUnknown}`)
    lines.push('', t.report.footer)

    return textFile(file, lines)
  })
}

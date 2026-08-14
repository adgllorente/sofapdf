import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const header = String(values.header ?? '').trim()
  const footer = String(values.footer ?? '').trim()
  if (!header && !footer) throw new Error(t.errors.headerFooterEmpty)

  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const font = await document_.embedFont(StandardFonts.Helvetica)
  const pages = document_.getPages()
  const targets = parsePageList(String(values.pages), pages.length)
  const size = Number(values.size)
  const margin = Number(values.margin)
  const date = new Date().toLocaleDateString()

  for (const [index, pageIndex] of targets.entries()) {
    const page = pages[pageIndex]
    const { width, height } = page.getSize()
    const variables = { page: String(pageIndex + 1), total: String(pages.length), file: file.name, date }

    drawText(page, expand(header, variables), font, size, margin, width, height, true)
    drawText(page, expand(footer, variables), font, size, margin, width, height, false)
    ctx.onProgress((index + 1) / targets.length)
  }

  return [{ name: `${baseName(file.name)}-${t.filenames.headerFooter}.pdf`, blob: toBlob(await document_.save()) }]
}

type PdfPage = ReturnType<PDFDocument['getPages']>[number]
type Variables = { page: string; total: string; file: string; date: string }

function expand(text: string, variables: Variables): string {
  return text.replace(/\{(page|total|file|date)\}/g, (_, key: keyof Variables) => variables[key])
}

function drawText(
  page: PdfPage,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  margin: number,
  width: number,
  height: number,
  header: boolean,
): void {
  if (!text) return
  const textWidth = font.widthOfTextAtSize(text, size)
  const x = Math.max(margin, (width - textWidth) / 2)
  const y = header ? height - margin - size : margin
  page.drawText(text, { x, y, size, font, color: rgb(0.15, 0.15, 0.15) })
}

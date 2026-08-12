import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pageCount = source.getPageCount()
  const targets = parsePageList(String(values.pages), pageCount)
  const targetSet = new Set(targets)
  const position = String(values.position)
  const [width, height] = PAGE_SIZES[String(values.pageSize) as keyof typeof PAGE_SIZES] ?? PAGE_SIZES.a4
  const landscape = String(values.orientation) === 'landscape'
  const blankSize: [number, number] = landscape ? [height, width] : [width, height]
  const target = await PDFDocument.create()
  const pages = await target.copyPages(source, Array.from({ length: pageCount }, (_, index) => index))

  for (const [index, page] of pages.entries()) {
    if (position === 'before' && targetSet.has(index)) target.addPage(blankSize)
    target.addPage(page)
    if (position === 'after' && targetSet.has(index)) target.addPage(blankSize)
    ctx.onProgress((index + 1) / pageCount, fmt(t.progress.page, { n: index + 1 }))
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.inserted}.pdf`,
      blob: toBlob(await target.save()),
    },
  ]
}

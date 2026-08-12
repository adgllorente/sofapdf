import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const copies = Number(values.copies)
  if (!Number.isInteger(copies) || copies < 2 || copies > 100) {
    throw new Error(t.errors.invalidCopies)
  }

  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pageCount = source.getPageCount()
  const selected = new Set(parsePageList(String(values.pages), pageCount))
  const target = await PDFDocument.create()
  const sourceIndices: number[] = []
  for (let index = 0; index < pageCount; index++) {
    const repetitions = selected.has(index) ? copies : 1
    for (let copy = 0; copy < repetitions; copy++) sourceIndices.push(index)
  }
  const pages = await target.copyPages(source, sourceIndices)

  for (const [index, page] of pages.entries()) {
    target.addPage(page)
    if (index === pages.length - 1 || sourceIndices[index] !== sourceIndices[index + 1]) {
      ctx.onProgress((sourceIndices[index] + 1) / pageCount, fmt(t.progress.page, { n: sourceIndices[index] + 1 }))
    }
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.duplicated}.pdf`,
      blob: toBlob(await target.save()),
    },
  ]
}

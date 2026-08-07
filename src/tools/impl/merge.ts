import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  const merged = await PDFDocument.create()

  for (const [index, file] of files.entries()) {
    ctx.onProgress(index / files.length, fmt(t.progress.reading, { name: file.name }))
    const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }

  ctx.onProgress(0.95, t.progress.writingPdf)
  return [{ name: `${t.filenames.merged}.pdf`, blob: toBlob(await merged.save()) }]
}

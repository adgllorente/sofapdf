import { t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

function clean(text: string): string {
  return text.trim()
}

function keywords(text: string): string {
  return text
    .split(',')
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .join(', ')
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  return usingPdf(await readPdf(file), (doc) => {
    ctx.onProgress(0.5, t.progress.writingPdf)
    const { Document } = mupdf
    doc.setMetaData(Document.META_INFO_TITLE, clean(String(values.title ?? '')))
    doc.setMetaData(Document.META_INFO_AUTHOR, clean(String(values.author ?? '')))
    doc.setMetaData(Document.META_INFO_SUBJECT, clean(String(values.subject ?? '')))
    doc.setMetaData(Document.META_INFO_KEYWORDS, keywords(String(values.keywords ?? '')))

    const blob = pdfBlob(doc)
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.metadata}.pdf`, blob }]
  })
}

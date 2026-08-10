import { PDFDocument } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const form = document_.getForm()

  ctx.onProgress(0.35, t.progress.flattening)
  try {
    // pdf-lib integra cada apariencia en el contenido de su página y elimina el campo.
    form.flatten()
  } catch {
    throw new Error(t.errors.flattenFailed)
  }

  ctx.onProgress(0.8, t.progress.writingPdf)
  const bytes = await document_.save()

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.flattened}.pdf`, blob: toBlob(bytes) }]
}

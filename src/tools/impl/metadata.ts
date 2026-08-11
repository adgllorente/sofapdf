import { PDFDocument } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

// pdf-lib acepta vacíos; los mantiene como cadenas vacías en el info dict.
// Para un borrado real (eliminar la entrada) haría falta tocar el dict a mano:
// no compensa para v1.
function clean(text: string): string {
  return text.trim()
}

function keywords(text: string): string[] {
  return text
    .split(',')
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })

  ctx.onProgress(0.5, t.progress.writingPdf)
  document_.setTitle(clean(String(values.title ?? '')))
  document_.setAuthor(clean(String(values.author ?? '')))
  document_.setSubject(clean(String(values.subject ?? '')))
  document_.setKeywords(keywords(String(values.keywords ?? '')))

  const bytes = await document_.save()
  ctx.onProgress(1, t.progress.done)
  return [
    {
      name: `${baseName(file.name)}-${t.filenames.metadata}.pdf`,
      blob: toBlob(bytes),
    },
  ]
}

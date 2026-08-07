import { PDFDocument, degrees } from 'pdf-lib'
import { t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const targets = parsePageList(String(values.pages), document_.getPageCount())
  const turn = Number(values.angle)

  for (const [index, pageIndex] of targets.entries()) {
    const page = document_.getPage(pageIndex)
    // La rotación es acumulativa sobre la que ya trae la página.
    page.setRotation(degrees((page.getRotation().angle + turn + 360) % 360))
    ctx.onProgress((index + 1) / targets.length)
  }

  return [{ name: `${baseName(file.name)}-${t.filenames.rotated}.pdf`, blob: toBlob(await document_.save()) }]
}

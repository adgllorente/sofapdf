import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, expandRanges, padIndex, parseRanges } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pageCount = source.getPageCount()
  const stem = baseName(file.name)
  const mode = String(values.mode)

  const groups =
    mode === 'each'
      ? expandRanges(parseRanges(String(values.ranges), pageCount)).map((index) => [index])
      : mode === 'extract'
        ? [expandRanges(parseRanges(String(values.ranges), pageCount))]
        : parseRanges(String(values.ranges), pageCount).map(({ from, to }) =>
            Array.from({ length: to - from + 1 }, (_, offset) => from + offset),
          )

  const outputs: OutputFile[] = []
  for (const [index, indices] of groups.entries()) {
    ctx.onProgress(
      index / groups.length,
      fmt(t.progress.document, { n: index + 1, total: groups.length }),
    )
    const target = await PDFDocument.create()
    const pages = await target.copyPages(source, indices)
    for (const page of pages) target.addPage(page)

    const label =
      mode === 'extract'
        ? t.filenames.selection
        : indices.length === 1
          ? `p${padIndex(indices[0] + 1, pageCount)}`
          : `p${padIndex(indices[0] + 1, pageCount)}-${padIndex(indices.at(-1)! + 1, pageCount)}`

    outputs.push({ name: `${stem}-${label}.pdf`, blob: toBlob(await target.save()) })
  }

  return outputs
}

import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, expandRanges, padIndex, parseRanges } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

const BYTES_PER_MB = 1024 * 1024

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pageCount = source.getPageCount()
  const stem = baseName(file.name)
  const mode = String(values.mode)

  if (mode === 'size') return splitBySize(source, stem, pageCount, Number(values.maxSize), ctx)

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

async function splitBySize(
  source: PDFDocument,
  stem: string,
  pageCount: number,
  maxSize: number,
  ctx: Parameters<ToolRun>[2],
): Promise<OutputFile[]> {
  if (!Number.isFinite(maxSize) || maxSize < 0.1 || maxSize > 500) {
    throw new Error(t.errors.invalidMaxSize)
  }

  const limit = maxSize * BYTES_PER_MB
  const outputs: OutputFile[] = []
  let start = 0
  let target = await PDFDocument.create()

  for (let index = 0; index < pageCount; index++) {
    const [page] = await target.copyPages(source, [index])
    target.addPage(page)
    const candidate = await target.save()

    if (candidate.byteLength > limit) {
      target.removePage(target.getPageCount() - 1)
      if (index === start) {
        throw new Error(
          fmt(t.errors.pageTooLarge, {
            page: index + 1,
            size: toMegabytes(candidate.byteLength),
            max: maxSize,
          }),
        )
      }

      outputs.push({
        name: `${stem}-${t.filenames.sizePart}-${padIndex(start + 1, pageCount)}-${padIndex(index, pageCount)}.pdf`,
        blob: toBlob(await target.save()),
      })
      target = await PDFDocument.create()
      start = index
      const [nextPage] = await target.copyPages(source, [index])
      target.addPage(nextPage)
    }

    ctx.onProgress((index + 1) / pageCount, fmt(t.progress.page, { n: index + 1 }))
  }

  outputs.push({
    name: `${stem}-${t.filenames.sizePart}-${padIndex(start + 1, pageCount)}-${padIndex(pageCount, pageCount)}.pdf`,
    blob: toBlob(await target.save()),
  })
  return outputs
}

function toMegabytes(bytes: number): string {
  return (bytes / BYTES_PER_MB).toFixed(2)
}

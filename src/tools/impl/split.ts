import { fmt, t } from '@/i18n'
import { appendPages, mupdf, pdfBlob, pdfBytes, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { toBlob } from '@/lib/files'
import { baseName, expandRanges, padIndex, parseRanges } from '@/lib/pages'
import type { OutputFile, ToolRun } from '@/tools/types'

const BYTES_PER_MB = 1024 * 1024

type PDFDocument = InstanceType<typeof mupdf.PDFDocument>

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (source) => {
    const pageCount = source.countPages()
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
      await yieldToUI()
      const target = new mupdf.PDFDocument()
      let blob: Blob
      try {
        appendPages(target, source, indices)
        blob = pdfBlob(target)
      } finally {
        target.destroy()
      }

      const label =
        mode === 'extract'
          ? t.filenames.selection
          : indices.length === 1
            ? `p${padIndex(indices[0] + 1, pageCount)}`
            : `p${padIndex(indices[0] + 1, pageCount)}-${padIndex(indices.at(-1)! + 1, pageCount)}`

      outputs.push({ name: `${stem}-${label}.pdf`, blob })
    }

    return outputs
  })
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
  const partName = (from: number, to: number) =>
    `${stem}-${t.filenames.sizePart}-${padIndex(from, pageCount)}-${padIndex(to, pageCount)}.pdf`

  let start = 0
  // Último guardado que cabía: evita volver a serializar al cerrar la parte.
  let accepted: Uint8Array | null = null
  let target = new mupdf.PDFDocument()

  try {
    for (let index = 0; index < pageCount; index++) {
      appendPages(target, source, [index])
      const candidate = pdfBytes(target)

      if (candidate.byteLength > limit) {
        if (index === start) {
          throw new Error(
            fmt(t.errors.pageTooLarge, {
              page: index + 1,
              size: toMegabytes(candidate.byteLength),
              max: maxSize,
            }),
          )
        }

        outputs.push({ name: partName(start + 1, index), blob: toBlob(accepted!) })
        target.destroy()
        target = new mupdf.PDFDocument()
        start = index
        appendPages(target, source, [index])
        accepted = pdfBytes(target)
      } else {
        accepted = candidate
      }

      ctx.onProgress((index + 1) / pageCount, fmt(t.progress.page, { n: index + 1 }))
      await yieldToUI()
    }

    outputs.push({ name: partName(start + 1, pageCount), blob: toBlob(accepted!) })
    return outputs
  } finally {
    target.destroy()
  }
}

function toMegabytes(bytes: number): string {
  return (bytes / BYTES_PER_MB).toFixed(2)
}

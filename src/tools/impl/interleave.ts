import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PDFDocument = InstanceType<typeof mupdf.PDFDocument>
type PDFGraftMap = InstanceType<typeof mupdf.PDFGraftMap>

export const run: ToolRun = async (files, values, ctx) => {
  if (files.length < 2) throw new Error(t.errors.interleaveNeedTwo)

  const reverseSecond = Boolean(values.reverseSecond)
  const step = Math.max(1, Math.floor(Number(values.step) || 1))
  const trailing = String(values.trailing || 'append')

  ctx.onProgress(0.05, t.progress.readingPdf)

  const docs: PDFDocument[] = []
  try {
    for (const [index, file] of files.entries()) {
      ctx.onProgress(0.05 + 0.15 * (index / files.length), fmt(t.progress.reading, { name: file.name }))
      await yieldToUI()
      docs.push(await readPdf(file))
    }

    const counts = docs.map((d) => d.countPages())
    const totalPagesAvailable = counts.reduce((sum, c) => sum + c, 0)
    if (totalPagesAvailable === 0) throw new Error(t.errors.emptySelection)

    const pageLists: number[][] = docs.map((doc, i) => {
      const count = doc.countPages()
      const indices = [...Array(count).keys()]
      if (i === 1 && reverseSecond) {
        indices.reverse()
      }
      return indices
    })

    const target = new mupdf.PDFDocument()
    const maps = new Map<number, PDFGraftMap>()

    try {
      for (let i = 0; i < docs.length; i++) {
        maps.set(i, target.newGraftMap())
      }

      const pointers = new Array(docs.length).fill(0)
      let pagesGrafted = 0

      ctx.onProgress(0.2, t.progress.interleaving)

      while (true) {
        if (trailing === 'discard' && pointers.some((p, i) => p >= pageLists[i].length)) {
          break
        }

        let graftedInRound = 0
        for (let i = 0; i < docs.length; i++) {
          const list = pageLists[i]
          const map = maps.get(i)!
          const doc = docs[i]

          for (let s = 0; s < step; s++) {
            if (pointers[i] < list.length) {
              const pageIdx = list[pointers[i]]
              pointers[i]++
              map.graftPage(-1, doc, pageIdx)
              pagesGrafted++
              graftedInRound++
            } else if (trailing === 'discard') {
              break
            }
          }
        }

        if (graftedInRound === 0) break

        ctx.onProgress(
          0.2 + 0.7 * Math.min(1, pagesGrafted / totalPagesAvailable),
          fmt(t.progress.page, { n: pagesGrafted }),
        )
        if (pagesGrafted % 10 === 0) await yieldToUI()
      }

      if (pagesGrafted === 0) {
        throw new Error(t.errors.emptySelection)
      }

      ctx.onProgress(0.95, t.progress.writingPdf)
      await yieldToUI()

      const stem =
        files.length === 2
          ? baseName(files[0].name) === baseName(files[1].name)
            ? baseName(files[0].name)
            : `${baseName(files[0].name)}-${baseName(files[1].name)}`
          : `${baseName(files[0].name)}+${files.length - 1}`

      return [
        {
          name: `${stem}-${t.filenames.interleaved}.pdf`,
          blob: pdfBlob(target),
        },
      ]
    } finally {
      for (const map of maps.values()) map.destroy()
      target.destroy()
    }
  } finally {
    for (const doc of docs) doc.destroy()
  }
}

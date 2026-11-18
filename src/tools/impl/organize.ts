import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PageEntry = { id: string; file: number; source: number }

type PDFDocument = InstanceType<typeof mupdf.PDFDocument>
type PDFGraftMap = InstanceType<typeof mupdf.PDFGraftMap>

export const run: ToolRun = async (files, values, ctx) => {
  const raw = String(values.pages ?? '')
  if (!raw) throw new Error(t.errors.organizeEmpty)

  let entries: PageEntry[]
  try {
    const parsed = JSON.parse(raw) as PageEntry[]
    entries = parsed.filter(
      (p): p is PageEntry =>
        typeof p?.file === 'number' &&
        typeof p?.source === 'number' &&
        typeof p?.id === 'string',
    )
  } catch {
    throw new Error(t.errors.organizeEmpty)
  }
  if (entries.length === 0) throw new Error(t.errors.organizeEmpty)

  const docs: (PDFDocument | null)[] = []
  for (const file of files) {
    try {
      docs.push(await readPdf(file))
    } catch {
      docs.push(null)
    }
  }

  const target = new mupdf.PDFDocument()
  // Un graft map por origen: las páginas de un mismo PDF comparten sus recursos.
  const maps = new Map<number, PDFGraftMap>()
  try {
    for (const [index, entry] of entries.entries()) {
      const doc = docs[entry.file]
      if (!doc || entry.source < 0 || entry.source >= doc.countPages()) {
        throw new Error(fmt(t.errors.exportPage, { page: entry.source + 1 }))
      }
      let map = maps.get(entry.file)
      if (!map) {
        map = target.newGraftMap()
        maps.set(entry.file, map)
      }
      map.graftPage(-1, doc, entry.source)
      ctx.onProgress((index + 1) / entries.length, fmt(t.progress.page, { n: index + 1 }))
      await yieldToUI()
    }

    const stem = files.length === 1 ? baseName(files[0].name) : `${baseName(files[0].name)}+${files.length - 1}`
    return [{ name: `${stem}-${t.filenames.organized}.pdf`, blob: pdfBlob(target) }]
  } finally {
    for (const map of maps.values()) map.destroy()
    for (const doc of docs) doc?.destroy()
    target.destroy()
  }
}

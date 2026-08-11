import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PageEntry = { id: string; file: number; source: number }

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

  const docs: (PDFDocument | null)[] = await Promise.all(
    files.map(async (file) => {
      try {
        return await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      } catch {
        return null
      }
    }),
  )

  const target = await PDFDocument.create()
  for (const [index, entry] of entries.entries()) {
    const doc = docs[entry.file]
    if (!doc) throw new Error(fmt(t.errors.exportPage, { page: entry.source + 1 }))
    const [copied] = await target.copyPages(doc, [entry.source])
    target.addPage(copied)
    ctx.onProgress((index + 1) / entries.length, fmt(t.progress.page, { n: index + 1 }))
  }

  const stem = files.length === 1 ? baseName(files[0].name) : `${baseName(files[0].name)}+${files.length - 1}`
  return [
    {
      name: `${stem}-${t.filenames.organized}.pdf`,
      blob: toBlob(await target.save()),
    },
  ]
}
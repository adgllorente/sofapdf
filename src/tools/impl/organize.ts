import { PDFDocument } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PageEntry = { id: string; source: number }

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const raw = String(values.pages ?? '')
  if (!raw) throw new Error(t.errors.organizeEmpty)

  let entries: PageEntry[]
  try {
    const parsed = JSON.parse(raw) as PageEntry[]
    entries = parsed.filter((p): p is PageEntry => typeof p?.source === 'number' && typeof p?.id === 'string')
  } catch {
    throw new Error(t.errors.organizeEmpty)
  }
  if (entries.length === 0) throw new Error(t.errors.organizeEmpty)

  const sourceDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const targetDoc = await PDFDocument.create()

  for (const [index, entry] of entries.entries()) {
    const [copied] = await targetDoc.copyPages(sourceDoc, [entry.source])
    targetDoc.addPage(copied)
    ctx.onProgress((index + 1) / entries.length, fmt(t.progress.page, { n: entry.source + 1 }))
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.organized}.pdf`,
      blob: toBlob(await targetDoc.save()),
    },
  ]
}

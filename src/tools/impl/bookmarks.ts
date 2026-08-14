import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNull, PDFNumber, PDFString } from 'pdf-lib/es'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import type { BookmarkEntry, ToolRun } from '@/tools/types'

type OutlineNode = BookmarkEntry & { parent: number | null; children: number[] }

function normalizeEntries(value: unknown): BookmarkEntry[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => ({
    id: String(entry && typeof entry === 'object' ? entry.id ?? '' : ''),
    title: String(entry && typeof entry === 'object' ? entry.title ?? '' : '').trim(),
    page: Number(entry && typeof entry === 'object' ? entry.page : NaN),
    level: Number(entry && typeof entry === 'object' ? entry.level : NaN),
  }))
}

function destination(context: PDFDocument['context'], pageRef: ReturnType<PDFDocument['getPages']>[number]['ref']): PDFArray {
  const target = PDFArray.withContext(context)
  target.push(pageRef)
  target.push(PDFName.of('XYZ'))
  target.push(PDFNull)
  target.push(PDFNull)
  target.push(PDFNull)
  return target
}

function descendants(nodes: OutlineNode[], index: number): number {
  return nodes[index].children.reduce((total, child) => total + 1 + descendants(nodes, child), 0)
}

function addOutline(document_: PDFDocument, entries: BookmarkEntry[]): void {
  const context = document_.context
  const nodes: OutlineNode[] = []
  const stack: number[] = []

  for (const entry of entries) {
    const previousLevel = nodes.at(-1)?.level ?? -1
    const level = Math.max(0, Math.min(Math.floor(entry.level), previousLevel + 1))
    stack.length = level
    const parent = level === 0 ? null : (stack[level - 1] ?? null)
    const node = { ...entry, level, parent, children: [] }
    nodes.push(node)
    const index = nodes.length - 1
    if (parent === null) stack.length = 0
    else nodes[parent].children.push(index)
    stack[level] = index
  }

  const root = PDFDict.withContext(context)
  const rootRef = context.register(root)
  root.set(PDFName.of('Type'), PDFName.of('Outlines'))
  root.set(PDFName.of('Count'), PDFNumber.of(nodes.length))
  const refs = nodes.map(() => context.nextRef())

  for (const [index, node] of nodes.entries()) {
    const object = PDFDict.withContext(context)
    context.assign(refs[index], object)
    object.set(PDFName.of('Parent'), node.parent === null ? rootRef : refs[node.parent])
    object.set(PDFName.of('Title'), PDFString.of(node.title))
    object.set(PDFName.of('Dest'), destination(context, document_.getPages()[node.page - 1].ref))
    if (node.children.length > 0) {
      object.set(PDFName.of('First'), refs[node.children[0]])
      object.set(PDFName.of('Last'), refs[node.children.at(-1)!])
      object.set(PDFName.of('Count'), PDFNumber.of(descendants(nodes, index)))
    }
  }

  const siblingGroups = [
    nodes.filter((node) => node.parent === null).map((node) => nodes.indexOf(node)),
    ...nodes.map((node) => node.children),
  ]
  for (const siblings of siblingGroups) {
    for (const [position, index] of siblings.entries()) {
      const object = context.lookup(refs[index], PDFDict)
      if (position > 0) object.set(PDFName.of('Prev'), refs[siblings[position - 1]])
      if (position < siblings.length - 1) object.set(PDFName.of('Next'), refs[siblings[position + 1]])
    }
  }
  const rootItems = siblingGroups[0]
  if (rootItems.length > 0) {
    root.set(PDFName.of('First'), refs[rootItems[0]])
    root.set(PDFName.of('Last'), refs[rootItems.at(-1)!])
  }

  document_.catalog.set(PDFName.of('Outlines'), rootRef)
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const entries = normalizeEntries(values.entries)
  const pages = document_.getPages()
  if (entries.length === 0) throw new Error(t.errors.bookmarksEmpty)

  for (const entry of entries) {
    if (!entry.title) throw new Error(t.errors.bookmarkTitle)
    if (!Number.isInteger(entry.page) || entry.page < 1 || entry.page > pages.length) {
      throw new Error(fmt(t.errors.bookmarkPage, { page: entry.page, total: pages.length }))
    }
  }

  ctx.onProgress(0.5, t.progress.writingPdf)
  addOutline(document_, entries)
  const bytes = await document_.save()
  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.bookmarks}.pdf`, blob: toBlob(bytes) }]
}

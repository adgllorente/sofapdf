import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { BookmarkEntry, ToolRun } from '@/tools/types'

type PDFDocument = InstanceType<typeof mupdf.PDFDocument>
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

function descendants(nodes: OutlineNode[], index: number): number {
  return nodes[index].children.reduce((total, child) => total + 1 + descendants(nodes, child), 0)
}

function buildTree(entries: BookmarkEntry[]): OutlineNode[] {
  const nodes: OutlineNode[] = []
  const stack: number[] = []

  for (const entry of entries) {
    const previousLevel = nodes.at(-1)?.level ?? -1
    // Un nivel no puede saltar más de uno respecto al anterior: no habría padre.
    const level = Math.max(0, Math.min(Math.floor(entry.level), previousLevel + 1))
    stack.length = level
    const parent = level === 0 ? null : (stack[level - 1] ?? null)
    nodes.push({ ...entry, level, parent, children: [] })
    const index = nodes.length - 1
    if (parent === null) stack.length = 0
    else nodes[parent].children.push(index)
    stack[level] = index
  }
  return nodes
}

/** Sustituye el índice del documento por uno nuevo construido a mano con objetos PDF. */
function addOutline(doc: PDFDocument, entries: BookmarkEntry[]): void {
  const nodes = buildTree(entries)
  const root = doc.addObject(doc.newDictionary())
  root.put('Type', doc.newName('Outlines'))
  root.put('Count', nodes.length)
  const refs = nodes.map(() => doc.addObject(doc.newDictionary()))

  for (const [index, node] of nodes.entries()) {
    const item = refs[index]
    item.put('Parent', node.parent === null ? root : refs[node.parent])
    item.put('Title', doc.newString(node.title))
    const dest = doc.newArray()
    dest.push(doc.findPage(node.page - 1))
    dest.push(doc.newName('XYZ'))
    dest.push(doc.newNull())
    dest.push(doc.newNull())
    dest.push(doc.newNull())
    item.put('Dest', dest)
    if (node.children.length > 0) {
      item.put('First', refs[node.children[0]])
      item.put('Last', refs[node.children.at(-1)!])
      item.put('Count', descendants(nodes, index))
    }
  }

  const rootItems = nodes.flatMap((node, index) => (node.parent === null ? [index] : []))
  for (const siblings of [rootItems, ...nodes.map((node) => node.children)]) {
    for (const [position, index] of siblings.entries()) {
      if (position > 0) refs[index].put('Prev', refs[siblings[position - 1]])
      if (position < siblings.length - 1) refs[index].put('Next', refs[siblings[position + 1]])
    }
  }
  if (rootItems.length > 0) {
    root.put('First', refs[rootItems[0]])
    root.put('Last', refs[rootItems.at(-1)!])
  }

  doc.getTrailer().get('Root').put('Outlines', root)
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const entries = normalizeEntries(values.entries)
  if (entries.length === 0) throw new Error(t.errors.bookmarksEmpty)

  return usingPdf(await readPdf(file), (doc) => {
    const total = doc.countPages()
    for (const entry of entries) {
      if (!entry.title) throw new Error(t.errors.bookmarkTitle)
      if (!Number.isInteger(entry.page) || entry.page < 1 || entry.page > total) {
        throw new Error(fmt(t.errors.bookmarkPage, { page: entry.page, total }))
      }
    }

    ctx.onProgress(0.5, t.progress.writingPdf)
    addOutline(doc, entries)
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.bookmarks}.pdf`, blob: pdfBlob(doc) }]
  })
}

import { fmt, t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { formatBytes } from '@/lib/files'
import { mupdf, openPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type PdfObject = InstanceType<typeof mupdf.PDFObject>
type Heading = { level: number; page: number }

/** Las estructuras patológicas pueden ser enormes; con esto el recorrido no se cuelga. */
const MAX_STRUCT_NODES = 200_000

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function result(label: string, state: string, detail: string): string {
  return `${label}: ${state} — ${detail}`
}

function output(file: File, lines: string[]) {
  return {
    name: `${baseName(file.name)}-${t.filenames.accessibility}.txt`,
    blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
  }
}

type StructSummary = { figures: number; figuresWithAlt: number; headings: Heading[]; pages: Set<number> }

/**
 * Recorre el árbol de estructura en orden lógico. Los roles propios se
 * traducen con el RoleMap, como haría un lector de pantalla.
 */
function walkStructure(root: PdfObject, pageOf: Map<number, number>): StructSummary {
  const summary: StructSummary = { figures: 0, figuresWithAlt: 0, headings: [], pages: new Set() }
  const roleMap = root.get('RoleMap')
  const seen = new Set<number>()
  let visited = 0

  const roleOf = (element: PdfObject): string | undefined => {
    let role = element.get('S')
    for (let hops = 0; hops < 8 && role.isName(); hops++) {
      const mapped = roleMap.isDictionary() ? roleMap.get(role.asName()) : null
      if (!mapped?.isName() || mapped.asName() === role.asName()) break
      role = mapped
    }
    return role.isName() ? role.asName().toUpperCase() : undefined
  }

  const visit = (node: PdfObject, page: number | undefined): void => {
    if (++visited > MAX_STRUCT_NODES) return
    if (node.isArray()) {
      node.forEach((child) => visit(child, page))
      return
    }
    if (!node.isDictionary()) return
    if (node.isIndirect()) {
      if (seen.has(node.asIndirect())) return
      seen.add(node.asIndirect())
    }
    const pg = node.get('Pg')
    const own = pg.isIndirect() ? pageOf.get(pg.asIndirect()) : undefined
    const current = own ?? page
    if (current !== undefined) summary.pages.add(current)

    const role = roleOf(node)
    if (role === 'FIGURE') {
      summary.figures++
      const alt = node.get('Alt')
      if (alt.isString() && hasText(alt.asString())) summary.figuresWithAlt++
    }
    if (role && /^H[1-6]$/.test(role) && current !== undefined) {
      summary.headings.push({ level: Number(role.slice(1)), page: current })
    }
    visit(node.get('K'), current)
  }

  visit(root.get('K'), undefined)
  return summary
}

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const lines = [
    t.accessibility.title,
    `${t.accessibility.file}: ${file.name}`,
    `${t.accessibility.size}: ${formatBytes(file.size)}`,
  ]

  if ((await encryptionState(data)) === 'encrypted') {
    lines.push('', `${t.accessibility.unavailable}:`, `- ${t.report.encryptedContent}`, '', t.accessibility.disclaimer, t.accessibility.footer)
    return [output(file, lines)]
  }

  let doc: InstanceType<typeof mupdf.PDFDocument>
  try {
    doc = openPdf(data, file.name)
  } catch {
    lines.push('', `${t.accessibility.unavailable}:`, `- ${t.report.unavailableDetails}`, '', t.accessibility.disclaimer, t.accessibility.footer)
    return [output(file, lines)]
  }

  return usingPdf(doc, async () => {
    const total = doc.countPages()
    const title = hasText(doc.getMetaData(mupdf.Document.META_INFO_TITLE))
    const catalog = doc.getTrailer().get('Root')
    // `getLanguage` pasa por un enumerado y pierde la región («es-ES» → «es»).
    const lang = catalog.get('Lang')
    const language = (lang.isString() && lang.asString().trim()) || null
    // `get` sobre el objeto nulo de MuPDF lanza: cada nivel se comprueba antes.
    const markInfo = catalog.get('MarkInfo')
    const marked = markInfo.isDictionary() ? markInfo.get('Marked') : null
    const isMarked = Boolean(marked?.isBoolean() && marked.asBoolean())

    // Los nodos de estructura apuntan a su página por referencia: hace falta el índice.
    const pageOf = new Map<number, number>()
    const pageErrors: number[] = []
    for (let index = 0; index < total; index++) {
      try {
        const ref = doc.findPage(index)
        if (ref.isIndirect()) pageOf.set(ref.asIndirect(), index + 1)
      } catch {
        pageErrors.push(index + 1)
      }
      ctx.onProgress((index + 1) / total, fmt(t.progress.page, { n: index + 1 }))
      if (index % 50 === 49) await yieldToUI()
    }

    const treeRoot = catalog.get('StructTreeRoot')
    const structure = treeRoot.isDictionary()
      ? walkStructure(treeRoot, pageOf)
      : { figures: 0, figuresWithAlt: 0, headings: [], pages: new Set<number>() }
    const tagged = isMarked || structure.pages.size > 0
    const { figures, figuresWithAlt, headings } = structure

    const headingJumps: string[] = []
    for (let index = 1; index < headings.length; index++) {
      const previous = headings[index - 1]
      const current = headings[index]
      if (current.level > previous.level + 1) {
        headingJumps.push(`H${previous.level} → H${current.level} (${t.report.page} ${current.page})`)
      }
    }

    lines.push('', t.accessibility.result)
    lines.push(
      result(
        t.accessibility.titleCheck,
        title ? t.accessibility.pass : t.accessibility.fail,
        title ? t.accessibility.titlePresent : t.accessibility.titleMissing,
      ),
      result(
        t.accessibility.language,
        language ? t.accessibility.pass : t.accessibility.fail,
        language ? fmt(t.accessibility.languagePresent, { value: language }) : t.accessibility.languageMissing,
      ),
      result(
        t.accessibility.tagging,
        tagged ? t.accessibility.pass : t.accessibility.fail,
        tagged ? t.accessibility.taggingPresent : t.accessibility.taggingMissing,
      ),
    )

    if (figures === 0) {
      lines.push(result(t.accessibility.altText, t.accessibility.unknown, t.accessibility.noFigures))
    } else {
      lines.push(
        result(
          t.accessibility.altText,
          figuresWithAlt === figures ? t.accessibility.pass : t.accessibility.warning,
          `${fmt(t.accessibility.altSummary, { withAlt: figuresWithAlt, total: figures })} ${figuresWithAlt === figures ? '' : t.accessibility.altMissing}`.trim(),
        ),
      )
    }

    lines.push(
      result(
        t.accessibility.headings,
        headings.length > 0 && headingJumps.length === 0 ? t.accessibility.pass : headings.length > 0 ? t.accessibility.warning : t.accessibility.unknown,
        headings.length === 0
          ? t.accessibility.headingsMissing
          : `${fmt(t.accessibility.headingsSummary, { value: headings.map((heading) => `H${heading.level}`).join(', ') })} ${headingJumps.length > 0 ? fmt(t.accessibility.headingsOrder, { value: headingJumps.join(', ') }) : t.accessibility.headingsOk}`,
      ),
      result(t.accessibility.contrast, t.accessibility.unknown, t.accessibility.contrastUnknown),
    )

    if (pageErrors.length > 0) lines.push('', `${t.accessibility.unavailable}:`, ...pageErrors.map((page) => `${t.report.page} ${page}: ${t.accessibility.pageError}`))
    lines.push('', t.accessibility.disclaimer, '', t.accessibility.footer)
    return [output(file, lines)]
  })
}

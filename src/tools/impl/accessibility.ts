import { fmt, t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { formatBytes } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { getPdfDocument } from '@/lib/pdfjs'
import type { ToolRun } from '@/tools/types'

type AccessibilityNode = {
  role?: string
  alt?: string
  children?: AccessibilityNode[]
}

type Heading = { level: number; page: number }

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function walk(node: AccessibilityNode, visit: (node: AccessibilityNode) => void): void {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
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

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files
  const data = new Uint8Array(await file.arrayBuffer())
  const lines = [
    t.accessibility.title,
    `${t.accessibility.file}: ${file.name}`,
    `${t.accessibility.size}: ${formatBytes(file.size)}`,
  ]

  if ((await encryptionState(data)) === 'encrypted') {
    lines.push(
      '',
      `${t.accessibility.unavailable}:`,
      `- ${t.report.encryptedContent}`,
      '',
      t.accessibility.disclaimer,
      t.accessibility.footer,
    )
    return [output(file, lines)]
  }

  const task = getPdfDocument(data)
  try {
    let document_: Awaited<typeof task.promise>
    try {
      document_ = await task.promise
    } catch {
      lines.push('', `${t.accessibility.unavailable}:`, `- ${t.report.unavailableDetails}`, '', t.accessibility.disclaimer, t.accessibility.footer)
      return [output(file, lines)]
    }

    const metadata = await document_.getMetadata().catch(() => null)
    const info = (metadata?.info ?? {}) as Record<string, unknown>
    const title = hasText(info.Title)
    const markInfo = await document_.getMarkInfo().catch(() => null)
    let language: string | null = null
    let structurePages = 0
    let figures = 0
    let figuresWithAlt = 0
    const headings: Heading[] = []
    const pageErrors: number[] = []

    for (let number = 1; number <= document_.numPages; number++) {
      try {
        const page = await document_.getPage(number)
        const text = await page.getTextContent()
        if (!language && hasText(text.lang)) language = text.lang.trim()
        const tree = (await page.getStructTree().catch(() => null)) as AccessibilityNode | null
        if (tree) {
          structurePages++
          walk(tree, (node) => {
            const role = node.role?.toUpperCase()
            if (role === 'FIGURE') {
              figures++
              if (hasText(node.alt)) figuresWithAlt++
            }
            if (role && /^H[1-6]$/.test(role)) headings.push({ level: Number(role.slice(1)), page: number })
          })
        }
        page.cleanup()
      } catch {
        pageErrors.push(number)
      }
      ctx.onProgress(number / document_.numPages, fmt(t.progress.page, { n: number }))
    }

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
        markInfo?.Marked || structurePages > 0 ? t.accessibility.pass : t.accessibility.fail,
        markInfo?.Marked || structurePages > 0 ? t.accessibility.taggingPresent : t.accessibility.taggingMissing,
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
  } finally {
    await task.destroy()
  }
}

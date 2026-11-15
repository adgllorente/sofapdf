import { fmt, t } from '@/i18n'
import { pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { Overlay, hexColor } from '@/lib/overlay'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const LEGACY_COLORS: Record<string, string> = {
  gray: '#808080',
  red: '#d93333',
  blue: '#3366d9',
  black: '#1a1a1a',
}

type Anchor = { x: (width: number, margin: number) => number; y: (height: number, margin: number) => number }

const ANCHORS: Record<string, Anchor> = {
  center: { x: (w) => w / 2, y: (h) => h / 2 },
  'top-left': { x: (_, m) => m, y: (h, m) => h - m },
  'top-center': { x: (w) => w / 2, y: (h, m) => h - m },
  'top-right': { x: (w, m) => w - m, y: (h, m) => h - m },
  'bottom-left': { x: (_, m) => m, y: (_, m) => m },
  'bottom-center': { x: (w) => w / 2, y: (_, m) => m },
  'bottom-right': { x: (w, m) => w - m, y: (_, m) => m },
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  return usingPdf(await readPdf(file), async (doc) => {
    // Helvetica Bold es base del formato: no embebe nada y da cuerpo a la marca.
    const overlay = new Overlay(doc)
    const text = String(values.text).trim() || 'WATERMARK'
    const size = Number(values.size)
    const opacity = Number(values.opacity) / 100
    const angle = Number(values.rotation)
    const anchor = ANCHORS[String(values.position)] ?? ANCHORS.center
    const color = hexColor(LEGACY_COLORS[String(values.color)] ?? String(values.color))
    // Margen mínimo para que la marca no choque con el borde ni con sí misma rotada.
    const margin = Math.max(size / 2 + 8, 36)
    const textWidth = overlay.textWidth('Helvetica-Bold', text, size)
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const targets = parsePageList(String(values.pages), doc.countPages())
    try {
      for (const [index, pageIndex] of targets.entries()) {
        const page = overlay.page(pageIndex)
        const targetX = page.x0 + anchor.x(page.width, margin)
        const targetY = page.y0 + anchor.y(page.height, margin)

        // Girar alrededor del centro del texto: el ángulo es antihorario, como el del espacio PDF.
        page.save()
        page.alpha(opacity * color.alpha)
        page.fill(color.rgb)
        page.transform([cos, sin, -sin, cos, targetX, targetY])
        page.text(text, -textWidth / 2, -size / 2, 'Helvetica-Bold', size)
        page.restore()
        page.finish()

        ctx.onProgress((index + 1) / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))
        await yieldToUI()
      }
      return [{ name: `${baseName(file.name)}-${t.filenames.watermark}.pdf`, blob: pdfBlob(doc) }]
    } finally {
      overlay.dispose()
    }
  })
}

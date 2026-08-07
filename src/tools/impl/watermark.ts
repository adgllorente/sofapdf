import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName, parsePageList } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type Rgb = readonly [number, number, number]

const COLORS: Record<string, Rgb> = {
  gray: [0.5, 0.5, 0.5],
  red: [0.85, 0.2, 0.2],
  blue: [0.2, 0.4, 0.85],
  black: [0.1, 0.1, 0.1],
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
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  // Helvetica Bold es base del formato: no embebe nada y da cuerpo a la marca.
  const font = await document_.embedFont(StandardFonts.HelveticaBold)

  const text = String(values.text).trim() || 'WATERMARK'
  const size = Number(values.size)
  const opacity = Number(values.opacity) / 100
  const angle = Number(values.rotation)
  const position = String(values.position)
  const anchor = ANCHORS[position] ?? ANCHORS.center
  const [cr, cg, cb] = COLORS[String(values.color)] ?? COLORS.gray
  // Margen mínimo para que la marca no choque con el borde ni con sí misma rotada.
  const margin = Math.max(size / 2 + 8, 36)

  const pages = document_.getPages()
  const targets = parsePageList(String(values.pages), pages.length)

  for (const [index, pageIndex] of targets.entries()) {
    const page = pages[pageIndex]
    const { width, height } = page.getSize()
    const targetX = anchor.x(width, margin)
    const targetY = anchor.y(height, margin)

    // pdf-lib rota el texto alrededor de (x, y), no de su centro. Resolvemos
    // (x, y) para que, tras rotar, el centro del texto quede en (targetX, targetY).
    const textWidth = font.widthOfTextAtSize(text, size)
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const x = targetX - (textWidth / 2) * cos + (size / 2) * sin
    const y = targetY - (textWidth / 2) * sin - (size / 2) * cos

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(cr, cg, cb),
      opacity,
      rotate: degrees(angle),
    })

    ctx.onProgress((index + 1) / targets.length, fmt(t.progress.page, { n: pageIndex + 1 }))
  }

  return [
    {
      name: `${baseName(file.name)}-${t.filenames.watermark}.pdf`,
      blob: toBlob(await document_.save()),
    },
  ]
}

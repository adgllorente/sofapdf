import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf, yieldToUI } from '@/lib/mupdf'
import { Overlay, hexColor, num, rotationAround, type PageCanvas, type StandardFont } from '@/lib/overlay'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

type Point = { x: number; y: number }
type EditObject = {
  type: 'text' | 'image' | 'pencil' | 'rect' | 'ellipse' | 'triangle' | 'highlight' | 'underlineText' | 'strikeText'; page: number; x: number; y: number
  width: number; height: number; color: string; bgColor: string; borderColor: string
  borderWidth: number; opacity: number; font: string; fontSize: number; bold: boolean
  italic: boolean; underline: boolean; align: string; text: string; points?: Point[]; imageData?: string
  rotation: number
}

/** Aproximación estándar de un cuarto de elipse con una Bézier cúbica. */
const KAPPA = 0.5523

function fontName(item: EditObject): StandardFont {
  const style = item.bold && item.italic ? 3 : item.bold ? 1 : item.italic ? 2 : 0
  if (item.font === 'Courier') return (['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'] as const)[style]
  if (item.font === 'Times' || item.font === 'TimesRoman') return (['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'] as const)[style]
  return (['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'] as const)[style]
}

function dataUrlBytes(value: string): Uint8Array {
  const binary = atob(value.split(',')[1] ?? '')
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function rotatePoint(point: Point, item: EditObject): Point {
  const angle = ((item.rotation ?? 0) * Math.PI) / 180
  const center = { x: item.x + item.width / 2, y: item.y + item.height / 2 }
  const x = point.x - center.x, y = point.y - center.y
  return { x: center.x + x * Math.cos(angle) - y * Math.sin(angle), y: center.y + x * Math.sin(angle) + y * Math.cos(angle) }
}

/** Relleno y trazo opcionales: un color transparente o un grosor 0 no se pintan. */
function paintShape(page: PageCanvas, item: EditObject, opacity: number, path: string): void {
  const fill = hexColor(item.bgColor)
  const border = hexColor(item.borderColor)
  const hasFill = fill.alpha > 0
  const hasStroke = border.alpha > 0 && item.borderWidth > 0
  if (!hasFill && !hasStroke) return
  page.alpha(opacity * fill.alpha, opacity * border.alpha)
  if (hasFill) page.fill(fill.rgb)
  if (hasStroke) {
    page.stroke(border.rgb)
    page.ops.push(`${num(item.borderWidth)} w`)
  }
  page.ops.push(`${path} ${hasFill && hasStroke ? 'B' : hasFill ? 'f' : 'S'}`)
}

function line(page: PageCanvas, color: string, opacity: number, width: number, from: Point, to: Point): void {
  const stroke = hexColor(color)
  if (stroke.alpha === 0) return
  page.alpha(1, opacity * stroke.alpha)
  page.stroke(stroke.rgb)
  page.ops.push(`${num(Math.max(1, width))} w 1 J ${num(from.x)} ${num(from.y)} m ${num(to.x)} ${num(to.y)} l S`)
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  let objects: EditObject[] = []
  try { objects = JSON.parse(String(values.editor ?? '[]')) as EditObject[] } catch { /* El editor solo puede producir JSON controlado. */ }
  if (!objects.length) throw new Error(t.errors.editEmpty)

  return usingPdf(await readPdf(file), async (doc) => {
    const overlay = new Overlay(doc)
    const images = new Map<string, { ref: mupdf.PDFObject; width: number; height: number }>()
    const pages = new Map<number, PageCanvas>()
    const count = doc.countPages()

    try {
      for (const [index, item] of objects.entries()) {
        if (item.page < 1 || item.page > count) continue
        let page = pages.get(item.page)
        if (!page) { page = overlay.page(item.page - 1); pages.set(item.page, page) }

        const w = item.width * page.width, h = item.height * page.height
        const x = page.x0 + item.x * page.width
        const y = page.y0 + page.height - (item.y + item.height) * page.height
        const opacity = Math.max(0, Math.min(1, Number.isFinite(item.opacity) ? item.opacity : 1))

        page.save()
        // La vista previa gira con CSS alrededor del centro y en sentido horario.
        if (item.type !== 'pencil' && item.rotation) page.transform(rotationAround(x + w / 2, y + h / 2, item.rotation))

        if (item.type === 'highlight') {
          const fill = hexColor(item.color)
          if (fill.alpha > 0) {
            page.alpha(opacity * fill.alpha)
            page.fill(fill.rgb)
            page.ops.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`)
          }
        } else if (item.type === 'underlineText' || item.type === 'strikeText') {
          const lineY = item.type === 'strikeText' ? y + h / 2 : y + item.borderWidth
          line(page, item.color, opacity, item.borderWidth, { x, y: lineY }, { x: x + w, y: lineY })
        } else if (item.type === 'text') {
          drawText(overlay, page, item, opacity, x, y, w, h)
        } else if (item.type === 'image' && item.imageData) {
          const key = item.imageData
          let image = images.get(key)
          if (!image) {
            const decoded = new mupdf.Image(dataUrlBytes(item.imageData))
            image = { ref: doc.addImage(decoded), width: decoded.getWidth(), height: decoded.getHeight() }
            decoded.destroy()
            images.set(key, image)
          }
          // La vista previa usa object-contain: la imagen conserva su proporción dentro de la caja.
          const scale = Math.min(w / image.width, h / image.height)
          const iw = image.width * scale, ih = image.height * scale
          page.alpha(opacity)
          page.image(image.ref, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
        } else if (item.type === 'pencil') {
          const points = (item.points ?? []).map((point) => rotatePoint(point, item))
          const stroke = hexColor(item.color)
          if (points.length > 1 && stroke.alpha > 0) {
            // Un único trazo: con segmentos sueltos la opacidad se acumula en cada unión.
            const at = (p: Point) => `${num(page.x0 + p.x * page.width)} ${num(page.y0 + page.height - p.y * page.height)}`
            page.alpha(1, opacity * stroke.alpha)
            page.stroke(stroke.rgb)
            page.ops.push(`${num(Math.max(1, item.borderWidth))} w 1 J 1 j ${at(points[0])} m ${points.slice(1).map((p) => `${at(p)} l`).join(' ')} S`)
          }
        } else if (item.type === 'ellipse') {
          const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2, kx = rx * KAPPA, ky = ry * KAPPA
          const path = [
            `${num(cx + rx)} ${num(cy)} m`,
            `${num(cx + rx)} ${num(cy + ky)} ${num(cx + kx)} ${num(cy + ry)} ${num(cx)} ${num(cy + ry)} c`,
            `${num(cx - kx)} ${num(cy + ry)} ${num(cx - rx)} ${num(cy + ky)} ${num(cx - rx)} ${num(cy)} c`,
            `${num(cx - rx)} ${num(cy - ky)} ${num(cx - kx)} ${num(cy - ry)} ${num(cx)} ${num(cy - ry)} c`,
            `${num(cx + kx)} ${num(cy - ry)} ${num(cx + rx)} ${num(cy - ky)} ${num(cx + rx)} ${num(cy)} c h`,
          ].join(' ')
          paintShape(page, item, opacity, path)
        } else if (item.type === 'triangle') {
          // Vértice arriba y base abajo, como el polígono de la vista previa.
          paintShape(page, item, opacity, `${num(x + w / 2)} ${num(y + h)} m ${num(x + w)} ${num(y)} l ${num(x)} ${num(y)} l h`)
        } else {
          paintShape(page, item, opacity, `${num(x)} ${num(y)} ${num(w)} ${num(h)} re`)
        }

        page.restore()
        ctx.onProgress((index + 1) / objects.length, fmt(t.progress.page, { n: item.page }))
        await yieldToUI()
      }

      for (const page of pages.values()) page.finish()
      return [{ name: `${baseName(file.name)}-${t.filenames.edited}.pdf`, blob: pdfBlob(doc) }]
    } finally {
      overlay.dispose()
    }
  })
}

function drawText(overlay: Overlay, page: PageCanvas, item: EditObject, opacity: number, x: number, y: number, w: number, h: number): void {
  const background = hexColor(item.bgColor)
  if (background.alpha > 0) {
    page.alpha(opacity * background.alpha)
    page.fill(background.rgb)
    page.ops.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`)
  }

  const color = hexColor(item.color)
  if (color.alpha === 0) return
  const font = fontName(item)
  const size = Math.max(4, item.fontSize || 18)
  const lines = (item.text ?? '').replace(/\r\n/g, '\n').split('\n')
  for (const [index, text] of lines.entries()) {
    const textWidth = overlay.textWidth(font, text, size)
    const textX = item.align === 'center' ? x + (w - textWidth) / 2 : item.align === 'right' ? x + w - textWidth : x
    const baseline = y + h - size - 3 - index * size
    page.alpha(opacity * color.alpha)
    page.fill(color.rgb)
    page.text(text, textX, baseline, font, size)
    if (item.underline && text) {
      line(page, item.color, opacity, item.borderWidth, { x: textX, y: baseline - 2 }, { x: textX + textWidth, y: baseline - 2 })
    }
  }
}

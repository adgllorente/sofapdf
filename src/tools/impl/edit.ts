import { LineCapStyle, PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
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

function color(value: string) {
  if (value === 'transparent') return undefined
  const hex = value.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex
  const rgbValue = [0, 1, 2].map((index) => parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255)
  return rgb(rgbValue[0] || 0, rgbValue[1] || 0, rgbValue[2] || 0)
}

async function dataUrlBytes(value: string) {
  const encoded = value.split(',')[1] ?? ''
  const binary = atob(encoded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function fontName(item: EditObject) {
  const base = item.font === 'Times' ? 'TimesRoman' : item.font
  if (base === 'Courier') return item.bold && item.italic ? StandardFonts.CourierBoldOblique : item.bold ? StandardFonts.CourierBold : item.italic ? StandardFonts.CourierOblique : StandardFonts.Courier
  if (base === 'TimesRoman') return item.bold && item.italic ? StandardFonts.TimesRomanBoldItalic : item.bold ? StandardFonts.TimesRomanBold : item.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman
  return item.bold && item.italic ? StandardFonts.HelveticaBoldOblique : item.bold ? StandardFonts.HelveticaBold : item.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica
}

function rotatePoint(point: Point, item: EditObject): Point {
  const angle = ((item.rotation ?? 0) * Math.PI) / 180
  const center = { x: item.x + item.width / 2, y: item.y + item.height / 2 }
  const x = point.x - center.x, y = point.y - center.y
  return { x: center.x + x * Math.cos(angle) - y * Math.sin(angle), y: center.y + x * Math.sin(angle) + y * Math.cos(angle) }
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  let objects: EditObject[] = []
  try { objects = JSON.parse(String(values.editor ?? '[]')) as EditObject[] } catch { /* El editor solo puede producir JSON controlado. */ }
  if (!objects.length) throw new Error(t.errors.editEmpty)
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const pages = document_.getPages()
  const fonts = new Map<string, Awaited<ReturnType<typeof document_.embedFont>>>()
  const images = new Map<string, Awaited<ReturnType<typeof document_.embedPng>>>()

  for (const [index, item] of objects.entries()) {
    const page = pages[item.page - 1]
    if (!page) continue
    const { width, height } = page.getSize()
    const x = item.x * width, y = height - (item.y + item.height) * height
    const opacity = Math.max(0.05, Math.min(1, item.opacity || 1))
    if (item.type === 'highlight') {
      page.drawRectangle({ x, y, width: item.width * width, height: item.height * height, color: color(item.color), opacity, rotate: degrees(item.rotation ?? 0) })
    } else if (item.type === 'underlineText' || item.type === 'strikeText') {
      const lineY = item.type === 'strikeText' ? y + item.height * height / 2 : y + item.borderWidth
      page.drawLine({ start: { x, y: lineY }, end: { x: x + item.width * width, y: lineY }, thickness: Math.max(1, item.borderWidth), color: color(item.color), opacity })
    } else if (item.type === 'text') {
      const key = fontName(item)
      let font = fonts.get(key)
      if (!font) { font = await document_.embedFont(key); fonts.set(key, font) }
      const size = Math.max(4, item.fontSize || 18)
      const textWidth = font.widthOfTextAtSize(item.text || ' ', size)
      const textX = item.align === 'center' ? x + (item.width * width - textWidth) / 2 : item.align === 'right' ? x + item.width * width - textWidth : x
      page.drawRectangle({ x, y, width: item.width * width, height: item.height * height, color: color(item.bgColor), opacity, borderColor: color(item.borderColor), borderWidth: 0, rotate: degrees(item.rotation ?? 0) })
      page.drawText(item.text.replace(/\r\n/g, '\n'), { x: textX, y: y + item.height * height - size - 3, size, font, color: color(item.color), opacity, lineHeight: size, rotate: degrees(item.rotation ?? 0) })
      if (item.underline) page.drawLine({ start: { x: textX, y: y + item.height * height - size - 5 }, end: { x: textX + textWidth, y: y + item.height * height - size - 5 }, thickness: Math.max(1, item.borderWidth), color: color(item.color), opacity, lineCap: LineCapStyle.Round })
    } else if (item.type === 'image' && item.imageData) {
      const key = item.imageData.slice(0, 40)
      let image = images.get(key)
      if (!image) { const bytes = await dataUrlBytes(item.imageData); image = item.imageData.startsWith('data:image/jpeg') ? await document_.embedJpg(bytes) : await document_.embedPng(bytes); images.set(key, image) }
      page.drawImage(image, { x, y, width: item.width * width, height: item.height * height, opacity, rotate: degrees(item.rotation ?? 0) })
    } else if (item.type === 'pencil') {
      const points = item.points ?? []
      for (let point = 1; point < points.length; point++) { const start = rotatePoint(points[point - 1], item), end = rotatePoint(points[point], item); page.drawLine({ start: { x: start.x * width, y: height - start.y * height }, end: { x: end.x * width, y: height - end.y * height }, thickness: Math.max(1, item.borderWidth), color: color(item.color), opacity, lineCap: LineCapStyle.Round }) }
    } else if (item.type === 'ellipse') page.drawEllipse({ x: x + item.width * width / 2, y: y + item.height * height / 2, xScale: item.width * width / 2, yScale: item.height * height / 2, color: color(item.bgColor), borderColor: color(item.borderColor), borderWidth: item.borderWidth, opacity, borderOpacity: opacity, rotate: degrees(item.rotation ?? 0) })
    else if (item.type === 'triangle') page.drawSvgPath(`M 0 0 L ${item.width * width} 0 L ${item.width * width / 2} ${item.height * height} Z`, { x, y, color: color(item.bgColor), borderColor: color(item.borderColor), borderWidth: item.borderWidth, opacity, borderOpacity: opacity, rotate: degrees(item.rotation ?? 0) })
    else page.drawRectangle({ x, y, width: item.width * width, height: item.height * height, color: color(item.bgColor), borderColor: color(item.borderColor), borderWidth: item.borderWidth, opacity, borderOpacity: opacity, rotate: degrees(item.rotation ?? 0) })
    ctx.onProgress((index + 1) / objects.length, fmt(t.progress.page, { n: item.page }))
  }
  return [{ name: `${baseName(file.name)}-${t.filenames.edited}.pdf`, blob: toBlob(await document_.save()) }]
}

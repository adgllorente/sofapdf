// Dibujo sobre páginas existentes con MuPDF: añade un content stream propio
// sin reescribir el original. Las coordenadas son las del espacio PDF (origen
// abajo a la izquierda), no las de MuPDF, que tienen el origen arriba.
import { mupdf } from '@/lib/mupdf'
import { parseHexColor } from '@/lib/colors'

export type StandardFont =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Helvetica-Oblique'
  | 'Helvetica-BoldOblique'
  | 'Times-Roman'
  | 'Times-Bold'
  | 'Times-Italic'
  | 'Times-BoldItalic'
  | 'Courier'
  | 'Courier-Bold'
  | 'Courier-Oblique'
  | 'Courier-BoldOblique'

export type Rgb = [number, number, number]

/** Tramo 0x80–0x9F de WinAnsi; el resto de Latin-1 coincide con Unicode. */
const WIN_ANSI_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
}

const QUESTION_MARK = 0x3f

/** Las fuentes base no cubren más que WinAnsi: lo demás sale como «?». */
function winAnsi(codePoint: number): number {
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint
  return WIN_ANSI_EXTRA[codePoint] ?? QUESTION_MARK
}

function unicodeOf(code: number): number {
  if (code < 0x80 || code >= 0xa0) return code
  for (const [unicode, ansi] of Object.entries(WIN_ANSI_EXTRA)) if (ansi === code) return Number(unicode)
  return QUESTION_MARK
}

export function num(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : '0'
}

export function hexColor(value: string): { rgb: Rgb; alpha: number } {
  const color = parseHexColor(value)
  return { rgb: [color.red, color.green, color.blue], alpha: color.alpha }
}

/** Matriz que gira `degrees` en sentido horario visual alrededor de (cx, cy). */
export function rotationAround(cx: number, cy: number, degrees: number): number[] {
  const rad = (-degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [cos, sin, -sin, cos, cx - cx * cos + cy * sin, cy - cx * sin - cy * cos]
}

export class Overlay {
  private fonts = new Map<StandardFont, { font: mupdf.Font; ref: mupdf.PDFObject }>()

  readonly doc: mupdf.PDFDocument

  constructor(doc: mupdf.PDFDocument) {
    this.doc = doc
  }

  font(name: StandardFont) {
    let entry = this.fonts.get(name)
    if (!entry) {
      const font = new mupdf.Font(name)
      // Las 14 fuentes base no se incrustan: no pesan nada en el fichero.
      entry = { font, ref: this.doc.addSimpleFont(font, 'Latin') }
      this.fonts.set(name, entry)
    }
    return entry
  }

  textWidth(name: StandardFont, text: string, size: number): number {
    const { font } = this.font(name)
    let width = 0
    for (const char of text) {
      width += font.advanceGlyph(font.encodeCharacter(unicodeOf(winAnsi(char.codePointAt(0) ?? 0))))
    }
    return width * size
  }

  page(index: number): PageCanvas {
    return new PageCanvas(this, this.doc.findPage(index))
  }

  dispose(): void {
    for (const { font } of this.fonts.values()) font.destroy()
    this.fonts.clear()
  }
}

export class PageCanvas {
  readonly ops: string[] = []
  readonly x0: number
  readonly y0: number
  readonly width: number
  readonly height: number
  private names = new Map<string, string>()
  private resources: mupdf.PDFObject
  private overlay: Overlay
  private pageObj: mupdf.PDFObject

  constructor(overlay: Overlay, pageObj: mupdf.PDFObject) {
    this.overlay = overlay
    this.pageObj = pageObj
    const box = pageObj.getInheritable('MediaBox')
    const [a, b, c, d] = [0, 1, 2, 3].map((i) => box.get(i).asNumber())
    this.x0 = Math.min(a, c)
    this.y0 = Math.min(b, d)
    this.width = Math.abs(c - a) || 612
    this.height = Math.abs(d - b) || 792
    this.resources = this.ownResources()
  }

  /** Recursos propios de la página: los heredados se copian para no tocar a las hermanas. */
  private ownResources(): mupdf.PDFObject {
    const doc = this.overlay.doc
    if (this.pageObj.get('Resources').isNull()) {
      const copy = doc.newDictionary()
      const inherited = this.pageObj.getInheritable('Resources')
      if (!inherited.isNull()) inherited.forEach((value, key) => copy.put(key, value))
      this.pageObj.put('Resources', copy)
    }
    return this.pageObj.get('Resources')
  }

  private resource(category: 'Font' | 'ExtGState' | 'XObject', key: string, value: () => mupdf.PDFObject): string {
    const cacheKey = `${category}:${key}`
    const cached = this.names.get(cacheKey)
    if (cached) return cached
    if (this.resources.get(category).isNull()) this.resources.put(category, this.overlay.doc.newDictionary())
    const dict = this.resources.get(category)
    let n = 0
    while (!dict.get(`Sofa${category[0]}${n}`).isNull()) n++
    const name = `Sofa${category[0]}${n}`
    dict.put(name, value())
    this.names.set(cacheKey, name)
    return name
  }

  save(): void {
    this.ops.push('q')
  }

  restore(): void {
    this.ops.push('Q')
  }

  transform(m: number[]): void {
    this.ops.push(`${m.map(num).join(' ')} cm`)
  }

  fill(rgb: Rgb): void {
    this.ops.push(`${rgb.map(num).join(' ')} rg`)
  }

  stroke(rgb: Rgb): void {
    this.ops.push(`${rgb.map(num).join(' ')} RG`)
  }

  /** Siempre emite el estado: un 1 tiene que deshacer una opacidad previa del mismo bloque. */
  alpha(fill: number, stroke = fill): void {
    const key = `${num(fill)}/${num(stroke)}`
    const name = this.resource('ExtGState', key, () =>
      this.overlay.doc.addObject({ Type: 'ExtGState', ca: Math.max(0, fill), CA: Math.max(0, stroke) }),
    )
    this.ops.push(`/${name} gs`)
  }

  /** Una línea de texto con la línea base en (x, y). */
  text(text: string, x: number, y: number, font: StandardFont, size: number): void {
    const name = this.resource('Font', font, () => this.overlay.font(font).ref)
    let hex = ''
    for (const char of text) hex += winAnsi(char.codePointAt(0) ?? 0).toString(16).padStart(2, '0')
    this.ops.push(`BT /${name} ${num(size)} Tf ${num(x)} ${num(y)} Td <${hex}> Tj ET`)
  }

  image(ref: mupdf.PDFObject, x: number, y: number, width: number, height: number): void {
    const name = this.resource('XObject', String(ref.asIndirect()), () => ref)
    this.ops.push(`q ${num(width)} 0 0 ${num(height)} ${num(x)} ${num(y)} cm /${name} Do Q`)
  }

  /** Envuelve el contenido original en q/Q para que su estado gráfico no se filtre al nuestro. */
  finish(): void {
    if (!this.ops.length) return
    const doc = this.overlay.doc
    const contents = this.pageObj.get('Contents')
    const list = doc.newArray()
    list.push(doc.addStream('q\n', {}))
    if (contents.isArray()) contents.forEach((value) => list.push(value))
    else if (!contents.isNull()) list.push(contents)
    list.push(doc.addStream(`Q\n${this.ops.join('\n')}\n`, {}))
    this.pageObj.put('Contents', list)
    this.ops.length = 0
  }
}

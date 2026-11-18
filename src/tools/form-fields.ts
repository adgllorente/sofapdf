import type { PDFDocumentProxy } from 'pdfjs-dist'

/** Texto, desplegable y radio guardan cadena; las casillas, booleano. */
export type FormValue = string | boolean

export type FormWidgetKind = 'text' | 'checkbox' | 'radio' | 'select'

export type FormWidget = {
  id: string
  name: string
  kind: FormWidgetKind
  page: number
  /** Fracciones 0..1 de la página tal como se ve (ya rotada). */
  x: number
  y: number
  width: number
  height: number
  /** Giro en grados, en sentido horario, con el que se ve el contenido del campo. */
  rotation: number
  /** Ancho y alto del campo sin girar, relativos al ancho de la página. */
  fieldWidth: number
  fieldHeight: number
  pageWidthPt: number
  label: string
  multiline: boolean
  /** Lista desplegable (combo) frente a lista abierta (listbox). */
  combo: boolean
  maxLength?: number
  /** Estado «on» de una casilla o del botón de radio concreto. */
  onValue?: string
  options: { value: string; label: string }[]
}

export type FormOverview = {
  fieldCount: number
  pageCount: number
  xfaOnly: boolean
}

export type PageScan = {
  widgets: FormWidget[]
  initial: Record<string, FormValue>
}

export function parseFormValues(raw: unknown): Map<string, FormValue> {
  if (typeof raw !== 'string' || !raw) return new Map()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map()
    return new Map(
      Object.entries(parsed).filter(
        (entry): entry is [string, FormValue] =>
          typeof entry[1] === 'string' || typeof entry[1] === 'boolean',
      ),
    )
  } catch {
    return new Map()
  }
}

export function serializeFormValues(values: Map<string, FormValue>): string {
  return JSON.stringify(Object.fromEntries(values))
}

// Subconjunto de lo que pdf.js devuelve en getAnnotations() para un widget.
type WidgetData = {
  subtype?: string
  fieldType?: string
  fieldName?: string
  fieldValue?: unknown
  rect?: number[]
  hidden?: boolean
  readOnly?: boolean
  multiLine?: boolean
  maxLen?: number
  checkBox?: boolean
  radioButton?: boolean
  pushButton?: boolean
  exportValue?: string
  buttonValue?: string
  options?: { exportValue?: string; displayValue?: string }[]
  alternativeText?: string
  combo?: boolean
  rotation?: number
  id?: string
}

function widgetKind(data: WidgetData): FormWidgetKind | null {
  if (data.fieldType === 'Tx') return 'text'
  if (data.fieldType === 'Ch') return 'select'
  if (data.fieldType === 'Btn') {
    if (data.checkBox) return 'checkbox'
    if (data.radioButton) return 'radio'
  }
  // Firmas digitales y pulsadores no se rellenan.
  return null
}

function initialValue(kind: FormWidgetKind, data: WidgetData): FormValue {
  const raw = Array.isArray(data.fieldValue) ? data.fieldValue[0] : data.fieldValue
  const text = typeof raw === 'string' ? raw : ''
  if (kind === 'checkbox') return text !== '' && text !== 'Off'
  if (kind === 'radio') return text === 'Off' ? '' : text
  return text
}

const FILLABLE_TYPES = new Set(['text', 'checkbox', 'radiobutton', 'combobox', 'listbox'])

/** Cuenta los campos rellenables sin recorrer las páginas: un formulario largo no hace esperar. */
export async function inspectForm(doc: PDFDocumentProxy): Promise<FormOverview> {
  const objects = (await doc.getFieldObjects()) as Record<string, { type?: string }[]> | null
  const fieldCount = Object.values(objects ?? {}).filter((widgets) =>
    widgets.some((widget) => FILLABLE_TYPES.has(widget.type ?? '')),
  ).length
  const xfaOnly = Boolean((doc as PDFDocumentProxy & { isPureXfa?: boolean }).isPureXfa)
  return { fieldCount, pageCount: doc.numPages, xfaOnly }
}

/** Campos rellenables de una página, con su posición relativa a la página tal como se ve. */
export async function scanPage(doc: PDFDocumentProxy, number: number): Promise<PageScan> {
  const widgets: FormWidget[] = []
  const initial: Record<string, FormValue> = {}
  const page = await doc.getPage(number)
  try {
    const viewport = page.getViewport({ scale: 1 })
    const pageRotation = viewport.rotation
    const annotations = (await page.getAnnotations({ intent: 'display' })) as WidgetData[]
    for (const [index, data] of annotations.entries()) {
      if (data.subtype !== 'Widget' || data.hidden || !data.fieldName || !data.rect) continue
      // pdf.js ya pinta en el canvas los campos de solo lectura: un control encima los duplicaría.
      if (data.readOnly) continue
      const kind = widgetKind(data)
      if (!kind) continue
      const [x1, y1] = viewport.convertToViewportPoint(data.rect[0], data.rect[1]) as number[]
      const [x2, y2] = viewport.convertToViewportPoint(data.rect[2], data.rect[3]) as number[]
      const left = Math.min(x1, x2)
      const top = Math.min(y1, y2)
      const width = Math.abs(x2 - x1)
      const height = Math.abs(y2 - y1)
      // /MK /R gira el campo en sentido antihorario; /Rotate gira la página en horario.
      const rotation = (((pageRotation - (data.rotation ?? 0)) % 360) + 360) % 360
      const sideways = rotation % 180 !== 0
      widgets.push({
        id: data.id ?? `${number}-${index}`,
        name: data.fieldName,
        kind,
        page: number,
        x: left / viewport.width,
        y: top / viewport.height,
        width: width / viewport.width,
        height: height / viewport.height,
        rotation,
        fieldWidth: (sideways ? height : width) / viewport.width,
        fieldHeight: (sideways ? width : height) / viewport.width,
        pageWidthPt: viewport.width,
        label: data.alternativeText || data.fieldName,
        multiline: Boolean(data.multiLine),
        combo: Boolean(data.combo),
        maxLength: typeof data.maxLen === 'number' && data.maxLen > 0 ? data.maxLen : undefined,
        onValue: kind === 'checkbox' ? data.exportValue : kind === 'radio' ? data.buttonValue : undefined,
        options: (data.options ?? []).map((option) => ({
          value: option.exportValue ?? option.displayValue ?? '',
          label: option.displayValue ?? option.exportValue ?? '',
        })),
      })
      if (!(data.fieldName in initial)) initial[data.fieldName] = initialValue(kind, data)
      else if (kind === 'radio' && initial[data.fieldName] === '') {
        initial[data.fieldName] = initialValue(kind, data)
      }
    }
  } finally {
    page.cleanup()
  }
  return { widgets, initial }
}

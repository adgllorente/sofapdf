import { fmt, t } from '@/i18n'
import { mupdf, pdfBlob, readPdf, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import { parseFormValues, type FormValue } from '@/tools/form-fields'
import type { ToolRun } from '@/tools/types'

/** Estado «on» de una casilla o radio: la clave de /AP /N que no es /Off. */
function onState(widget: mupdf.PDFWidget): string | undefined {
  let state: string | undefined
  widget.getObject().get('AP', 'N').forEach((_value, key) => {
    if (typeof key === 'string' && key !== 'Off') state ??= key
  })
  return state
}

/** El valor /V vive en el campo: el primer antepasado con /T, que puede ser el propio widget. */
function fieldDict(widget: mupdf.PDFWidget): mupdf.PDFObject | undefined {
  let node = widget.getObject()
  while (!node.isNull()) {
    if (!node.get('T').isNull()) return node
    node = node.get('Parent')
  }
  return undefined
}

// Escribe /AS y /V a mano: toggle() alterna y no permite fijar un estado concreto.
function setButtons(
  doc: mupdf.PDFDocument,
  widgets: mupdf.PDFWidget[],
  isActive: (state: string) => boolean,
): void {
  let value = 'Off'
  for (const widget of widgets) {
    const state = onState(widget)
    const active = state !== undefined && isActive(state)
    widget.getObject().put('AS', doc.newName(active ? state : 'Off'))
    if (active) value = state
  }
  fieldDict(widgets[0])?.put('V', doc.newName(value))
}

function choose(widget: mupdf.PDFWidget, value: string): void {
  if (value === '') {
    widget.setChoiceValue('')
    return
  }
  const exports = widget.getOptions(true)
  if (exports.includes(value)) {
    widget.setChoiceValue(value)
    return
  }
  const index = widget.getOptions(false).indexOf(value)
  if (index >= 0) widget.setChoiceValue(exports[index])
  else if (widget.isComboBox()) widget.setChoiceValue(value)
}

function apply(doc: mupdf.PDFDocument, widgets: mupdf.PDFWidget[], value: FormValue): void {
  const [first] = widgets
  if (first.isText()) {
    const text = String(value)
    const max = first.getMaxLen()
    first.setTextValue(max > 0 ? text.slice(0, max) : text)
  } else if (first.isCheckbox()) {
    setButtons(doc, widgets, () => value === true)
  } else if (first.isRadioButton()) {
    const option = value === false ? '' : String(value)
    setButtons(doc, widgets, (state) => state === option)
  } else if (first.isChoice()) {
    choose(first, String(value))
  }
  for (const widget of widgets) widget.update()
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const edits = parseFormValues(values.fields)
  const flatten = values.flatten === true

  ctx.onProgress(0.1, t.progress.readingPdf)
  return usingPdf(await readPdf(file), (doc) => {
    const pages: mupdf.PDFPage[] = []
    try {
      const fields = new Map<string, mupdf.PDFWidget[]>()
      for (let index = 0; index < doc.countPages(); index++) {
        const page = doc.loadPage(index)
        pages.push(page)
        for (const widget of page.getWidgets()) {
          const name = widget.getName()
          const group = fields.get(name)
          if (group) group.push(widget)
          else fields.set(name, [widget])
        }
      }
      if (fields.size === 0) throw new Error(t.errors.formNoFields)
      if (edits.size === 0 && !flatten) throw new Error(t.errors.formEmpty)

      ctx.onProgress(0.4, t.progress.fillingForm)
      for (const [name, widgets] of fields) {
        const value = edits.get(name)
        if (value === undefined) continue
        try {
          apply(doc, widgets, value)
        } catch {
          throw new Error(fmt(t.errors.formField, { name }))
        }
      }

      if (flatten) {
        ctx.onProgress(0.7, t.progress.flattening)
        try {
          doc.bake(false, true)
        } catch {
          throw new Error(t.errors.flattenFailed)
        }
      }

      ctx.onProgress(0.85, t.progress.writingPdf)
      const blob = pdfBlob(doc)
      ctx.onProgress(1, t.progress.done)
      return [{ name: `${baseName(file.name)}-${t.filenames.filled}.pdf`, blob }]
    } finally {
      for (const page of pages) page.destroy()
    }
  })
}

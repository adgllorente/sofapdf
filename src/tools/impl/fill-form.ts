import {
  PDFBool,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  type PDFField,
  type PDFFont,
} from 'pdf-lib'
import { fmt, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { parseFormValues, type FormValue } from '@/tools/form-fields'
import type { ToolRun } from '@/tools/types'

function choose(field: PDFDropdown | PDFOptionList, value: string): void {
  if (value === '') {
    field.clear()
    return
  }
  const shown = field.getOptions()
  if (shown.includes(value)) {
    field.select(value)
    return
  }
  // pdf.js entrega el valor de exportación; pdf-lib selecciona por el texto mostrado.
  const match = field.acroField.getOptions().find((option) => option.value.decodeText() === value)
  const display = match?.display?.decodeText() ?? match?.value.decodeText()
  if (display !== undefined && shown.includes(display)) field.select(display)
  else if (field instanceof PDFDropdown && field.isEditable()) field.select(value, false)
}

function apply(field: PDFField, value: FormValue): void {
  if (field instanceof PDFTextField) {
    const text = String(value)
    const max = field.getMaxLength()
    field.setText(max !== undefined ? text.slice(0, max) : text)
  } else if (field instanceof PDFCheckBox) {
    if (value === true) field.check()
    else field.uncheck()
  } else if (field instanceof PDFRadioGroup) {
    const option = String(value)
    if (value === '' || value === false) field.clear()
    // Con /Opt pdf.js entrega el valor de exportación y pdf-lib lo traduce al estado «on».
    else if (field.getOptions().includes(option)) field.select(option)
    else field.acroField.setValue(PDFName.of(option))
  } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    choose(field, String(value))
  }
}

/** Regenera la apariencia de un campo; devuelve false si su texto no cabe en WinAnsi. */
function refresh(field: PDFField, font: PDFFont): boolean {
  try {
    if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) field.defaultUpdateAppearances()
    else if (
      field instanceof PDFTextField ||
      field instanceof PDFDropdown ||
      field instanceof PDFOptionList
    )
      field.defaultUpdateAppearances(font)
    return true
  } catch {
    return false
  }
}

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const edits = parseFormValues(values.fields)
  const flatten = values.flatten === true

  ctx.onProgress(0.1, t.progress.readingPdf)
  const document_ = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  const form = document_.getForm()
  const fields = form.getFields()
  if (fields.length === 0) throw new Error(t.errors.formNoFields)
  if (edits.size === 0 && !flatten) throw new Error(t.errors.formEmpty)

  ctx.onProgress(0.4, t.progress.fillingForm)
  const font = await document_.embedFont(StandardFonts.Helvetica)
  let missingAppearance = false
  for (const field of fields) {
    const name = field.getName()
    if (!edits.has(name)) continue
    try {
      apply(field, edits.get(name) as FormValue)
    } catch {
      throw new Error(fmt(t.errors.formField, { name }))
    }
    if (!refresh(field, font)) missingAppearance = true
  }

  if (missingAppearance) {
    if (flatten) throw new Error(t.errors.formEncoding)
    // El visor redibuja con su propia fuente los campos que Helvetica no sabe codificar.
    form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True)
  }

  if (flatten) {
    ctx.onProgress(0.7, t.progress.flattening)
    try {
      form.flatten({ updateFieldAppearances: false })
    } catch {
      throw new Error(t.errors.flattenFailed)
    }
  }

  ctx.onProgress(0.85, t.progress.writingPdf)
  const bytes = await document_.save({ updateFieldAppearances: false })

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.filled}.pdf`, blob: toBlob(bytes) }]
}

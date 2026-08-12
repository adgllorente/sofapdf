import type { ComponentType } from 'react'
import type { IconName } from '@/components/Icon'

export type OptionValues = Record<string, string | number | boolean>

type BaseField = {
  key: string
  /** Permite ocultar campos dependientes de otra opción. */
  showIf?: (values: OptionValues) => boolean
}

export type OptionField =
  | (BaseField & {
      type: 'select'
      default: string
      /** Solo los valores: las etiquetas están en el diccionario del idioma. */
      choices: string[]
    })
  | (BaseField & { type: 'text'; default: string; placeholder?: string })
  | (BaseField & { type: 'password'; default: string; placeholder?: string })
  | (BaseField & { type: 'number'; default: number; min?: number; max?: number; step?: number })
  | (BaseField & { type: 'toggle'; default: boolean })

export type OutputFile = {
  name: string
  blob: Blob
}

export type RunContext = {
  /** ratio 0..1; label opcional para el texto de progreso. */
  onProgress: (ratio: number, label?: string) => void
}

/**
 * Props que recibe el componente `Preview` opcional de una herramienta. Se
 * monta entre el formulario de opciones y el botón de acción; vive en el
 * bundle principal (no en el chunk diferido) porque necesita React.
 */
export type ToolPreviewProps = {
  files: File[]
  values: OptionValues
  onChange: (values: OptionValues) => void
  disabled?: boolean
}

export type ToolRun = (
  files: File[],
  values: OptionValues,
  ctx: RunContext,
) => Promise<OutputFile[]>

export type ToolCategoryId = 'paginas' | 'edicion' | 'conversiones' | 'seguridad'

/** El slug es la clave con la que el diccionario nombra la herramienta. */
export type ToolSlug =
  | 'merge'
  | 'split'
  | 'insert'
  | 'duplicate'
  | 'rotate'
  | 'organize'
  | 'jpg-to-pdf'
  | 'pdf-to-jpg'
  | 'extract-images'
  | 'pdf-to-text'
  | 'ocr'
  | 'number'
  | 'watermark'
  | 'crop'
  | 'compare'
  | 'compress'
  | 'flatten'
  | 'repair'
  | 'ocr'
  | 'protect'
  | 'unlock'
  | 'sign'
  | 'redact'
  | 'edit'
  | 'metadata'

/** Familia de formatos aceptados; su etiqueta visible está en el diccionario. */
export type AcceptKey = 'pdf' | 'image' | 'html'

/**
 * Solo estructura. Nombre, descripción, botón, aviso y etiquetas de las
 * opciones viven en `src/i18n/locales/*`.
 */
export type Tool = {
  slug: ToolSlug
  icon: IconName
  category: ToolCategoryId
  status: 'ready' | 'planned'
  /** accept del <input type=file>. */
  accept: string
  acceptKey: AcceptKey
  multiple: boolean
  minFiles: number
  /** Puede formar parte de una cadena PDF -> un PDF sin interacción adicional. */
  workflow?: boolean
  options?: OptionField[]
  /** Carga diferida de la implementación: mantiene el bundle inicial pequeño. */
  load?: () => Promise<ToolRun>
  /**
   * Componente React opcional para UI específica de la herramienta (vista
   * previa interactiva, miniaturas…). Solo lo montan las herramientas que lo
   * necesitan: el resto usa el formulario de opciones generado desde datos.
   */
  Preview?: ComponentType<ToolPreviewProps>
}

export function defaultValues(tool: Tool): OptionValues {
  const values: OptionValues = {}
  for (const field of tool.options ?? []) values[field.key] = field.default
  return values
}

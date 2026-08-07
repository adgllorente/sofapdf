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

export type ToolRun = (
  files: File[],
  values: OptionValues,
  ctx: RunContext,
) => Promise<OutputFile[]>

export type ToolCategoryId = 'organizar' | 'convertir' | 'optimizar' | 'seguridad' | 'editar'

/** El slug es la clave con la que el diccionario nombra la herramienta. */
export type ToolSlug =
  | 'unir'
  | 'dividir'
  | 'rotar'
  | 'organizar'
  | 'jpg-a-pdf'
  | 'pdf-a-jpg'
  | 'pdf-a-texto'
  | 'ocr'
  | 'html-a-pdf'
  | 'numerar'
  | 'marca-de-agua'
  | 'recortar'
  | 'comparar'
  | 'comprimir'
  | 'reparar'
  | 'pdf-a'
  | 'proteger'
  | 'desbloquear'
  | 'firmar'
  | 'redactar'

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
  options?: OptionField[]
  /** Carga diferida de la implementación: mantiene el bundle inicial pequeño. */
  load?: () => Promise<ToolRun>
}

export function defaultValues(tool: Tool): OptionValues {
  const values: OptionValues = {}
  for (const field of tool.options ?? []) values[field.key] = field.default
  return values
}

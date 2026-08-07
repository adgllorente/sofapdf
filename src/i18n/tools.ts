import { t } from '@/i18n'
import type { OptionField, Tool } from '@/tools/types'

export type OptionText = {
  label: string
  help?: string
  choices?: Record<string, string>
}

export type ToolText = {
  name: string
  short: string
  description: string
  action: string
  note?: string
  options?: Record<string, OptionText>
  /**
   * Cadenas opcionales para UIs específicas que viven en el `Preview` de la
   * herramienta (miniaturas, posición de firma…). La forma es libre: cada
   * Preview define y consume las claves que necesita.
   */
  preview?: Record<string, string | number | boolean | Record<string, string>>
}

/**
 * Indexar por `slug` obliga al diccionario a cubrir todas las herramientas: si
 * falta una, esto no compila.
 */
export function toolText(tool: Tool): ToolText {
  return t.tools[tool.slug]
}

export function optionText(tool: Tool, field: OptionField): OptionText {
  return toolText(tool).options?.[field.key] ?? { label: field.key }
}

export function choiceLabel(option: OptionText, value: string): string {
  return option.choices?.[value] ?? value
}

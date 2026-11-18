import type { Locale } from '@/i18n'
import type { OptionValues, ToolSlug } from './types'

/** Mensajes entre la página y `tool.worker.ts`. */
export type WorkerTask =
  | { kind: 'warm' }
  | { kind: 'tool'; slug: ToolSlug; files: File[]; values: OptionValues }
  | { kind: 'encrypted'; files: File[] }
  | { kind: 'decrypt'; file: File; password: string }

export type WorkerRequest = { id: number; locale: Locale; task: WorkerTask }

export type WorkerResponse =
  | { id: number; type: 'progress'; ratio: number; label: string }
  | { id: number; type: 'done'; result: unknown }
  /** `fatal`: el WASM abortó y su memoria ya no es fiable; hay que tirar el worker. */
  | { id: number; type: 'error'; message: string; fatal: boolean }

import { getLocale, t } from '@/i18n'
import { toBlob } from '@/lib/files'
import type { WorkerRequest, WorkerResponse, WorkerTask } from './worker-protocol'
import type { OptionValues, OutputFile, RunContext, Tool, ToolSlug } from './types'

/**
 * Las herramientas corren en un Web Worker: MuPDF es síncrono y en el hilo
 * principal congelaría la pestaña con un PDF grande. Todo sigue dentro del
 * navegador; el worker es otro hilo de la misma página.
 */

// OCR ya reparte el trabajo pesado en el worker de tesseract, y anidar workers
// no está garantizado en todos los navegadores.
const MAIN_THREAD = new Set<ToolSlug>(['ocr'])

type Pending = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  onProgress?: RunContext['onProgress']
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, Pending>()

function discardWorker(): void {
  worker?.terminate()
  worker = null
  for (const job of pending.values()) job.reject(new Error(t.run.failed))
  pending.clear()
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (worker) return worker
  worker = new Worker(new URL('./tool.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    const job = pending.get(data.id)
    if (!job) return
    if (data.type === 'progress') {
      job.onProgress?.(data.ratio, data.label)
      return
    }
    pending.delete(data.id)
    if (data.type === 'done') job.resolve(data.result)
    else {
      job.reject(new Error(data.message))
      if (data.fatal) discardWorker()
    }
  }
  // Un fallo del propio worker (sin memoria, WASM que no carga): el siguiente
  // uso arranca uno nuevo.
  worker.onerror = (event) => {
    event.preventDefault()
    discardWorker()
  }
  return worker
}

function request<T>(target: Worker, task: WorkerTask, onProgress?: RunContext['onProgress']): Promise<T> {
  const id = ++nextId
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, onProgress })
    const message: WorkerRequest = { id, locale: getLocale(), task }
    target.postMessage(message)
  })
}

function workerFor(slug?: ToolSlug): Worker | null {
  return slug && MAIN_THREAD.has(slug) ? null : getWorker()
}

/** Arranca el worker y compila MuPDF en segundo plano, sin bloquear nada. */
export function warmEngine(slug?: ToolSlug): void {
  const target = workerFor(slug)
  // Si falla aquí, el error se dará (y se mostrará) al ejecutar.
  if (target) request(target, { kind: 'warm' }).catch(() => {})
}

export async function runTool(
  tool: Tool,
  files: File[],
  values: OptionValues,
  ctx: RunContext,
): Promise<OutputFile[]> {
  const target = workerFor(tool.slug)
  if (!target) {
    const run = await tool.load!()
    return run(files, values, ctx)
  }
  // La primera vez el worker aún descarga y compila MuPDF: que se vea.
  ctx.onProgress(0, t.progress.preparing)
  return request<OutputFile[]>(target, { kind: 'tool', slug: tool.slug, files, values }, ctx.onProgress)
}

export async function encryptedFiles(files: File[]): Promise<File[]> {
  const target = getWorker()
  if (target) return request<File[]>(target, { kind: 'encrypted', files })
  const lib = await import('@/lib/unlock')
  return lib.encryptedFiles(files)
}

export type UnlockEntry = { file: File; password: string }

/** Devuelve copias sin contraseña con el mismo nombre, sin persistirlas. */
export async function unlockFiles(entries: UnlockEntry[]): Promise<Map<File, File>> {
  const unlocked = new Map<File, File>()
  for (const { file, password } of entries) {
    const target = getWorker()
    const bytes = target
      ? await request<Uint8Array>(target, { kind: 'decrypt', file, password })
      : await (await import('@/lib/unlock')).decryptPdf(new Uint8Array(await file.arrayBuffer()), password)
    unlocked.set(file, new File([toBlob(bytes)], file.name, { type: 'application/pdf' }))
  }
  return unlocked
}

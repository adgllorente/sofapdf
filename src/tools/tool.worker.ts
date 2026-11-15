// MuPDF es síncrono: aquí puede bloquear lo que haga falta sin congelar la
// pestaña. Los ficheros llegan como File (un asa, no una copia) y nunca salen
// de este proceso del navegador.
import { adoptLocale, t } from '@/i18n'
import { IMPLS } from './impls'
import type { WorkerRequest, WorkerTask } from './worker-protocol'

// Solo lo que se usa del ámbito del worker: así no hace falta la lib `webworker`.
const scope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

async function perform(id: number, task: WorkerTask): Promise<unknown> {
  switch (task.kind) {
    case 'warm':
      await import('@/lib/mupdf')
      return null
    case 'tool': {
      const load = IMPLS[task.slug]
      if (!load) throw new Error(t.run.failed)
      const run = await load()
      return run(task.files, task.values, {
        onProgress: (ratio, label = '') => scope.postMessage({ id, type: 'progress', ratio, label }),
      })
    }
    case 'encrypted': {
      const { encryptedFiles } = await import('@/lib/unlock')
      return encryptedFiles(task.files)
    }
    case 'decrypt': {
      const { decryptPdf } = await import('@/lib/unlock')
      return decryptPdf(new Uint8Array(await task.file.arrayBuffer()), task.password)
    }
  }
}

scope.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { id, locale, task } = data
  adoptLocale(locale)
  try {
    const result = await perform(id, task)
    // Los bytes se transfieren en vez de copiarse: un PDF grande no se duplica.
    const transfer = result instanceof Uint8Array ? [result.buffer as ArrayBuffer] : []
    scope.postMessage({ id, type: 'done', result }, transfer)
  } catch (cause) {
    scope.postMessage({
      id,
      type: 'error',
      message: cause instanceof Error && !(cause instanceof WebAssembly.RuntimeError) ? cause.message : t.run.failed,
      fatal: cause instanceof WebAssembly.RuntimeError,
    })
  }
}

// pdfjs 6.x lee el texto página a página con `for await (value of stream)`.
// Safari/iOS < 17.4 no traen Promise.withResolvers ni el iterador asíncrono
// de ReadableStream y pdf.js revienta con "undefined is not a function" (en
// escritorio funciona: solo falla en móvil). Son polyfills locales, sin red.
type WithResolvers<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

const promiseCtor = Promise as unknown as {
  withResolvers?: <T>() => WithResolvers<T>
}
if (typeof promiseCtor.withResolvers !== 'function') {
  promiseCtor.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

const streamProto = ReadableStream.prototype as unknown as {
  [Symbol.asyncIterator]?: ((this: ReadableStream) => AsyncIterator<unknown>) | undefined
}
if (!streamProto[Symbol.asyncIterator]) {
  streamProto[Symbol.asyncIterator] = async function* (): AsyncGenerator<unknown> {
    const reader = this.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }
}

import * as pdfjs from 'pdfjs-dist'
// ?url deja que Vite copie el worker al bundle: se sirve desde el mismo origen,
// nunca desde un CDN.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import openjpegWasmUrl from 'pdfjs-dist/wasm/openjpeg.wasm?url'
import jbig2WasmUrl from 'pdfjs-dist/wasm/jbig2.wasm?url'
import qcmsWasmUrl from 'pdfjs-dist/wasm/qcms_bg.wasm?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// pdf.js resuelve los decodificadores por nombre dentro de esta carpeta. Los
// imports mantienen todos los binarios de imagen en el bundle de Vite.
const wasmUrls = [openjpegWasmUrl, jbig2WasmUrl, qcmsWasmUrl]
const wasmUrl = new URL('.', new URL(wasmUrls[0], import.meta.url)).href

export function getPdfDocument(data: Uint8Array) {
  return pdfjs.getDocument({ data, wasmUrl, useWorkerFetch: false })
}

export { pdfjs }
export { wasmUrl }

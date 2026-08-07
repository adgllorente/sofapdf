// Se importa el CJS directamente: el wrapper ESM del paquete busca
// `globalThis.exports.Module`, que el bundler no rellena y rompe en el navegador.
import createModule from '@jspawn/qpdf-wasm/qpdf.js'
import type { QpdfModule } from '@jspawn/qpdf-wasm/qpdf.js'
import wasmUrl from '@jspawn/qpdf-wasm/qpdf.wasm?url'

const INPUT = 'input.pdf'
const OUTPUT = 'output.pdf'

let ready: Promise<QpdfModule> | null = null

/**
 * El WASM (1,3 MB) se carga una vez, solo cuando alguna herramienta lo pide, y
 * se sirve desde el propio origen como el resto del bundle.
 */
function load(): Promise<QpdfModule> {
  ready ??= createModule({ locateFile: () => wasmUrl })
  return ready
}

function unlink(qpdf: QpdfModule, path: string): void {
  try {
    qpdf.FS.unlink(path)
  } catch {
    // Si qpdf falló antes de crearlo, no hay nada que borrar.
  }
}

export type QpdfResult = {
  /** Código de salida del CLI: 0 es éxito. */
  code: number
  output: Uint8Array | null
}

/** Ejecuta `qpdf <args> input.pdf output.pdf` sobre el FS en memoria del módulo. */
export async function runQpdf(input: Uint8Array, args: string[]): Promise<QpdfResult> {
  const qpdf = await load()
  qpdf.FS.writeFile(INPUT, input)
  let code = 1
  try {
    code = qpdf.callMain([...args, INPUT, OUTPUT])
  } catch {
    // Emscripten relanza los exit() graves; el código ya queda en "fallo".
  }
  let output: Uint8Array | null = null
  try {
    output = qpdf.FS.readFile(OUTPUT)
  } catch {
    output = null
  }
  unlink(qpdf, INPUT)
  unlink(qpdf, OUTPUT)
  return { code, output }
}

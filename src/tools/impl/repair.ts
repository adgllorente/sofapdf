import { PDFDocument } from 'pdf-lib/es'
import { t } from '@/i18n'
import { bytesOf, indexOfBytes, lastIndexOfBytes } from '@/lib/bytes'
import { encryptionState } from '@/lib/encryption'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { runQpdf } from '@/lib/qpdf'
import type { ToolRun } from '@/tools/types'

const HEADER = bytesOf('%PDF-')
const FALLBACK_HEADER = bytesOf('%PDF-1.7\n')
const ENDOBJ = bytesOf('endobj')

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const input = withHeader(new Uint8Array(await file.arrayBuffer()))

  // De más fiel a más agresivo. qpdf da el mejor resultado pero se planta ante
  // un xref ilegible; pdf-lib no se fía del xref; el recorte tira lo que quedó
  // a medias. Cada estrategia se prueba solo si la anterior no dio nada.
  ctx.onProgress(0.3, t.progress.repairing)
  let output = await viaQpdf(input)

  if (!output) {
    ctx.onProgress(0.6, t.progress.rebuildingObjects)
    output = await viaPdfLib(input)
  }

  if (!output) {
    ctx.onProgress(0.85, t.progress.salvaging)
    const trimmed = trimToLastObject(input)
    if (trimmed) output = await viaPdfLib(trimmed)
  }

  if (!output) {
    // El aviso de cifrado se deja para el final: nada de él debe impedir un intento.
    const encrypted = (await encryptionState(input)) === 'encrypted'
    throw new Error(encrypted ? t.errors.repairEncrypted : t.errors.repairFailed)
  }

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.repaired}.pdf`, blob: toBlob(output) }]
}

/** Los offsets del documento se miden desde `%PDF-`: lo anterior sobra. */
function withHeader(bytes: Uint8Array): Uint8Array {
  const at = indexOfBytes(bytes, HEADER)
  if (at === 0) return bytes
  if (at > 0) return bytes.subarray(at)

  // Sin cabecera ningún parser llega a mirar el contenido; se le pone una.
  const patched = new Uint8Array(FALLBACK_HEADER.length + bytes.length)
  patched.set(FALLBACK_HEADER)
  patched.set(bytes, FALLBACK_HEADER.length)
  return patched
}

/** Un fichero truncado deja un objeto a medias que impide parsear el resto. */
function trimToLastObject(bytes: Uint8Array): Uint8Array | null {
  const at = lastIndexOfBytes(bytes, ENDOBJ)
  if (at < 0) return null
  const end = at + ENDOBJ.length
  return end < bytes.length ? bytes.subarray(0, end) : null
}

async function viaQpdf(input: Uint8Array): Promise<Uint8Array | null> {
  try {
    // Reescribir el fichero ya reconstruye la tabla de referencias; un aviso no
    // es un fallo, así que no debe contar como código de error.
    const { code, output } = await runQpdf(input, ['--warning-exit-0'])
    if (code !== 0 || !output || indexOfBytes(output.subarray(0, HEADER.length), HEADER) !== 0) {
      return null
    }
    return output
  } catch {
    // Si el WASM no carga, quedan las estrategias en JS.
    return null
  }
}

async function viaPdfLib(input: Uint8Array): Promise<Uint8Array | null> {
  try {
    // pdf-lib recorre los objetos en vez de fiarse del xref, que es justo lo que
    // suele estar roto. Sin `ignoreEncryption`: un documento cifrado se
    // guardaría con los streams sin descifrar, ilegible pero con pinta de sano.
    const doc = await PDFDocument.load(input, {
      throwOnInvalidObject: false,
      updateMetadata: false,
    })
    if (doc.getPageCount() === 0) return null
    return await doc.save({ useObjectStreams: false })
  } catch {
    return null
  }
}

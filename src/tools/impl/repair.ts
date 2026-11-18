import { t } from '@/i18n'
import { bytesOf, indexOfBytes, lastIndexOfBytes } from '@/lib/bytes'
import { toBlob } from '@/lib/files'
import { mupdf, pdfBytes } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

const HEADER = bytesOf('%PDF-')
const FALLBACK_HEADER = bytesOf('%PDF-1.7\n')
const ENDOBJ = bytesOf('endobj')

/** Sin `encrypt=none`: si solo lleva contraseña de propietario, se conserva. */
const REPAIR_OPTIONS = 'garbage=compact,compress'

type Attempt = { output: Uint8Array | null; encrypted: boolean }

export const run: ToolRun = async (files, _values, ctx) => {
  const [file] = files

  ctx.onProgress(0.1, t.progress.readingPdf)
  const input = withHeader(new Uint8Array(await file.arrayBuffer()))

  // Abrir con MuPDF ya reconstruye el xref si está roto. Si ni así sale nada, se
  // recorta el objeto que quedó a medias y se vuelve a intentar.
  ctx.onProgress(0.3, t.progress.repairing)
  let attempt = rebuild(input)

  if (!attempt.output && !attempt.encrypted) {
    ctx.onProgress(0.7, t.progress.salvaging)
    const trimmed = trimToLastObject(input)
    if (trimmed) attempt = rebuild(trimmed)
  }

  if (!attempt.output) {
    throw new Error(attempt.encrypted ? t.errors.repairEncrypted : t.errors.repairFailed)
  }

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.repaired}.pdf`, blob: toBlob(attempt.output) }]
}

function rebuild(input: Uint8Array): Attempt {
  let doc: InstanceType<typeof mupdf.Document> | null = null
  try {
    doc = mupdf.Document.openDocument(input, 'application/pdf')
    // Reescribir un documento cifrado sin la contraseña daría streams ilegibles con pinta de sanos.
    if (doc.needsPassword()) return { output: null, encrypted: true }
    const pdf = doc.asPDF()
    if (!pdf || pdf.countPages() === 0) return { output: null, encrypted: false }
    return { output: pdfBytes(pdf, REPAIR_OPTIONS), encrypted: false }
  } catch {
    return { output: null, encrypted: false }
  } finally {
    doc?.destroy()
  }
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

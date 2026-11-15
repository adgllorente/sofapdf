import { fmt, t } from '@/i18n'
import { bytesOf } from '@/lib/bytes'
import { encryptionState } from '@/lib/encryption'
import { openPdf, pdfBlob, usingPdf } from '@/lib/mupdf'
import { baseName } from '@/lib/pages'
import type { ToolRun } from '@/tools/types'

/** Límite de AES-256: con 128 bytes o más la contraseña se recorta en silencio. */
const MAX_PASSWORD_BYTES = 127

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const password = String(values.password)

  if (!password) throw new Error(t.errors.emptyPassword)
  if (password !== String(values.confirm)) throw new Error(t.errors.passwordMismatch)
  // MuPDF recibe las opciones como `clave=valor` separadas por comas, sin escape posible.
  if (password.includes(',')) throw new Error(t.errors.passwordComma)

  // Se mide en bytes, no en caracteres: una «ñ» ocupa dos y un emoji cuatro.
  const size = bytesOf(password).length
  if (size > MAX_PASSWORD_BYTES) {
    throw new Error(fmt(t.errors.passwordTooLong, { bytes: size, max: MAX_PASSWORD_BYTES }))
  }

  ctx.onProgress(0.15, t.progress.readingPdf)
  const input = new Uint8Array(await file.arrayBuffer())

  // Cifrar sobre cifrar no vale: hay que quitar antes la contraseña actual.
  if ((await encryptionState(input)) === 'encrypted') throw new Error(t.errors.alreadyEncrypted)

  ctx.onProgress(0.4, t.progress.encrypting)
  return usingPdf(openPdf(input, file.name), (doc) => {
    // AES-256; la misma contraseña abre y administra el documento.
    let blob: Blob
    try {
      blob = pdfBlob(
        doc,
        `garbage=compact,compress,encrypt=aes-256,user-password=${password},owner-password=${password}`,
      )
    } catch {
      throw new Error(t.errors.encryptFailed)
    }
    ctx.onProgress(1, t.progress.done)
    return [{ name: `${baseName(file.name)}-${t.filenames.protected}.pdf`, blob }]
  })
}

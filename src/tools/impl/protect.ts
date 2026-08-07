import { fmt, t } from '@/i18n'
import { bytesOf } from '@/lib/bytes'
import { encryptionState } from '@/lib/encryption'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { runQpdf } from '@/lib/qpdf'
import type { ToolRun } from '@/tools/types'

/** Límite de AES-256: con 128 bytes o más qpdf cifra con la contraseña recortada. */
const MAX_PASSWORD_BYTES = 127

/** qpdf recibe la contraseña como argumento: `-` la lee como opción y `@` como fichero. */
const RESERVED_FIRST_CHARS = ['-', '@']

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const password = String(values.password)

  if (!password) throw new Error(t.errors.emptyPassword)
  if (password !== String(values.confirm)) throw new Error(t.errors.passwordMismatch)
  if (RESERVED_FIRST_CHARS.includes(password[0])) throw new Error(t.errors.passwordReservedChar)

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
  // AES-256; la misma contraseña abre y administra el documento.
  const { code, output } = await runQpdf(input, ['--encrypt', password, password, '256', '--'])
  if (code !== 0 || !output) throw new Error(t.errors.encryptFailed)

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.protected}.pdf`, blob: toBlob(output) }]
}

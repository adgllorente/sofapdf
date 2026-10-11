import { t } from '@/i18n'
import { encryptionState } from '@/lib/encryption'
import { toBlob } from '@/lib/files'
import { baseName } from '@/lib/pages'
import { decryptPdf } from '@/lib/unlock'
import type { ToolRun } from '@/tools/types'

export const run: ToolRun = async (files, values, ctx) => {
  const [file] = files
  const password = String(values.password)

  ctx.onProgress(0.15, t.progress.readingPdf)
  const input = new Uint8Array(await file.arrayBuffer())

  if ((await encryptionState(input)) === 'plain') throw new Error(t.errors.notEncrypted)

  ctx.onProgress(0.4, t.progress.decrypting)
  let output: Uint8Array | null = null
  try {
    output = await decryptPdf(input, password)
  } catch {
    // Muchos PDF solo llevan contraseña de propietario y se abren sin ninguna.
    if (password) {
      try {
        output = await decryptPdf(input, '')
      } catch {
        output = null
      }
    }
  }

  // Muchos PDF solo llevan contraseña de propietario y se abren sin ninguna: si
  // la escrita no vale, todavía puede ser uno de esos.
  if (!output) throw new Error(t.errors.wrongPassword)

  ctx.onProgress(1, t.progress.done)
  return [{ name: `${baseName(file.name)}-${t.filenames.unlocked}.pdf`, blob: toBlob(output) }]
}

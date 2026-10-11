import { t } from '@/i18n'
import { toBlob } from '@/lib/files'

export type UnlockEntry = {
  file: File
  password: string
}

/** Busca el cifrado en un chunk diferido para no meter pdf-lib en el bundle inicial. */
export async function encryptedFiles(files: File[]): Promise<File[]> {
  const { encryptionState } = await import('@/lib/encryption')
  const encrypted: File[] = []
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if ((await encryptionState(bytes)) === 'encrypted') encrypted.push(file)
  }
  return encrypted
}

/** Descifra en memoria; qpdf y su WASM solo se cargan cuando hacen falta. */
export async function decryptPdf(input: Uint8Array, password: string): Promise<Uint8Array> {
  const { runQpdf } = await import('@/lib/qpdf')
  const args = password ? ['--decrypt', `--password=${password}`] : ['--decrypt']
  const { code, output } = await runQpdf(input, args)
  if (code !== 0 || !output) throw new Error(t.errors.wrongPassword)
  return output
}

/** Devuelve una copia sin contraseña con el mismo nombre, sin persistirla. */
export async function unlockFile(file: File, password: string): Promise<File> {
  const input = new Uint8Array(await file.arrayBuffer())
  const output = await decryptPdf(input, password)
  return new File([toBlob(output)], file.name, { type: 'application/pdf' })
}

export async function unlockFiles(entries: UnlockEntry[]): Promise<Map<File, File>> {
  const unlocked = new Map<File, File>()
  for (const { file, password } of entries) {
    unlocked.set(file, await unlockFile(file, password))
  }
  return unlocked
}

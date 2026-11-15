import { t } from '@/i18n'
import { toBlob } from '@/lib/files'

export type UnlockEntry = {
  file: File
  password: string
}

/** Busca el cifrado en un chunk diferido para no meter MuPDF en el bundle inicial. */
export async function encryptedFiles(files: File[]): Promise<File[]> {
  const { encryptionState } = await import('@/lib/encryption')
  const encrypted: File[] = []
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if ((await encryptionState(bytes)) === 'encrypted') encrypted.push(file)
  }
  return encrypted
}

/** Descifra en memoria; MuPDF y su WASM solo se cargan cuando hacen falta. */
export async function decryptPdf(input: Uint8Array, password: string): Promise<Uint8Array> {
  const { openPdf, pdfBytes, usingPdf } = await import('@/lib/mupdf')
  let doc
  try {
    doc = openPdf(input)
  } catch {
    throw new Error(t.errors.wrongPassword)
  }
  return usingPdf(doc, (pdf) => {
    // Sin contraseña de usuario abre directamente; la de propietario no se exige.
    if (pdf.needsPassword() && !pdf.authenticatePassword(password)) {
      throw new Error(t.errors.wrongPassword)
    }
    // Sin `garbage`: descifrar no debe tocar la estructura más de lo necesario.
    return pdfBytes(pdf, 'encrypt=none')
  })
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

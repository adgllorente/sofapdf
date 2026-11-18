import { t } from '@/i18n'

/** Ficheros que necesitan contraseña; MuPDF solo se carga si el escaneo lo pide. */
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

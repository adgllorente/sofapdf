import { bytesOf, indexOfBytes } from '@/lib/bytes'

const ENCRYPT_KEY = bytesOf('/Encrypt')

/**
 * Un PDF cifrado siempre referencia su diccionario `/Encrypt`. Buscar la clave
 * a pelo es O(n) y no parsea nada, pero solo sirve para *descartar*: la cadena
 * también aparece dentro de un stream sin comprimir o en una revisión anterior.
 */
function mentionsEncrypt(bytes: Uint8Array): boolean {
  return indexOfBytes(bytes, ENCRYPT_KEY) >= 0
}

export type EncryptionState = 'encrypted' | 'plain' | 'unknown'

/** `unknown` cuando el documento está tan dañado que no se deja parsear. */
export async function encryptionState(bytes: Uint8Array): Promise<EncryptionState> {
  if (!mentionsEncrypt(bytes)) return 'plain'
  // MuPDF solo se carga si el escaneo no basta: su WASM tarda en llegar y
  // bloquearía el botón de la herramienta con cualquier PDF.
  const { mupdf } = await import('@/lib/mupdf')
  let doc: InstanceType<typeof mupdf.Document> | null = null
  try {
    // `needsPassword` no ve los PDF que solo llevan contraseña de propietario;
    // el metadato de cifrado sí.
    doc = mupdf.Document.openDocument(bytes, 'application/pdf')
    return doc.getMetaData(mupdf.Document.META_ENCRYPTION) === 'None' ? 'plain' : 'encrypted'
  } catch {
    return 'unknown'
  } finally {
    doc?.destroy()
  }
}

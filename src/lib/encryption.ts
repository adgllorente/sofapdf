import { PDFDocument } from 'pdf-lib/es'
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
  try {
    // `isEncrypted` mira el `/Encrypt` del tráiler, así que confirma lo que el
    // escaneo solo sospecha. Con `ignoreEncryption` para que lo diga en vez de
    // lanzar: sus errores no sobreviven a `instanceof` y habría que mirar el texto.
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return doc.isEncrypted ? 'encrypted' : 'plain'
  } catch {
    // Un documento roto no se deja parsear; que decida qpdf.
    return 'unknown'
  }
}

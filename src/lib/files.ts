import type { OutputFile } from '@/tools/types'

/** pdf-lib devuelve Uint8Array; lo envolvemos sin copiarlo otra vez. */
export function toBlob(bytes: Uint8Array, type = 'application/pdf'): Blob {
  return new Blob([bytes as unknown as BlobPart], { type })
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // El objeto vive en memoria hasta que se revoca; no hay copia en disco.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function saveAllAsZip(outputs: OutputFile[], zipName: string): Promise<void> {
  // Carga diferida: solo pesa cuando el usuario pide el zip.
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const output of outputs) zip.file(output.name, output.blob)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  saveBlob(blob, zipName)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

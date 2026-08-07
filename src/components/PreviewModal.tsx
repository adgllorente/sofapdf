import { useEffect, useRef, useState } from 'react'
import { t } from '@/i18n'
import { Icon } from './Icon'

const RENDER_SCALE = 1.5

type Props = {
  blob: Blob
  name: string
  onClose: () => void
}

/**
 * Modal que pinta las páginas del PDF de salida usando pdfjs. Se monta solo
 * cuando se abre: el blob se lee una vez y cada página se renderiza a un
 * canvas a tamaño legible. El `Escape` y el clic en el backdrop cierran.
 */
export function PreviewModal({ blob, name, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carga el PDF y pinta cada página en un canvas. pdfjs entra por dynamic
  // import: si nadie abre el preview, el coste es cero. No llamamos a
  // `doc.destroy()` porque no está en los tipos y en algunas versiones de
  // pdfjs-dist tampoco está en runtime: las páginas se liberan solas cuando
  // se pierden las referencias al cerrarse el modal.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | null = null

    void (async () => {
      const { pdfjs } = await import('@/lib/pdfjs')
      const data = new Uint8Array(await blob.arrayBuffer())
      task = pdfjs.getDocument({ data })
      try {
        const doc = await task.promise
        if (cancelled) return
        setPageCount(doc.numPages)
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          if (cancelled) {
            page.cleanup()
            return
          }
          const viewport = page.getViewport({ scale: RENDER_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          canvas.className = 'block w-full rounded border border-line bg-white shadow-sm'
          const ctx = canvas.getContext('2d')
          if (ctx) await page.render({ canvas, viewport }).promise
          page.cleanup()
          // Si el modal se cerró mientras se renderizaba esta página, no
          // añadimos el canvas: el contenedor ya está desmontado.
          if (cancelled) return
          container.appendChild(canvas)
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t.run.failed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [blob])

  // Escape cierra el modal. El listener se monta solo mientras está abierto.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-card border border-line bg-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="min-w-0 truncate text-sm font-medium text-ink">{name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.run.close}
            className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-subtle hover:text-ink"
          >
            <Icon name="x" className="size-4" />
          </button>
        </header>
        <div
          className="overflow-y-auto p-4"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : loading && pageCount === 0 ? (
            <p className="text-sm text-muted">{t.run.loading}</p>
          ) : null}
          <div ref={containerRef} className="flex flex-col items-center gap-4" />
        </div>
      </div>
    </div>
  )
}

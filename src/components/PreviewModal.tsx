import { useEffect, useRef, useState } from 'react'
import { fmt, t } from '@/i18n'
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
  const [renderedCount, setRenderedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carga el PDF y pinta cada página en un canvas. pdfjs entra por dynamic
  // import: si nadie abre el preview, el coste es cero.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | null = null

    void (async () => {
      const { getPdfDocument } = await import('@/lib/pdfjs')
      const data = new Uint8Array(await blob.arrayBuffer())
      task = getPdfDocument(data)
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
          canvas.className = 'block w-full rounded-lg border border-line bg-white shadow-sm'

          const ctx = canvas.getContext('2d')
          if (ctx) await page.render({ canvas, viewport }).promise
          page.cleanup()

          // Si el modal se cerró mientras se renderizaba esta página, no
          // añadimos el canvas: el contenedor ya está desmontado.
          if (cancelled) return

          const pageWrapper = document.createElement('div')
          pageWrapper.className = 'relative flex flex-col items-center w-full max-w-2xl'
          pageWrapper.appendChild(canvas)

          if (doc.numPages > 1) {
            const footer = document.createElement('span')
            footer.className = 'mt-2 text-xs font-mono text-muted'
            footer.textContent = `${i} / ${doc.numPages}`
            pageWrapper.appendChild(footer)
          }

          container.appendChild(pageWrapper)
          setRenderedCount(i)
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
        className="flex h-[88vh] max-h-[920px] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-line bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
              <Icon name="file" className="size-4" />
            </span>
            <span className="truncate text-sm font-medium text-ink">{name}</span>
            {pageCount > 0 && (
              <span className="shrink-0 rounded-full border border-line bg-subtle px-2 py-0.5 text-xs text-muted">
                {pageCount === 1 ? t.run.previewPageOne : fmt(t.run.previewPageCount, { n: pageCount })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.run.close}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-subtle hover:text-ink"
          >
            <Icon name="x" className="size-4" />
          </button>
        </header>

        <div className="relative flex flex-1 flex-col overflow-y-auto bg-subtle/50 p-4 sm:p-6">
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="mb-3 grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
                <Icon name="alert" className="size-6" />
              </span>
              <p className="max-w-md text-sm font-medium text-ink">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink-soft transition hover:border-line-strong hover:text-ink"
              >
                {t.run.close}
              </button>
            </div>
          ) : renderedCount === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <div className="flex w-full max-w-md flex-col items-center rounded-xl border border-line bg-surface p-8 shadow-sm">
                <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon name="loader" className="size-6 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-ink">{t.run.previewLoading}</p>
                <p className="mt-1 text-xs text-muted">
                  {pageCount > 0
                    ? pageCount === 1
                      ? t.run.previewPageOne
                      : fmt(t.run.previewPageCount, { n: pageCount })
                    : t.run.working}
                </p>

                {/* Esqueleto visual de página con pulso suave */}
                <div className="mt-6 w-full space-y-2.5 opacity-60">
                  <div className="h-2 w-1/3 rounded bg-subtle" />
                  <div className="h-2 w-full rounded bg-subtle" />
                  <div className="h-2 w-5/6 rounded bg-subtle" />
                  <div className="h-2 w-2/3 rounded bg-subtle" />
                </div>
              </div>
            </div>
          ) : null}

          <div
            ref={containerRef}
            className={`flex flex-col items-center gap-6 ${renderedCount === 0 ? 'hidden' : ''}`}
          />

          {loading && renderedCount > 0 && renderedCount < pageCount && (
            <div className="mt-4 flex items-center justify-center gap-2 py-3 text-xs text-muted">
              <Icon name="loader" className="size-3.5 animate-spin text-accent" />
              <span>
                {fmt(t.run.previewRenderingMore, {
                  current: renderedCount + 1,
                  total: pageCount,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const RENDER_SCALE = 2
const STORAGE_KEY = 'regions'
const MIN_SIZE = 0.005

type Region = { id: string; page: number; x: number; y: number; width: number; height: number }

function loadRegions(values: OptionValues): Region[] {
  const raw = values[STORAGE_KEY]
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw) as Region[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is Region =>
        typeof r?.id === 'string' &&
        typeof r?.page === 'number' &&
        typeof r?.x === 'number' &&
        typeof r?.y === 'number' &&
        typeof r?.width === 'number' &&
        typeof r?.height === 'number',
    )
  } catch {
    return []
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function RedactPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const idRef = useRef(0)
  const [dragRect, setDragRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  // Ref que `onMove` actualiza y `onUp` lee al soltar. Si usamos solo
  // `dragRect` (estado de React), `onUp` captura el valor inicial (width 0)
  // porque el closure se crea antes de que el drag mueva nada.
  const dragRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  // Inicializa la lista de regiones al subir el PDF. No está en `tool.options`
  // porque solo el Preview la escribe; sacarla del OptionsForm evita que el
  // usuario la vea como un campo JSON.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file) return
    if (values[STORAGE_KEY] == null) onChange({ ...values, [STORAGE_KEY]: '[]' } as OptionValues)
  }, [file])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Carga el documento. pdfjs entra por dynamic import.
  useEffect(() => {
    if (!file) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null
    void (async () => {
      const { pdfjs } = await import('@/lib/pdfjs')
      const data = new Uint8Array(await file.arrayBuffer())
      task = pdfjs.getDocument({ data })
      try {
        const next = await task.promise
        if (cancelled) {
          await (next as PDFDocumentProxy & { destroy: () => Promise<void> }).destroy()
          return
        }
        const previous = doc as (PDFDocumentProxy & { destroy?: () => Promise<void> }) | null
        await previous?.destroy?.()
        setDoc(next)
        setPageCount(next.numPages)
      } catch {
        // PDF cifrado o roto: el run fallará, aquí no hacemos nada.
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const page = Math.max(1, Math.min(Math.floor(Number(values.page) || 1), pageCount || 1))
  const regions = loadRegions(values)
  const currentRegions = regions.filter((r) => r.page === page)

  // Dibuja la página seleccionada a `RENDER_SCALE`.
  useEffect(() => {
    const document_ = doc
    const canvas = canvasRef.current
    if (!document_ || !canvas || !pageCount) return
    let cancelled = false
    let pdfPage: PDFPageProxy | null = null
    setError('')
    void (async () => {
      try {
        pdfPage = await document_.getPage(page)
        if (cancelled) {
          pdfPage.cleanup()
          return
        }
        const viewport = pdfPage.getViewport({ scale: RENDER_SCALE })
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const ctx = canvas.getContext('2d')
        if (ctx) await pdfPage.render({ canvas, viewport }).promise
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t.run.failed)
      } finally {
        pdfPage?.cleanup()
      }
    })()
    return () => {
      cancelled = true
      pdfPage?.cleanup()
    }
  }, [doc, page, pageCount])

  function update(patch: Partial<OptionValues>) {
    onChange({ ...values, ...patch } as OptionValues)
  }

  function setPageNum(next: number) {
    update({ page: Math.max(1, Math.min(pageCount, next)) })
  }

  function nextId(): string {
    idRef.current += 1
    return `r${idRef.current}`
  }

  function addRegion(rect: { x: number; y: number; width: number; height: number }) {
    const next: Region = { id: nextId(), page, ...rect }
    update({ [STORAGE_KEY]: JSON.stringify([...regions, next]) })
  }

  function removeRegion(id: string) {
    update({ [STORAGE_KEY]: JSON.stringify(regions.filter((r) => r.id !== id)) })
  }

  function clearPage() {
    update({ [STORAGE_KEY]: JSON.stringify(regions.filter((r) => r.page !== page)) })
  }

  // Drag para crear un rectángulo. Document-level listeners para no perder
  // el gesto si el cursor sale del contenedor durante el drag.
  function onContainerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = (event.clientX - rect.left) / rect.width
    const startY = (event.clientY - rect.top) / rect.height
    const initial = { x: startX, y: startY, width: 0, height: 0 }
    dragRectRef.current = initial
    setDragRect(initial)

    function onMove(e: PointerEvent) {
      const currentX = (e.clientX - rect.left) / rect.width
      const currentY = (e.clientY - rect.top) / rect.height
      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)
      const next = { x, y, width, height }
      dragRectRef.current = next
      setDragRect(next)
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      // Leemos del ref, no del closure: tiene el último valor escrito por
      // `onMove`. El `dragRect` del closure sería el inicial (todo 0).
      const final = dragRectRef.current
      if (final && final.width >= MIN_SIZE && final.height >= MIN_SIZE) {
        addRegion(final)
      }
      dragRectRef.current = null
      setDragRect(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t.tools.redact.preview.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{fmt(t.tools.redact.preview.pageOf, { n: page, total: pageCount || '?' })}</span>
          {currentRegions.length > 0 && (
            <button
              type="button"
              onClick={clearPage}
              disabled={disabled}
              className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
            >
              {t.tools.redact.preview.clearPage}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{t.tools.redact.preview.hint}</p>

      <div className="flex items-center justify-end gap-1 text-xs text-muted">
        <button
          type="button"
          onClick={() => setPageNum(page - 1)}
          disabled={page <= 1}
          aria-label={t.tools.redact.preview.prevPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPageNum(page + 1)}
          disabled={page >= pageCount}
          aria-label={t.tools.redact.preview.nextPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5 rotate-180" />
        </button>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onContainerPointerDown}
        className="relative min-h-[200px] cursor-crosshair select-none rounded-card border border-line bg-subtle"
      >
        <canvas ref={canvasRef} className="block w-full h-auto" />

        {error && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-danger">
            {error}
          </p>
        )}

        {/* Reglas ya creadas en esta página: clic para borrar. */}
        {currentRegions.map((region) => (
          <button
            key={region.id}
            type="button"
            // stopPropagation en pointerdown para que clicar en una región
            // existente no arranque también un drag en el contenedor.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              removeRegion(region.id)
            }}
            className="absolute bg-ink/85 hover:bg-danger/80 transition-colors"
            style={{
              left: `${clamp(region.x, 0, 1) * 100}%`,
              top: `${clamp(region.y, 0, 1) * 100}%`,
              width: `${clamp(region.width, 0, 1) * 100}%`,
              height: `${clamp(region.height, 0, 1) * 100}%`,
            }}
            aria-label={t.tools.redact.preview.removeRegion}
            title={t.tools.redact.preview.removeRegion}
          />
        ))}

        {/* Rectángulo que se está dibujando: estilo distinto para que se */}
        {/* distinga de las regiones ya guardadas. */}
        {dragRect && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-white bg-ink/40"
            style={{
              left: `${dragRect.x * 100}%`,
              top: `${dragRect.y * 100}%`,
              width: `${dragRect.width * 100}%`,
              height: `${dragRect.height * 100}%`,
            }}
          />
        )}
      </div>
    </section>
  )
}

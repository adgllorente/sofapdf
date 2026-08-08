import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const RENDER_SCALE = 2
const MIN_SIZE = 0.05
const EDGE_THICKNESS = 8
const CORNER_SIZE = 12

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type Edge = 'top' | 'bottom' | 'left' | 'right'
type Handle = Corner | Edge

export function CropPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Inicializa `page` y el rectángulo a página completa cuando llega un PDF.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file) return
    const updates: Partial<OptionValues> = {}
    if (values.page == null) updates.page = 1
    if (values.x == null) updates.x = 0
    if (values.y == null) updates.y = 0
    if (values.width == null) updates.width = 1
    if (values.height == null) updates.height = 1
    if (Object.keys(updates).length > 0) onChange({ ...values, ...updates } as OptionValues)
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
        // Si el PDF está cifrado o roto, el run fallará; aquí no hacemos nada.
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const page = Math.max(1, Math.min(Math.floor(Number(values.page) || 1), pageCount || 1))
  const x = clamp(Number(values.x) || 0, 0, 1)
  const y = clamp(Number(values.y) || 0, 0, 1)
  const width = clamp(Number(values.width) || 1, 0, 1)
  const height = clamp(Number(values.height) || 1, 0, 1)

  // Dibuja la página seleccionada a `RENDER_SCALE`. El viewport a escala 1
  // da el tamaño en pt para que el velo gris se mapee correctamente.
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
        canvas.width = viewport.width
        canvas.height = viewport.height
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

  function reset() {
    update({ x: 0, y: 0, width: 1, height: 1 })
  }

  function clearCrop() {
    update({ x: 0, y: 0, width: 0, height: 0 })
  }

  function setPageNum(next: number) {
    update({ page: Math.max(1, Math.min(pageCount, next)) })
  }

  /**
   * Inicia una interacción y devuelve los handlers `move` y `up` que se
   * enganchan a `document`. La razón de usar el documento y no `setPointerCapture`
   * es que el cursor puede salirse del handle durante el drag sin que se pierda
   * el gesto.
   */
  function startDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    apply: (start: { x: number; y: number }, current: { x: number; y: number }, state: Rect) => Rect,
  ) {
    if (disabled) return
    event.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const start = pointerFraction(event, rect)
    const state: Rect = { x, y, width, height }

    function onMove(e: PointerEvent) {
      const current = pointerFraction(e, rect)
      const next = apply(start, current, state)
      update({
        x: clamp(next.x, 0, 1 - MIN_SIZE),
        y: clamp(next.y, 0, 1 - MIN_SIZE),
        width: clamp(next.width, MIN_SIZE, 1 - next.x),
        height: clamp(next.height, MIN_SIZE, 1 - next.y),
      })
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  function onCreateDown(event: ReactPointerEvent<HTMLDivElement>) {
    startDrag(event, (start, current) => ({
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    }))
  }

  function onMoveDown(event: ReactPointerEvent<HTMLDivElement>) {
    startDrag(event, (start, current, state) => ({
      ...state,
      x: state.x + (current.x - start.x),
      y: state.y + (current.y - start.y),
    }))
  }

  function onHandleDown(handle: Handle) {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      startDrag(event, (start, current, state) => resize(state, start, current, handle))
    }
  }

  const hasCrop = width > 0 && height > 0

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t.tools.crop.preview.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{fmt(t.tools.crop.preview.pageOf, { n: page, total: pageCount || '?' })}</span>
          <button
            type="button"
            onClick={hasCrop ? clearCrop : reset}
            disabled={disabled}
            className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
          >
            {hasCrop ? t.tools.crop.preview.newCrop : t.tools.crop.preview.reset}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t.tools.crop.preview.hint}</p>

      <div className="flex items-center justify-end gap-1 text-xs text-muted">
        <button
          type="button"
          onClick={() => setPageNum(page - 1)}
          disabled={page <= 1}
          aria-label={t.tools.crop.preview.prevPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPageNum(page + 1)}
          disabled={page >= pageCount}
          aria-label={t.tools.crop.preview.nextPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5 rotate-180" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[200px] touch-none rounded-card border border-line bg-subtle"
      >
        <canvas ref={canvasRef} className="block w-full h-auto" />

        {error && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-danger">
            {error}
          </p>
        )}

        {hasCrop && (
          <>
            {/* Velo gris sobre las zonas que se recortan. Cuatro bandas que */}
            {/* se solapan en las esquinas; el solapamiento no se nota. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-ink/55"
              style={{ height: `${y * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/55"
              style={{ height: `${(1 - y - height) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 left-0 bg-ink/55"
              style={{ top: `${y * 100}%`, bottom: `${(1 - y - height) * 100}%`, width: `${x * 100}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 right-0 bg-ink/55"
              style={{ top: `${y * 100}%`, bottom: `${(1 - y - height) * 100}%`, width: `${(1 - x - width) * 100}%` }}
            />

            {/* Marco discontinuo del recorte. */}
            <div
              className="pointer-events-none absolute border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(15,118,110,0.6)]"
              style={{
                top: `${y * 100}%`,
                left: `${x * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
              }}
            />
          </>
        )}

        {/* Handle de creación: cubre toda la página. Va PRIMERO en el DOM */}
        {/* para que el handle de mover (que viene después) le gane la */}
        {/* partida dentro del rectángulo, sin necesidad de z-index. */}
        {(!hasCrop || !disabled) && (
          <div
            onPointerDown={onCreateDown}
            className="absolute inset-0 cursor-crosshair"
          />
        )}

        {hasCrop && (
          <>
            {/* Hit area para mover el rectángulo: dentro del marco. */}
            <div
              onPointerDown={onMoveDown}
              className="absolute cursor-move"
              style={{
                top: `${y * 100}%`,
                left: `${x * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
              }}
            />

            {/* Handles de las cuatro aristas. */}
            <EdgeHandle
              side="top"
              onPointerDown={onHandleDown('top')}
              rect={{ x, y, width, height }}
            />
            <EdgeHandle
              side="bottom"
              onPointerDown={onHandleDown('bottom')}
              rect={{ x, y, width, height }}
            />
            <EdgeHandle
              side="left"
              onPointerDown={onHandleDown('left')}
              rect={{ x, y, width, height }}
            />
            <EdgeHandle
              side="right"
              onPointerDown={onHandleDown('right')}
              rect={{ x, y, width, height }}
            />

            {/* Esquinas. */}
            <CornerHandle
              corner="top-left"
              onPointerDown={onHandleDown('top-left')}
              rect={{ x, y, width, height }}
            />
            <CornerHandle
              corner="top-right"
              onPointerDown={onHandleDown('top-right')}
              rect={{ x, y, width, height }}
            />
            <CornerHandle
              corner="bottom-left"
              onPointerDown={onHandleDown('bottom-left')}
              rect={{ x, y, width, height }}
            />
            <CornerHandle
              corner="bottom-right"
              onPointerDown={onHandleDown('bottom-right')}
              rect={{ x, y, width, height }}
            />
          </>
        )}
      </div>
    </section>
  )
}

type Rect = { x: number; y: number; width: number; height: number }

function pointerFraction(event: PointerEvent | ReactPointerEvent, rect: DOMRect) {
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Resize a partir del handle que se está arrastrando. El truco está en que
 * el lado opuesto del handle queda fijo: por ejemplo, arrastrar la esquina
 * inferior derecha solo cambia `x + width` e `y + height`; `x` e `y` no se
 * mueven. Para las esquinas y aristas del lado izquierdo/superior, lo que se
 * mueve es `x` (o `y`), y el ancho (o alto) se ajusta restando el delta.
 */
function resize(
  state: Rect,
  start: { x: number; y: number },
  current: { x: number; y: number },
  handle: Handle,
): Rect {
  const dx = current.x - start.x
  const dy = current.y - start.y
  let { x, y, width, height } = state

  if (handle === 'top-left') {
    x = state.x + dx
    y = state.y + dy
    width = state.width - dx
    height = state.height - dy
  } else if (handle === 'top-right') {
    y = state.y + dy
    width = state.width + dx
    height = state.height - dy
  } else if (handle === 'bottom-left') {
    x = state.x + dx
    width = state.width - dx
    height = state.height + dy
  } else if (handle === 'bottom-right') {
    width = state.width + dx
    height = state.height + dy
  } else if (handle === 'top') {
    y = state.y + dy
    height = state.height - dy
  } else if (handle === 'bottom') {
    height = state.height + dy
  } else if (handle === 'left') {
    x = state.x + dx
    width = state.width - dx
  } else {
    width = state.width + dx
  }

  // El clamp final lo hace `startDrag`, aquí solo devolvemos el rect crudo.
  return { x, y, width, height }
}

function EdgeHandle({
  side,
  rect,
  onPointerDown,
}: {
  side: Edge
  rect: Rect
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const isHorizontal = side === 'top' || side === 'bottom'
  const style: React.CSSProperties = isHorizontal
    ? {
        top: side === 'top' ? `${rect.y * 100}%` : 'auto',
        bottom: side === 'bottom' ? `${(1 - rect.y - rect.height) * 100}%` : 'auto',
        left: `${rect.x * 100}%`,
        width: `${rect.width * 100}%`,
        height: EDGE_THICKNESS,
        transform: 'translateY(-50%)',
      }
    : {
        left: side === 'left' ? `${rect.x * 100}%` : 'auto',
        right: side === 'right' ? `${(1 - rect.x - rect.width) * 100}%` : 'auto',
        top: `${rect.y * 100}%`,
        width: EDGE_THICKNESS,
        height: `${rect.height * 100}%`,
        transform: 'translateX(-50%)',
      }
  const cursor = isHorizontal ? 'cursor-ns-resize' : 'cursor-ew-resize'
  return <div onPointerDown={onPointerDown} className={`absolute z-20 ${cursor}`} style={style} />
}

const CORNER_CURSORS: Record<Corner, string> = {
  'top-left': 'cursor-nwse-resize',
  'top-right': 'cursor-nesw-resize',
  'bottom-left': 'cursor-nesw-resize',
  'bottom-right': 'cursor-nwse-resize',
}

function CornerHandle({
  corner,
  rect,
  onPointerDown,
}: {
  corner: Corner
  rect: Rect
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const isLeft = corner === 'top-left' || corner === 'bottom-left'
  const isTop = corner === 'top-left' || corner === 'top-right'
  const style: React.CSSProperties = {
    top: isTop ? `${rect.y * 100}%` : 'auto',
    bottom: !isTop ? `${(1 - rect.y - rect.height) * 100}%` : 'auto',
    left: isLeft ? `${rect.x * 100}%` : 'auto',
    right: !isLeft ? `${(1 - rect.x - rect.width) * 100}%` : 'auto',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    transform: `translate(${isLeft ? '-50%' : '50%'}, ${isTop ? '-50%' : '50%'})`,
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute z-30 ${CORNER_CURSORS[corner]} rounded-sm border-2 border-accent bg-canvas`}
      style={style}
    />
  )
}

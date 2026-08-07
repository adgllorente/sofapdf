import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import clsx from 'clsx'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const MODES = ['text', 'draw', 'image'] as const
type Mode = (typeof MODES)[number]

const FONT_FAMILIES: Record<string, string> = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: '"Times New Roman", Times, serif',
  script: '"Brush Script MT", "Lucida Handwriting", "Snell Roundhand", cursive',
}

const COLORS: Record<string, string> = {
  black: '#111111',
  blue: '#1a4a99',
  gray: '#666666',
}

const DEFAULT_WIDTH = 120
const MIN_WIDTH = 40
const MAX_WIDTH = 400
const RENDER_SCALE = 2

export function SignaturePreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files

  // Defaults que no están en `tool.options`: la previsualización es la única
  // que los conoce, así que los inicializa ella misma. Vacío a propósito: solo
  // se ejecuta al montar, no en cada cambio de `values`.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const updates: Partial<OptionValues> = {}
    if (values.page == null) updates.page = 1
    if (values.x == null) updates.x = 70
    if (values.y == null) updates.y = 12
    if (values.signatureWidth == null) updates.signatureWidth = DEFAULT_WIDTH
    if (values.mode == null) updates.mode = 'text'
    if (Object.keys(updates).length > 0) onChange({ ...values, ...updates } as OptionValues)
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  const mode = String(values.mode ?? 'text') as Mode
  const page = Math.max(1, Math.floor(Number(values.page) || 1))
  const x = Number(values.x ?? 70)
  const y = Number(values.y ?? 12)
  const signatureWidth = clamp(Number(values.signatureWidth) || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH)
  const signatureDataUrl = String(values.signatureDataUrl ?? '')

  function update(patch: Partial<OptionValues>) {
    onChange({ ...values, ...patch } as OptionValues)
  }

  return (
    <section className="space-y-6 rounded-card border border-line bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t.tools.firmar.preview.source}
        </h2>
        <div className="mt-3 flex gap-1 border-b border-line">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update({ mode: m })}
              disabled={disabled}
              className={clsx(
                'border-b-2 -mb-px px-3 py-1.5 text-sm transition',
                mode === m
                  ? 'border-accent font-medium text-accent'
                  : 'border-transparent text-muted hover:text-ink-soft',
                disabled && 'opacity-50',
              )}
            >
              {t.tools.firmar.preview.modes[m]}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {mode === 'text' && <TextSource values={values} onChange={update} disabled={disabled} />}
          {mode === 'draw' && <DrawSource values={values} onChange={update} disabled={disabled} />}
          {mode === 'image' && <ImageSource values={values} onChange={update} disabled={disabled} />}
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t.tools.firmar.preview.position}
        </h2>
        <p className="mt-1 text-xs text-muted">{t.tools.firmar.preview.positionHint}</p>
        <div className="mt-3">
          <PositioningPreview
            file={file}
            page={page}
            x={x}
            y={y}
            width={signatureWidth}
            signatureDataUrl={signatureDataUrl}
            onChange={update}
            disabled={disabled}
          />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <span className="w-40 text-ink-soft">{t.tools.firmar.preview.widthLabel}</span>
          <input
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            step={4}
            value={signatureWidth}
            disabled={disabled}
            onChange={(event) => update({ signatureWidth: Number(event.target.value) })}
            className="flex-1 accent-accent disabled:opacity-50"
          />
          <span className="w-14 text-right text-muted tabular-nums">{signatureWidth} pt</span>
        </label>
      </div>
    </section>
  )
}

function TextSource({
  values,
  onChange,
  disabled,
}: {
  values: OptionValues
  onChange: (patch: Partial<OptionValues>) => void
  disabled?: boolean
}) {
  const text = String(values.text ?? '')
  const style = String(values.style ?? 'script')
  const color = String(values.color ?? 'black')
  const fontSize = Number(values.fontSize ?? 32)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Renderiza el texto a un canvas y guarda el PNG como `signatureDataUrl`.
  // El PDF luego estampa esa imagen, así que estilo y color solo se aplican
  // aquí: lo que ve el usuario es lo que se estampa. `onChange` se omite del
  // array para no entrar en bucle: el efecto solo debe reaccionar a los
  // parámetros que el usuario introduce.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const display = text.trim() || t.tools.firmar.preview.textPlaceholder
    const renderSize = fontSize * 4
    const family = FONT_FAMILIES[style] ?? FONT_FAMILIES.script
    const fontDecl = `bold ${style === 'script' ? 'italic ' : ''}${renderSize}px ${family}`
    ctx.font = fontDecl
    const metrics = ctx.measureText(display)
    const width = Math.ceil(metrics.width) + 32
    const height = Math.ceil(renderSize * 1.4) + 32
    canvas.width = width
    canvas.height = height
    // Cambiar tamaño del canvas borra el contexto: hay que reaplicar la fuente.
    ctx.font = fontDecl
    ctx.fillStyle = COLORS[color] ?? COLORS.black
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(display, width / 2, height / 2)
    onChange({ signatureDataUrl: canvas.toDataURL('image/png') })
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [text, style, color, fontSize])

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={text}
        placeholder={t.tools.firmar.preview.textPlaceholder}
        disabled={disabled}
        onChange={(event) => onChange({ text: event.target.value })}
        className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition placeholder:text-muted focus:border-accent disabled:opacity-50"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-ink-soft">{t.tools.firmar.preview.textStyle}</span>
          <select
            value={style}
            disabled={disabled}
            onChange={(event) => onChange({ style: event.target.value })}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            {(['script', 'serif', 'sans'] as const).map((key) => (
              <option key={key} value={key}>
                {t.tools.firmar.preview.styles[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-ink-soft">{t.tools.firmar.preview.textColor}</span>
          <select
            value={color}
            disabled={disabled}
            onChange={(event) => onChange({ color: event.target.value })}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            {(['black', 'blue', 'gray'] as const).map((key) => (
              <option key={key} value={key}>
                {t.tools.firmar.preview.colors[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-ink-soft">{t.tools.firmar.preview.textSize}</span>
          <input
            type="number"
            value={fontSize}
            min={16}
            max={96}
            step={2}
            disabled={disabled}
            onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink disabled:opacity-50"
          />
        </label>
      </div>
      <p className="text-xs text-muted">{t.tools.firmar.preview.textHint}</p>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

function DrawSource({
  values,
  onChange,
  disabled,
}: {
  values: OptionValues
  onChange: (patch: Partial<OptionValues>) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [hasContent, setHasContent] = useState(Boolean(values.signatureDataUrl))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 600
    canvas.height = 200
    // Sin `fillRect`: el lienzo queda transparente para que la imagen
    // exportada no tape el PDF al estamparse. El blanco que ve el usuario al
    // dibujar viene del `bg-white` del CSS, no de los píxeles.
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const initial = String(values.signatureDataUrl ?? '')
    if (initial) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setHasContent(true)
      }
      img.src = initial
    }
    // Vacío a propósito: solo pintamos el estado inicial al montar; rehacerlo
    // al cambiar `signatureDataUrl` borraría lo que el usuario está dibujando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function point(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    }
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const p = point(event)
    if (!canvas || !ctx || !p) return
    drawingRef.current = true
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    canvas.setPointerCapture(event.pointerId)
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const p = point(event)
    if (!ctx || !p) return
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function end(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId)
      onChange({ signatureDataUrl: canvas.toDataURL('image/png') })
      setHasContent(true)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange({ signatureDataUrl: '' })
    setHasContent(false)
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        className={clsx(
          'block w-full rounded-lg border border-line bg-white touch-none',
          !disabled && 'cursor-crosshair',
          disabled && 'opacity-50',
        )}
        style={{ aspectRatio: '3 / 1' }}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{t.tools.firmar.preview.drawHint}</p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasContent}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          {t.tools.firmar.preview.drawClear}
        </button>
      </div>
    </div>
  )
}

function ImageSource({
  values,
  onChange,
  disabled,
}: {
  values: OptionValues
  onChange: (patch: Partial<OptionValues>) => void
  disabled?: boolean
}) {
  const dataUrl = String(values.signatureDataUrl ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange({ signatureDataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
        className="sr-only"
      />
      {dataUrl ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-canvas p-3">
          <div
            className="grid h-20 w-32 shrink-0 place-items-center rounded border border-line bg-[length:8px_8px] bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%,transparent_75%,#e5e5e5_75%),linear-gradient(45deg,#e5e5e5_25%,transparent_25%,transparent_75%,#e5e5e5_75%)] bg-[position:0_0,4px_4px]"
          >
            <img
              src={dataUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
          >
            {t.tools.firmar.preview.imageChange}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full rounded-card border border-dashed border-line-strong bg-subtle px-4 py-6 text-sm text-muted transition hover:border-accent hover:text-ink-soft disabled:opacity-40"
        >
          {t.tools.firmar.preview.noImage}
        </button>
      )}
      <p className="text-xs text-muted">{t.tools.firmar.preview.imageHint}</p>
    </div>
  )
}

function PositioningPreview({
  file,
  page,
  x,
  y,
  width,
  signatureDataUrl,
  onChange,
  disabled,
}: {
  file: File
  page: number
  x: number
  y: number
  width: number
  signatureDataUrl: string
  onChange: (patch: Partial<OptionValues>) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Carga el documento. pdfjs entra por dynamic import para no vivir en el
  // bundle inicial: solo se paga cuando alguien abre Firmar.
  useEffect(() => {
    if (!file) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null
    void (async () => {
      const { pdfjs } = await import('@/lib/pdfjs')
      const data = new Uint8Array(await file.arrayBuffer())
      task = pdfjs.getDocument({ data })
      try {
        const doc = await task.promise
        if (cancelled) {
          // PDFDocumentProxy expone `destroy` en tiempo de ejecución; los tipos
          // de pdfjs-dist no lo declaran.
          await (doc as PDFDocumentProxy & { destroy: () => Promise<void> }).destroy()
          return
        }
        const previous = docRef.current as (PDFDocumentProxy & { destroy?: () => Promise<void> }) | null
        await previous?.destroy?.()
        docRef.current = doc
        setPageCount(doc.numPages)
      } catch {
        // Si el PDF está cifrado o roto, el run fallará; aquí no hacemos nada.
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [file])

  // Carga y dibuja la página seleccionada.
  useEffect(() => {
    const doc = docRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas || !pageCount) return
    const pageNum = clamp(page, 1, doc.numPages)
    let cancelled = false
    let pdfPage: PDFPageProxy | null = null
    void (async () => {
      pdfPage = await doc.getPage(pageNum)
      if (cancelled) {
        pdfPage.cleanup()
        return
      }
      const unit = pdfPage.getViewport({ scale: 1 })
      setPageSize({ width: unit.width, height: unit.height })
      const viewport = pdfPage.getViewport({ scale: RENDER_SCALE })
      canvas.width = viewport.width
      canvas.height = viewport.height
      await pdfPage.render({ canvas, viewport }).promise
      pdfPage.cleanup()
      pdfPage = null
    })()
    return () => {
      cancelled = true
      pdfPage?.cleanup()
    }
  }, [page, pageCount])

  // Click o arrastre: el centro de la firma se coloca donde está el cursor.
  function setPosition(clientX: number, clientY: number) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const xPct = ((clientX - rect.left) / rect.width) * 100
    const yPct = 100 - ((clientY - rect.top) / rect.height) * 100
    onChange({ x: clamp(xPct, 0, 100), y: clamp(yPct, 0, 100) })
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return
    setDragging(true)
    setPosition(event.clientX, event.clientY)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setPosition(event.clientX, event.clientY)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // El ancho de la imagen en la página se da en pt: lo traducimos a % del
  // ancho del contenedor para que la previsualización se mantenga fiel al PDF.
  const widthPct = pageSize ? (width / pageSize.width) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {fmt(t.tools.firmar.preview.pageOf, { n: page, total: pageCount || '?' })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ page: Math.max(1, page - 1) })}
            disabled={page <= 1}
            aria-label={t.tools.firmar.preview.prevPage}
            className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
          >
            <Icon name="arrowLeft" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ page: Math.min(pageCount || 1, page + 1) })}
            disabled={page >= pageCount}
            aria-label={t.tools.firmar.preview.nextPage}
            className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
          >
            <Icon name="arrowLeft" className="size-3.5 rotate-180" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={clsx(
          'relative overflow-hidden rounded-card border border-line bg-subtle select-none',
          !disabled && signatureDataUrl && 'cursor-crosshair',
        )}
      >
        <canvas ref={canvasRef} className="block w-full h-auto" />
        {signatureDataUrl && pageSize && (
          <img
            src={signatureDataUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: `${x}%`,
              bottom: `${y}%`,
              transform: 'translate(-50%, 50%)',
              width: `${widthPct}%`,
              maxWidth: 'none',
            }}
          />
        )}
        {!signatureDataUrl && pageSize && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-muted">
            {t.tools.firmar.preview.empty}
          </p>
        )}
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

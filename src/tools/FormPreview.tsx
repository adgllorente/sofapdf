import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import {
  inspectForm,
  parseFormValues,
  scanPage,
  serializeFormValues,
  type FormOverview,
  type FormValue,
  type FormWidget,
  type PageScan,
} from './form-fields'

const RENDER_SCALE = 2
// Tamaños de letra en puntos de la página; se traducen a cqw del contenedor.
const MAX_FONT_PT = 12
const MULTILINE_FONT_PT = 10

type Status = 'loading' | 'ready' | 'none' | 'xfa' | 'error'

function fontSize(widget: FormWidget): string {
  const pt = (size: number) => (size / widget.pageWidthPt) * 100
  if (widget.multiline) return `${pt(MULTILINE_FONT_PT)}cqw`
  return `${Math.min(widget.fieldHeight * 100 * 0.65, pt(MAX_FONT_PT))}cqw`
}

function box(widget: FormWidget): CSSProperties {
  return {
    left: `${widget.x * 100}%`,
    top: `${widget.y * 100}%`,
    width: `${widget.width * 100}%`,
    height: `${widget.height * 100}%`,
    fontSize: fontSize(widget),
  }
}

/** El control se dibuja con el tamaño del campo sin girar y se gira dentro de su caja. */
function inner(widget: FormWidget): CSSProperties {
  if (widget.rotation === 0) return { inset: 0, width: '100%', height: '100%' }
  // De lado, el ancho del control es el alto de la caja y viceversa.
  const ratio = widget.rotation % 180 !== 0 ? widget.fieldWidth / widget.fieldHeight : 1
  return {
    left: '50%',
    top: '50%',
    width: `${ratio * 100}%`,
    height: `${100 / ratio}%`,
    transform: `translate(-50%, -50%) rotate(${widget.rotation}deg)`,
  }
}

export function FormPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [overview, setOverview] = useState<FormOverview | null>(null)
  // Cada página se lee al visitarla y se guarda: no se recorre el documento entero al abrirlo.
  const [pages, setPages] = useState<Record<number, PageScan>>({})
  const [status, setStatus] = useState<Status>('loading')
  const [renderError, setRenderError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const formsModeRef = useRef<number | undefined>(undefined)
  const text = t.tools['fill-form'].preview

  // Los cambios van por nombre de campo: con otro PDF se empieza de cero para no heredarlos.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file) return
    onChange({ ...values, fields: '{}', page: 1 } as OptionValues)
  }, [file])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!file) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null
    setStatus('loading')
    setOverview(null)
    setPages({})
    void (async () => {
      try {
        const { getPdfDocument, pdfjs } = await import('@/lib/pdfjs')
        formsModeRef.current = pdfjs.AnnotationMode.ENABLE_FORMS
        task = getPdfDocument(new Uint8Array(await file.arrayBuffer()))
        const next = await task.promise
        const result = await inspectForm(next)
        if (cancelled) return
        setDoc(next)
        setOverview(result)
        setStatus(result.xfaOnly ? 'xfa' : result.fieldCount === 0 ? 'none' : 'ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [file])

  const pageCount = overview?.pageCount ?? 0
  const page = Math.max(1, Math.min(Math.floor(Number(values.page) || 1), pageCount || 1))
  const current = pages[page]
  const widgets = current?.widgets ?? []
  const edits = parseFormValues(values.fields)

  useEffect(() => {
    if (!doc || status !== 'ready' || pages[page]) return
    let cancelled = false
    void scanPage(doc, page)
      .then((scan) => {
        if (!cancelled) setPages((known) => ({ ...known, [page]: scan }))
      })
      .catch(() => {
        if (!cancelled) setPages((known) => ({ ...known, [page]: { widgets: [], initial: {} } }))
      })
    return () => {
      cancelled = true
    }
  }, [doc, page, status, pages])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!doc || !canvas || status !== 'ready') return
    let cancelled = false
    let pdfPage: PDFPageProxy | null = null
    let renderTask: RenderTask | null = null
    setRenderError('')
    void (async () => {
      try {
        pdfPage = await doc.getPage(page)
        if (cancelled) return
        const viewport = pdfPage.getViewport({ scale: RENDER_SCALE })
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        // Sin los widgets en el canvas: el valor antiguo no asoma bajo el control.
        renderTask = pdfPage.render({ canvas, viewport, annotationMode: formsModeRef.current })
        await renderTask.promise
      } catch (cause) {
        if (!cancelled) setRenderError(cause instanceof Error ? cause.message : t.run.failed)
      } finally {
        pdfPage?.cleanup()
      }
    })()
    return () => {
      cancelled = true
      // Pasar de página deprisa no puede dejar dos renders sobre el mismo canvas.
      renderTask?.cancel()
    }
  }, [doc, page, status])

  // Libera el documento y el canvas al desmontar o cambiar de fichero.
  useEffect(
    () => () => {
      void (doc as (PDFDocumentProxy & { destroy?: () => Promise<void> }) | null)?.destroy?.()
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    },
    [doc],
  )

  function valueOf(name: string): FormValue {
    if (edits.has(name)) return edits.get(name) as FormValue
    return current?.initial[name] ?? ''
  }

  function setValue(name: string, value: FormValue) {
    const next = new Map(edits)
    // Solo se guardan los cambios: los campos intactos conservan su apariencia original.
    if (current?.initial[name] === value) next.delete(name)
    else next.set(name, value)
    onChange({ ...values, fields: serializeFormValues(next) } as OptionValues)
  }

  function setPage(next: number) {
    onChange({ ...values, page: Math.max(1, Math.min(pageCount, next)) } as OptionValues)
  }

  function reset() {
    onChange({ ...values, fields: '{}' } as OptionValues)
  }

  if (status !== 'ready') {
    const message = {
      loading: text.statusLoading,
      none: text.statusNone,
      xfa: text.statusXfa,
      error: text.statusError,
    }[status]
    return (
      <section className="flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
        <Icon
          name={status === 'loading' ? 'form' : 'alert'}
          className={status === 'error' || status === 'xfa' ? 'size-4 text-danger' : 'size-4 text-muted'}
        />
        {message}
      </section>
    )
  }

  const fieldClass =
    'absolute border border-field-line/60 bg-field text-paper-ink outline-none focus:border-field-line focus:ring-2 focus:ring-field-line/40 disabled:cursor-not-allowed disabled:opacity-60'

  function renderControl(widget: FormWidget) {
    const value = valueOf(widget.name)
    const common = {
      'aria-label': widget.label,
      title: widget.label,
      disabled,
      style: inner(widget),
    }

    if (widget.kind === 'checkbox' || widget.kind === 'radio') {
      const radio = widget.kind === 'radio'
      const checked = radio ? value === widget.onValue : value === true
      return (
        <button
          type="button"
          role={radio ? 'radio' : 'checkbox'}
          aria-checked={checked}
          onClick={() => setValue(widget.name, radio ? (widget.onValue ?? '') : !checked)}
          className={`${fieldClass} grid place-items-center p-0 ${radio ? 'rounded-full' : 'rounded-sm'}`}
          {...common}
          // Los radios de un grupo comparten nombre: la opción los distingue al leerlos.
          aria-label={radio && widget.onValue ? `${widget.label}: ${widget.onValue}` : widget.label}
        >
          {checked &&
            (radio ? (
              <span className="block size-1/2 rounded-full bg-paper-ink" />
            ) : (
              <Icon name="check" className="size-[85%]" strokeWidth={3} />
            ))}
        </button>
      )
    }

    if (widget.kind === 'select') {
      return (
        <select
          value={String(value)}
          size={widget.combo ? undefined : Math.max(2, widget.options.length)}
          onChange={(event) => setValue(widget.name, event.target.value)}
          className={`${fieldClass} rounded-sm px-0.5 py-0`}
          {...common}
        >
          {/* Sin una opción vacía React marcaría la primera y la vista mentiría sobre el valor. */}
          <option value="" hidden={!widget.combo} />
          {widget.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    const className = `${fieldClass} rounded-sm px-[0.3em] py-0 leading-tight`
    const onText = (next: string) => setValue(widget.name, next)
    return widget.multiline ? (
      <textarea
        value={String(value)}
        maxLength={widget.maxLength}
        onChange={(event) => onText(event.target.value)}
        className={`${className} resize-none py-[0.2em]`}
        {...common}
      />
    ) : (
      <input
        type="text"
        value={String(value)}
        maxLength={widget.maxLength}
        onChange={(event) => onText(event.target.value)}
        className={className}
        {...common}
      />
    )
  }

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <Icon name="form" className="size-4 text-accent" />
          {text.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{fmt(text.fieldCount, { n: overview?.fieldCount ?? 0, changed: edits.size })}</span>
          {edits.size > 0 && (
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
            >
              {text.reset}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{text.hint}</p>

      <div className="flex items-center justify-end gap-2 text-xs text-muted">
        <span>{fmt(text.pageOf, { n: page, total: pageCount })}</span>
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label={text.prevPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= pageCount}
          aria-label={text.nextPage}
          className="grid size-7 place-items-center rounded border border-line text-ink-soft transition hover:border-line-strong disabled:opacity-30"
        >
          <Icon name="arrowLeft" className="size-3.5 rotate-180" />
        </button>
      </div>

      <div className="@container relative min-h-[200px] rounded-card border border-line bg-subtle">
        <canvas ref={canvasRef} className="block h-auto w-full" />
        {renderError && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-danger">
            {renderError}
          </p>
        )}
        {current && widgets.length === 0 && (
          <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            {text.noFieldsOnPage}
          </p>
        )}

        {widgets.map((widget) => (
          <div key={widget.id} className="absolute" style={box(widget)}>
            {renderControl(widget)}
          </div>
        ))}
      </div>
    </section>
  )
}

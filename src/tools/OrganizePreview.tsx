import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react'
import clsx from 'clsx'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const THUMB_SCALE = 0.3
const STORAGE_KEY = 'pages'

type PageEntry = { id: string; source: number }

function loadPages(values: OptionValues): PageEntry[] | null {
  const raw = values[STORAGE_KEY]
  if (typeof raw !== 'string' || !raw) return null
  try {
    const parsed = JSON.parse(raw) as PageEntry[]
    if (!Array.isArray(parsed)) return null
    return parsed.filter((p): p is PageEntry => typeof p?.source === 'number' && typeof p?.id === 'string')
  } catch {
    return null
  }
}

export function OrganizePreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState<PageEntry[]>([])
  const idRef = useRef(0)
  const dragIndexRef = useRef<number | null>(null)

  function nextId(): string {
    idRef.current += 1
    return `p${idRef.current}`
  }

  // Carga el PDF una sola vez. pdfjs entra por dynamic import para no inflar
  // el bundle principal. `doc` se lee solo para liberar el anterior al
  // cambiar de fichero; no es una dependencia real.
  /* eslint-disable react-hooks/exhaustive-deps */
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
  }, [file])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Inicializa la lista cuando llega un PDF nuevo o cuando el usuario lo cambia.
  // `values` y `onChange` se leen pero no son dependencias: solo debe
  // dispararse al cambiar el fichero o al conocer el número de páginas.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file || !pageCount) return
    const stored = loadPages(values)
    if (stored && stored.length > 0) return
    const initial: PageEntry[] = Array.from({ length: pageCount }, (_, i) => ({
      id: nextId(),
      source: i,
    }))
    setPages(initial)
    onChange({ [STORAGE_KEY]: JSON.stringify(initial) })
  }, [file, pageCount])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Sincroniza la lista a `values` para que el `run` la lea.
  useEffect(() => {
    if (!pages.length) return
    onChange({ [STORAGE_KEY]: JSON.stringify(pages) })
    // onChange se omite a propósito: solo reacciona a cambios del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages])

  function move(from: number, to: number) {
    if (from === to) return
    setPages((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function duplicate(index: number) {
    setPages((prev) => {
      const next = [...prev]
      const copy: PageEntry = { id: nextId(), source: prev[index].source }
      next.splice(index + 1, 0, copy)
      return next
    })
  }

  function remove(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index))
  }

  function reset() {
    if (!pageCount) return
    const initial: PageEntry[] = Array.from({ length: pageCount }, (_, i) => ({
      id: nextId(),
      source: i,
    }))
    setPages(initial)
  }

  function onDragStart(index: number) {
    return (event: ReactDragEvent) => {
      if (disabled) {
        event.preventDefault()
        return
      }
      dragIndexRef.current = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  function onDragOver(event: ReactDragEvent) {
    if (disabled) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function onDrop(target: number) {
    return (event: ReactDragEvent) => {
      event.preventDefault()
      const from = dragIndexRef.current
      dragIndexRef.current = null
      if (from === null || from === target) return
      move(from, target)
    }
  }

  const empty = pages.length === 0

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t.tools.organizar.preview.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{fmt(t.tools.organizar.preview.count, { n: pages.length })}</span>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || !pageCount}
            className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
          >
            {t.tools.organizar.preview.reset}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t.tools.organizar.preview.hint}</p>

      {empty ? (
        <p className="rounded-card border border-dashed border-line-strong bg-subtle px-4 py-8 text-center text-sm text-muted">
          {t.tools.organizar.preview.empty}
        </p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pages.map((page, index) => (
            <Thumbnail
              key={page.id}
              doc={doc}
              source={page.source}
              position={index}
              total={pages.length}
              disabled={disabled}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onDuplicate={() => duplicate(index)}
              onRemove={() => remove(index)}
              onDragStart={onDragStart(index)}
              onDragOver={onDragOver}
              onDrop={onDrop(index)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

function Thumbnail({
  doc,
  source,
  position,
  total,
  disabled,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  doc: PDFDocumentProxy | null
  source: number
  position: number
  total: number
  disabled?: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
  onDragStart: (event: ReactDragEvent) => void
  onDragOver: (event: ReactDragEvent) => void
  onDrop: (event: ReactDragEvent) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!doc || !canvas) return
    let cancelled = false
    let pdfPage: PDFPageProxy | null = null
    void (async () => {
      pdfPage = await doc.getPage(source + 1)
      if (cancelled) {
        pdfPage.cleanup()
        return
      }
      const viewport = pdfPage.getViewport({ scale: THUMB_SCALE })
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await pdfPage.render({ canvas, viewport }).promise
        if (!cancelled) setRendered(true)
      }
      pdfPage.cleanup()
      pdfPage = null
    })()
    return () => {
      cancelled = true
      pdfPage?.cleanup()
    }
  }, [doc, source])

  const isDuplicate = position !== source

  return (
    <li
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={clsx(
        'group relative flex flex-col gap-2 rounded-card border border-line bg-canvas p-2 transition select-none',
        !disabled && 'cursor-grab active:cursor-grabbing',
        disabled && 'opacity-60',
        'hover:border-line-strong',
      )}
    >
      <div className="grid place-items-center rounded border border-line bg-white">
        {!rendered && (
          <div className="absolute inset-2 grid place-items-center text-xs text-muted">
            {source + 1}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={clsx('block h-auto w-full', !rendered && 'invisible')}
        />
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">{position + 1}</span>
        <span className="text-muted">
          {t.tools.organizar.preview.original} {source + 1}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ThumbButton
          label={t.tools.organizar.preview.moveUp}
          icon="up"
          onClick={onMoveUp}
          disabled={disabled || position === 0}
        />
        <ThumbButton
          label={t.tools.organizar.preview.moveDown}
          icon="down"
          onClick={onMoveDown}
          disabled={disabled || position === total - 1}
        />
        <span className="flex-1" />
        <ThumbButton
          label={t.tools.organizar.preview.duplicate}
          icon="plus"
          onClick={onDuplicate}
          disabled={disabled}
        />
        <ThumbButton
          label={t.tools.organizar.preview.remove}
          icon="trash"
          onClick={onRemove}
          disabled={disabled}
          danger
        />
      </div>
      {isDuplicate && (
        <span className="absolute -top-2 right-2 rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
          ×2
        </span>
      )}
    </li>
  )
}

function ThumbButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string
  icon: 'up' | 'down' | 'trash' | 'plus'
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // Evita que el click en el botón propague al drag & drop del card.
      onPointerDown={(event) => event.stopPropagation()}
      onDragStart={(event) => event.preventDefault()}
      className={clsx(
        'grid size-7 place-items-center rounded-md transition',
        danger
          ? 'text-muted hover:bg-danger/10 hover:text-danger'
          : 'text-muted hover:bg-subtle hover:text-ink',
        disabled && 'opacity-30',
      )}
    >
      <Icon name={icon} className="size-3.5" />
    </button>
  )
}

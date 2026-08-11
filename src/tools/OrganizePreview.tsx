import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react'
import clsx from 'clsx'
import { fmt, t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const THUMB_SCALE = 0.3
const STORAGE_KEY = 'pages'

type PageEntry = { id: string; file: number; source: number }

function buildInitial(pageCounts: number[]): PageEntry[] {
  const initial: PageEntry[] = []
  pageCounts.forEach((count, fileIdx) => {
    for (let i = 0; i < count; i++) {
      initial.push({ id: '', file: fileIdx, source: i })
    }
  })
  return initial
}

export function OrganizePreview({ files, onChange, disabled }: ToolPreviewProps) {
  const [docs, setDocs] = useState<(PDFDocumentProxy | null)[]>([])
  const [pageCounts, setPageCounts] = useState<number[]>([])
  const [pages, setPages] = useState<PageEntry[]>([])
  const idRef = useRef(0)
  const dragIndexRef = useRef<number | null>(null)
  // Recuerda con qué lista de ficheros se construyó `pages`. Cuando cambia la
  // referencia, los IDs guardados pueden cubrir un conjunto distinto y hay
  // que reconstruir desde cero.
  const initializedForRef = useRef<File[] | null>(null)

  const multiFile = files.length > 1

  function nextId(): string {
    idRef.current += 1
    return `p${idRef.current}`
  }

  // Carga cada PDF una sola vez. pdfjs entra por dynamic import para no inflar
  // el bundle principal. Se cancela al cambiar la lista para no acumular
  // documentos en memoria.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (files.length === 0) {
      setDocs([])
      setPageCounts([])
      return
    }
    const slots = new Array<(PDFDocumentProxy | null)>(files.length).fill(null)
    setDocs(slots)
    setPageCounts(new Array<number>(files.length).fill(0))

    let cancelled = false
    const tasks: (PDFDocumentLoadingTask | null)[] = new Array(files.length).fill(null)
    void (async () => {
      const { pdfjs } = await import('@/lib/pdfjs')
      const loading = await Promise.all(
        files.map(async (file, i) => {
          const data = new Uint8Array(await file.arrayBuffer())
          tasks[i] = pdfjs.getDocument({ data })
          return tasks[i]
        }),
      )
      try {
        const loaded = await Promise.all(loading.map((task) => task.promise))
        if (cancelled) {
          await Promise.all(
            loaded.map((d) => (d as PDFDocumentProxy & { destroy: () => Promise<void> }).destroy?.()),
          )
          return
        }
        const previous = docs as (PDFDocumentProxy & { destroy?: () => Promise<void> })[]
        await Promise.all(previous.map((d) => d?.destroy?.()))
        setDocs(loaded)
        setPageCounts(loaded.map((d) => d.numPages))
      } catch {
        // Si algún PDF está cifrado o roto, el run fallará; aquí no hacemos nada.
      }
    })()
    return () => {
      cancelled = true
      tasks.forEach((task) => void task?.destroy())
    }
  }, [files])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Inicializa la lista cuando llega un conjunto de PDFs nuevo o cuando se
  // conoce el número de páginas de todos. `values` y `onChange` se leen pero no
  // son dependencias: solo debe dispararse al cambiar los ficheros o al
  // terminar de cargarlos.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (files.length === 0) return
    // Si el tamaño de `pageCounts` no coincide con el de `files`, todavía no
    // hemos cargado el último cambio y rehacer `buildInitial` con datos
    // viejos pisaría las páginas que faltan.
    if (pageCounts.length !== files.length) return
    const total = pageCounts.reduce((a, b) => a + b, 0)
    if (total === 0) return
    // Si ya inicializamos para estos ficheros, las reordenaciones del usuario
    // viven en `pages` y se persisten en `values`; no hay que tocar nada.
    if (initializedForRef.current === files) return
    const initial: PageEntry[] = buildInitial(pageCounts).map((entry) => ({ ...entry, id: nextId() }))
    setPages(initial)
    onChange({ [STORAGE_KEY]: JSON.stringify(initial) })
    initializedForRef.current = files
  }, [files, pageCounts])
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
      const copy: PageEntry = { id: nextId(), file: prev[index].file, source: prev[index].source }
      next.splice(index + 1, 0, copy)
      return next
    })
  }

  function remove(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index))
  }

  function reset() {
    const total = pageCounts.reduce((a, b) => a + b, 0)
    if (total === 0) return
    const initial: PageEntry[] = buildInitial(pageCounts).map((entry) => ({ ...entry, id: nextId() }))
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
          {t.tools.organize.preview.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{fmt(t.tools.organize.preview.count, { n: pages.length })}</span>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || pages.length === 0}
            className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
          >
            {t.tools.organize.preview.reset}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t.tools.organize.preview.hint}</p>

      {empty ? (
        <p className="rounded-card border border-dashed border-line-strong bg-subtle px-4 py-8 text-center text-sm text-muted">
          {t.tools.organize.preview.empty}
        </p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pages.map((page, index) => {
            const firstIndex = pages.findIndex(
              (p) => p.file === page.file && p.source === page.source,
            )
            const isDuplicate = firstIndex !== -1 && firstIndex !== index
            return (
              <Thumbnail
                key={page.id}
                doc={docs[page.file] ?? null}
                file={page.file}
                source={page.source}
                position={index}
                total={pages.length}
                multiFile={multiFile}
                isDuplicate={isDuplicate}
                disabled={disabled}
                onMoveUp={() => move(index, index - 1)}
                onMoveDown={() => move(index, index + 1)}
                onDuplicate={() => duplicate(index)}
                onRemove={() => remove(index)}
                onDragStart={onDragStart(index)}
                onDragOver={onDragOver}
                onDrop={onDrop(index)}
              />
            )
          })}
        </ol>
      )}
    </section>
  )
}

function Thumbnail({
  doc,
  file,
  source,
  position,
  total,
  multiFile,
  isDuplicate,
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
  file: number
  source: number
  position: number
  total: number
  multiFile: boolean
  isDuplicate: boolean
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

  const sourceLabel = multiFile
    ? fmt(t.tools.organize.preview.docAndPage, { file: file + 1, page: source + 1 })
    : fmt(t.tools.organize.preview.original, { n: source + 1 })

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
            {multiFile ? `${file + 1}.${source + 1}` : source + 1}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={clsx('block h-auto w-full', !rendered && 'invisible')}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-ink">{position + 1}</span>
        <span className="truncate text-muted" title={sourceLabel}>
          {sourceLabel}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ThumbButton
          label={t.tools.organize.preview.moveUp}
          icon="up"
          onClick={onMoveUp}
          disabled={disabled || position === 0}
        />
        <ThumbButton
          label={t.tools.organize.preview.moveDown}
          icon="down"
          onClick={onMoveDown}
          disabled={disabled || position === total - 1}
        />
        <span className="flex-1" />
        <ThumbButton
          label={t.tools.organize.preview.duplicate}
          icon="plus"
          onClick={onDuplicate}
          disabled={disabled}
        />
        <ThumbButton
          label={t.tools.organize.preview.remove}
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
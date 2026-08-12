import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const KEY = 'editor'
const SCALE = 1.5
const MIN_SIZE = 0.025
const MAX_HISTORY = 100
type Mode = 'hand' | 'text' | 'image' | 'pencil' | 'shape' | 'highlight' | 'underlineText' | 'strikeText'
type Point = { x: number; y: number }
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type EditObject = {
  id: string; type: 'text' | 'image' | 'pencil' | 'rect' | 'ellipse' | 'triangle' | 'highlight' | 'underlineText' | 'strikeText'; page: number
  x: number; y: number; width: number; height: number; color: string; bgColor: string
  borderColor: string; borderWidth: number; opacity: number; font: string; fontSize: number
  bold: boolean; italic: boolean; underline: boolean; align: string; text: string
  points?: Point[]; imageData?: string; rotation: number
}
type EditorStyle = {
  text: string; font: string; fontSize: number; color: string; bgColor: string
  borderColor: string; borderWidth: number; opacity: number; bold: boolean
  italic: boolean; underline: boolean; align: string; shape: string
}
type EditorHistory = { past: EditObject[][]; future: EditObject[][] }

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)) }

function readObjects(values: OptionValues): EditObject[] {
  try {
    const data = JSON.parse(String(values[KEY] ?? '[]')) as EditObject[]
    return Array.isArray(data) ? data.filter((item) => item && typeof item.id === 'string') : []
  } catch { return [] }
}

function pencilBounds(points: Point[] = []) {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, width: Math.max(MIN_SIZE, Math.max(...xs) - x), height: Math.max(MIN_SIZE, Math.max(...ys) - y) }
}

export function EditPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [page, setPage] = useState(1)
  const [mode, setMode] = useState<Mode>('text')
  const [selected, setSelected] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<{ start: Point; current: Point; points: Point[] } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(0)
  const historyRef = useRef<EditorHistory>({ past: [], future: [] })
  const [style, setStyle] = useState<EditorStyle>({ text: t.tools.edit.preview.defaultText, font: 'Helvetica', fontSize: 18, color: '#111827', bgColor: '#ffffff', borderColor: '#111827', borderWidth: 1, opacity: 100, bold: false, italic: false, underline: false, align: 'left', shape: 'rect' })
  const objects = readObjects(values)
  const current = objects.filter((item) => item.page === page)
  const active = objects.find((item) => item.id === selected && item.page === page) ?? null
  const optionType = active?.type ?? (mode === 'hand' || mode === 'image' ? null : mode)

  useEffect(() => {
    if (!selected && mode === 'hand') setMode('text')
  }, [selected, mode])

  useEffect(() => {
    if (!file) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null
    void (async () => {
      const { getPdfDocument } = await import('@/lib/pdfjs')
      task = getPdfDocument(new Uint8Array(await file.arrayBuffer()))
      try {
        const next = await task.promise
        if (cancelled) { await (next as PDFDocumentProxy & { destroy: () => Promise<void> }).destroy(); return }
        setDoc(next); setPageCount(next.numPages); setPage(1)
      } catch { if (!cancelled) setError(t.run.failed) }
    })()
    return () => { cancelled = true; void task?.destroy() }
  }, [file])

  useEffect(() => {
    historyRef.current = { past: [], future: [] }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!doc || !canvas || !pageCount) return
    let cancelled = false
    let pdfPage: PDFPageProxy | null = null
    void (async () => {
      try {
        pdfPage = await doc.getPage(page)
        const viewport = pdfPage.getViewport({ scale: SCALE })
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        if (!cancelled) await pdfPage.render({ canvas, viewport }).promise
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : t.run.failed) }
      finally { pdfPage?.cleanup() }
    })()
    return () => { cancelled = true; pdfPage?.cleanup() }
  }, [doc, page, pageCount])

  function update(next: EditObject[]) {
    const current = readObjects(values)
    if (JSON.stringify(current) === JSON.stringify(next)) return
    historyRef.current.past = [...historyRef.current.past, current].slice(-MAX_HISTORY)
    historyRef.current.future = []
    onChange({ ...values, [KEY]: JSON.stringify(next) })
  }
  function undo() {
    const { past, future } = historyRef.current
    const previous = past.at(-1)
    if (!previous) return
    historyRef.current = { past: past.slice(0, -1), future: [readObjects(values), ...future].slice(0, MAX_HISTORY) }
    onChange({ ...values, [KEY]: JSON.stringify(previous) })
  }
  function redo() {
    const { past, future } = historyRef.current
    const next = future[0]
    if (!next) return
    historyRef.current = { past: [...past, readObjects(values)].slice(-MAX_HISTORY), future: future.slice(1) }
    onChange({ ...values, [KEY]: JSON.stringify(next) })
  }
  function nextId() { idRef.current += 1; return `edit-${idRef.current}` }
  function point(event: PointerEvent | ReactPointerEvent, rect: DOMRect): Point {
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) }
  }
  function syncStyle(item: EditObject) {
    setStyle((previous) => ({ ...previous, text: item.text, font: item.font, fontSize: item.fontSize, color: item.color, bgColor: item.bgColor, borderColor: item.borderColor, borderWidth: item.borderWidth, opacity: Math.round(item.opacity * 100), bold: item.bold, italic: item.italic, underline: item.underline, align: item.align, shape: item.type === 'rect' || item.type === 'ellipse' || item.type === 'triangle' ? item.type : previous.shape }))
  }
  function addObject(partial: Partial<EditObject>) {
    const annotation = partial.type === 'highlight' || partial.type === 'underlineText' || partial.type === 'strikeText'
    const item = { id: nextId(), page, type: partial.type ?? 'text', x: partial.x ?? .2, y: partial.y ?? .2, width: partial.width ?? .3, height: partial.height ?? .1, color: partial.type === 'highlight' ? '#facc15' : style.color, bgColor: style.bgColor, borderColor: style.borderColor, borderWidth: style.borderWidth, opacity: annotation ? (partial.type === 'highlight' ? .35 : 1) : style.opacity / 100, font: style.font, fontSize: style.fontSize, bold: style.bold, italic: style.italic, underline: style.underline, align: style.align, text: partial.text ?? '', rotation: partial.rotation ?? 0, ...partial } as EditObject
    update([...objects, item]); setSelected(item.id); setMode('hand'); syncStyle(item)
  }
  function patchActive(patch: Partial<EditObject>) {
    if (active) update(objects.map((item) => item.id === active.id ? { ...item, ...patch } : item))
  }
  function deleteObject(id: string) {
    update(objects.filter((item) => item.id !== id))
    if (selected === id) { setSelected(null); setMode('text') }
    if (editingText === id) setEditingText(null)
  }
  function startRotate(event: ReactPointerEvent<HTMLButtonElement>, item: EditObject) {
    event.stopPropagation()
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || disabled) return
    const centerX = rect.left + (item.x + item.width / 2) * rect.width
    const centerY = rect.top + (item.y + item.height / 2) * rect.height
    const angleAt = (clientX: number, clientY: number) => Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI
    const startAngle = angleAt(event.clientX, event.clientY)
    const initialRotation = item.rotation ?? 0
    const snapThreshold = 7
    const snap = (angle: number) => {
      const normalized = ((angle % 360) + 360) % 360
      const nearest = Math.round(normalized / 45) * 45
      const distance = Math.abs(((normalized - nearest + 540) % 360) - 180)
      return distance <= snapThreshold ? (nearest + 360) % 360 : normalized
    }
    const onMove = (move: PointerEvent) => {
      const rotation = snap(initialRotation + angleAt(move.clientX, move.clientY) - startAngle)
      update(objects.map((candidate) => candidate.id === item.id ? { ...candidate, rotation } : candidate))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable
      if (typing) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo(); else undo()
        return
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault(); redo(); return
      }
      if (!selected || editingText || (event.key !== 'Delete' && event.key !== 'Backspace')) return
      event.preventDefault(); deleteObject(selected)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // La función necesita el estado actual del editor al recibir la tecla.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editingText, objects, values])
  function startCreate(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || mode === 'image') return
    if (mode === 'hand') { setSelected(null); setEditingText(null); setMode('text'); return }
    setSelected(null); setEditingText(null)
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return
    event.preventDefault()
    const start = point(event, rect)
    const state = { current: start, points: [start] }
    setDraft({ start, current: start, points: [start] })
    const onMove = (move: PointerEvent) => {
      state.current = point(move, rect)
      if (mode === 'pencil') state.points.push(state.current)
      setDraft({ start, current: state.current, points: [...state.points] })
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      const x = Math.min(start.x, state.current.x), y = Math.min(start.y, state.current.y)
      if (mode === 'pencil' && state.points.length > 1) addObject({ type: 'pencil', x, y, width: Math.abs(state.current.x - start.x), height: Math.abs(state.current.y - start.y), points: state.points })
      if (mode === 'text' || mode === 'shape' || mode === 'highlight' || mode === 'underlineText' || mode === 'strikeText') addObject({ type: mode === 'text' ? 'text' : mode === 'shape' ? style.shape as EditObject['type'] : mode, x, y, width: Math.max(MIN_SIZE, Math.abs(state.current.x - start.x)), height: Math.max(MIN_SIZE, Math.abs(state.current.y - start.y)), text: style.text })
      setDraft(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }
  function selectAndMove(event: ReactPointerEvent<Element>, item: EditObject) {
    event.stopPropagation(); setSelected(item.id); syncStyle(item); setMode('hand')
    if (disabled) return
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return
    event.preventDefault()
    const start = point(event, rect)
    const bounds = item.type === 'pencil' ? pencilBounds(item.points) : item
    const onMove = (move: PointerEvent) => {
      const currentPoint = point(move, rect)
      const dx = currentPoint.x - start.x, dy = currentPoint.y - start.y
      if (item.type === 'pencil') update(objects.map((candidate) => candidate.id === item.id ? { ...candidate, points: (candidate.points ?? []).map((p) => ({ x: clamp(p.x + dx), y: clamp(p.y + dy) })) } : candidate))
      else update(objects.map((candidate) => candidate.id === item.id ? { ...candidate, x: clamp(item.x + dx, 0, 1 - bounds.width), y: clamp(item.y + dy, 0, 1 - bounds.height) } : candidate))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }
  function startResize(event: ReactPointerEvent<Element>, item: EditObject, handle: ResizeHandle) {
    event.stopPropagation(); event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect || disabled) return
    const start = point(event, rect)
    const onMove = (move: PointerEvent) => {
      const currentPoint = point(move, rect)
      const dx = currentPoint.x - start.x, dy = currentPoint.y - start.y
      let x = item.x, y = item.y, width = item.width, height = item.height
      if (handle.includes('left')) { x = clamp(item.x + dx, 0, item.x + item.width - MIN_SIZE); width = item.x + item.width - x }
      else width = clamp(item.width + dx, MIN_SIZE, 1 - item.x)
      if (handle.includes('top')) { y = clamp(item.y + dy, 0, item.y + item.height - MIN_SIZE); height = item.y + item.height - y }
      else height = clamp(item.height + dy, MIN_SIZE, 1 - item.y)
      update(objects.map((candidate) => candidate.id === item.id ? { ...candidate, x, y, width, height } : candidate))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }
  function editText(item: EditObject) { setSelected(item.id); syncStyle(item); setTextDraft(item.text); setEditingText(item.id); setMode('hand') }
  function finishTextEdit() { if (editingText) { update(objects.map((item) => item.id === editingText ? { ...item, text: textDraft } : item)); setStyle({ ...style, text: textDraft }) }; setEditingText(null) }
  function moveLayer(direction: -1 | 1) {
    if (!active) return
    const index = objects.findIndex((item) => item.id === active.id)
    if (index < 0) return
    let target = index + direction
    while (target >= 0 && target < objects.length && objects[target].page !== active.page) target += direction
    if (target < 0 || target >= objects.length) return
    const next = [...objects]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }
  function alignObject(axis: 'horizontal' | 'vertical') {
    if (!active) return
    const bounds = active.type === 'pencil' ? pencilBounds(active.points) : active
    const delta = axis === 'horizontal' ? 0.5 - (bounds.x + bounds.width / 2) : 0.5 - (bounds.y + bounds.height / 2)
    update(objects.map((item) => {
      if (item.id !== active.id) return item
      if (item.type === 'pencil') {
        const points = (item.points ?? []).map((point) => axis === 'horizontal'
          ? { ...point, x: clamp(point.x + delta) }
          : { ...point, y: clamp(point.y + delta) })
        return { ...item, points }
      }
      return axis === 'horizontal' ? { ...item, x: (1 - item.width) / 2 } : { ...item, y: (1 - item.height) / 2 }
    }))
  }
  function addImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0]; if (!image) return
    const reader = new FileReader()
    reader.onload = () => addObject({ type: 'image', width: .45, height: .3, imageData: String(reader.result), text: image.name })
    reader.readAsDataURL(image); event.target.value = ''
  }
  function toolButton(next: Exclude<Mode, 'image' | 'hand' | 'highlight' | 'underlineText' | 'strikeText'>, icon: 'pen' | 'text' | 'shapes', label: string) {
    return <button type="button" onClick={() => { setMode(next); setSelected(null); setEditingText(null); if (next === 'text') setStyle((previous) => ({ ...previous, text: t.tools.edit.preview.defaultText })) }} disabled={disabled} title={label} aria-label={label} className={`grid size-9 place-items-center rounded-lg border ${mode === next ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'} disabled:opacity-40`}><Icon name={icon} className="size-4" /></button>
  }

  return <section className="space-y-4 rounded-card border border-line bg-surface p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-ink">{t.tools.edit.preview.title}</h2><p className="mt-1 text-xs text-muted">{t.tools.edit.preview.hint}</p></div></div>
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-subtle px-2 py-1.5 text-xs text-muted">
      <span className="shrink-0">{t.tools.edit.preview.pageNumber}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setPage(Math.max(1, page - 1)); setSelected(null); setEditingText(null) }} disabled={page <= 1} aria-label={t.tools.edit.preview.prevPage} className="grid size-7 place-items-center rounded border border-line bg-surface disabled:opacity-30"><Icon name="arrowLeft" className="size-3.5" /></button>
        <label className="flex items-center gap-1"><span className="sr-only">{t.tools.edit.preview.pageNumber}</span><input type="number" min="1" max={pageCount || 1} value={page} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) { setPage(Math.max(1, Math.min(pageCount || 1, next))); setSelected(null); setEditingText(null) } }} className="w-14 rounded border border-line bg-surface px-2 py-1 text-center text-sm text-ink" /></label><span>/ {pageCount || '?'}</span>
        <button type="button" onClick={() => { setPage(Math.min(pageCount, page + 1)); setSelected(null); setEditingText(null) }} disabled={page >= pageCount} aria-label={t.tools.edit.preview.nextPage} className="grid size-7 place-items-center rounded border border-line bg-surface disabled:opacity-30"><Icon name="arrowLeft" className="size-3.5 rotate-180" /></button>
      </div>
    </div>
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {toolButton('text', 'text', t.tools.edit.preview.text)}{toolButton('pencil', 'pen', t.tools.edit.preview.pencil)}{toolButton('shape', 'shapes', t.tools.edit.preview.shape)}
        {(['highlight', 'underlineText', 'strikeText'] as const).map((next) => <button key={next} type="button" onClick={() => { setMode(next); setSelected(null); setEditingText(null) }} disabled={disabled} title={t.tools.edit.preview[next]} aria-label={t.tools.edit.preview[next]} className={`grid size-9 place-items-center rounded-lg border ${mode === next ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'} disabled:opacity-40`}><Icon name={next === 'highlight' ? 'highlight' : next === 'underlineText' ? 'underline' : 'strikethrough'} className="size-4" /></button>)}
        <button type="button" onClick={() => imageInputRef.current?.click()} disabled={disabled} title={t.tools.edit.preview.image} aria-label={t.tools.edit.preview.image} className="grid size-9 place-items-center rounded-lg border border-line text-muted disabled:opacity-40"><Icon name="image" className="size-4" /></button>
        <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" onChange={addImage} className="hidden" />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-subtle p-2">
        <button type="button" onClick={undo} disabled={disabled || !historyRef.current.past.length} title={t.tools.edit.preview.undo} aria-label={t.tools.edit.preview.undo} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="undo" className="size-4" /></button>
        <button type="button" onClick={redo} disabled={disabled || !historyRef.current.future.length} title={t.tools.edit.preview.redo} aria-label={t.tools.edit.preview.redo} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="redo" className="size-4" /></button>
        <span className="mr-1 text-xs text-muted">{t.tools.edit.preview.organizeLabel}</span>
        <button type="button" onClick={() => moveLayer(1)} disabled={disabled || !active || !objects.some((item, index) => index > objects.findIndex((candidate) => candidate.id === active?.id) && item.page === active?.page)} title={t.tools.edit.preview.bringForward} aria-label={t.tools.edit.preview.bringForward} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="up" className="size-4" /></button>
        <button type="button" onClick={() => moveLayer(-1)} disabled={disabled || !active || !objects.some((item, index) => index < objects.findIndex((candidate) => candidate.id === active?.id) && item.page === active?.page)} title={t.tools.edit.preview.sendBackward} aria-label={t.tools.edit.preview.sendBackward} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="down" className="size-4" /></button>
        <button type="button" onClick={() => alignObject('horizontal')} disabled={disabled || !active} title={t.tools.edit.preview.alignHorizontal} aria-label={t.tools.edit.preview.alignHorizontal} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="alignHorizontal" className="size-4" /></button>
        <button type="button" onClick={() => alignObject('vertical')} disabled={disabled || !active} title={t.tools.edit.preview.alignVertical} aria-label={t.tools.edit.preview.alignVertical} className="grid size-8 place-items-center rounded border border-line text-muted disabled:opacity-30"><Icon name="alignVertical" className="size-4" /></button>
      </div>
      {optionType && <EditorOptions type={optionType} style={style} setStyle={setStyle} patchActive={patchActive} />}
    </div>
    <div className="min-h-[200px] rounded-card border border-line bg-subtle">
      <div ref={containerRef} onPointerDown={startCreate} className={`relative min-h-[200px] touch-none select-none overflow-visible ${mode === 'hand' ? 'cursor-default' : 'cursor-crosshair'}`}>
        <canvas ref={canvasRef} className="block h-auto w-full" />
        {error && <p className="absolute inset-0 grid place-items-center text-sm text-danger">{error}</p>}
        {current.map((item) => <EditorObject key={item.id} item={item} selected={item.id === selected} editing={item.id === editingText} onSelect={(event) => selectAndMove(event, item)} onResize={(event, handle) => startResize(event, item, handle)} onDelete={() => deleteObject(item.id)} onRotateStart={(event) => startRotate(event, item)} onEdit={() => editText(item)} textDraft={textDraft} onTextChange={setTextDraft} onTextCommit={finishTextEdit} />)}
        {draft?.points && mode === 'pencil' && <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible"><polyline points={draft.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={style.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={style.borderWidth} vectorEffect="non-scaling-stroke" /></svg>}
        {draft && mode !== 'pencil' && <div className="pointer-events-none absolute border-2 border-dashed border-accent" style={{ left: `${Math.min(draft.start.x, draft.current.x) * 100}%`, top: `${Math.min(draft.start.y, draft.current.y) * 100}%`, width: `${Math.abs(draft.current.x - draft.start.x) * 100}%`, height: `${Math.abs(draft.current.y - draft.start.y) * 100}%` }} />}
      </div>
    </div>
  </section>
}

function EditorOptions({ type, style, setStyle, patchActive }: { type: Mode | EditObject['type']; style: EditorStyle; setStyle: (style: EditorStyle) => void; patchActive: (patch: Partial<EditObject>) => void }) {
  const isText = type === 'text'
  const isShape = type === 'shape' || type === 'rect' || type === 'ellipse' || type === 'triangle'
  const isPencil = type === 'pencil'
  const isImage = type === 'image'
  const field = 'mt-1 block w-32 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink'
  function change(patch: Partial<EditorStyle>, objectPatch: Partial<EditObject>) { setStyle({ ...style, ...patch }); patchActive(objectPatch) }
  return <div className="flex max-h-56 flex-wrap items-start gap-x-4 gap-y-3 overflow-y-auto rounded-lg bg-subtle p-3">
    {isText && <>
      <Field label={t.tools.edit.preview.font}><select value={style.font} onChange={(e) => change({ font: e.target.value }, { font: e.target.value })} className={field}><option value="Helvetica">Helvetica</option><option value="Times">Times</option><option value="Courier">Courier</option></select></Field>
      <Field label={t.tools.edit.preview.size}><input type="number" min="6" max="96" value={style.fontSize} onChange={(e) => change({ fontSize: Number(e.target.value) }, { fontSize: Number(e.target.value) })} className={field} /></Field>
      <ColorControl label={t.tools.edit.preview.color} value={style.color} allowTransparent={false} onChange={(color) => change({ color }, { color })} />
      <ColorControl label={t.tools.edit.preview.background} value={style.bgColor} allowTransparent={false} onChange={(bgColor) => change({ bgColor }, { bgColor })} />
      <div><span className="block min-h-4 text-xs text-muted">{t.tools.edit.preview.style}</span><div className="mt-1 flex h-9 items-center gap-1"><ToggleButton label={t.tools.edit.preview.boldMark} active={style.bold} onClick={() => change({ bold: !style.bold }, { bold: !style.bold })} className="font-bold" /><ToggleButton label={t.tools.edit.preview.italicMark} active={style.italic} onClick={() => change({ italic: !style.italic }, { italic: !style.italic })} className="italic" /><ToggleButton label={t.tools.edit.preview.underlineMark} active={style.underline} onClick={() => change({ underline: !style.underline }, { underline: !style.underline })} className="underline" /></div></div>
      <Field label={t.tools.edit.preview.alignment}><div className="mt-1 flex h-9 items-center gap-1"><AlignmentButton value="left" current={style.align} label={t.tools.edit.preview.alignLeft} icon="alignLeft" onChange={(align) => change({ align }, { align })} /><AlignmentButton value="center" current={style.align} label={t.tools.edit.preview.alignCenter} icon="alignCenter" onChange={(align) => change({ align }, { align })} /><AlignmentButton value="right" current={style.align} label={t.tools.edit.preview.alignRight} icon="alignRight" onChange={(align) => change({ align }, { align })} /></div></Field>
    </>}
    {isShape && <>
      <Field label={t.tools.edit.preview.shape}><select value={style.shape} onChange={(e) => change({ shape: e.target.value }, { type: e.target.value as EditObject['type'] })} className={field}><option value="rect">{t.tools.edit.preview.rectangle}</option><option value="ellipse">{t.tools.edit.preview.ellipse}</option><option value="triangle">{t.tools.edit.preview.triangle}</option></select></Field>
      <ColorControl label={t.tools.edit.preview.borderColor} value={style.borderColor} allowTransparent onChange={(borderColor) => change({ borderColor }, { borderColor })} />
      <ColorControl label={t.tools.edit.preview.background} value={style.bgColor} allowTransparent onChange={(bgColor) => change({ bgColor }, { bgColor })} />
      <WidthControl value={style.borderWidth} onChange={(borderWidth) => change({ borderWidth }, { borderWidth })} />
    </>}
    {isPencil && <><ColorControl label={t.tools.edit.preview.color} value={style.color} allowTransparent={false} onChange={(color) => change({ color }, { color })} /><WidthControl value={style.borderWidth} onChange={(borderWidth) => change({ borderWidth }, { borderWidth })} /></>}
    {(isShape || isImage) && <Field label={t.tools.edit.preview.opacity}><input type="range" min="5" max="100" value={style.opacity} onChange={(e) => change({ opacity: Number(e.target.value) }, { opacity: Number(e.target.value) / 100 })} className="mt-2 block w-28 accent-accent" /></Field>}
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs text-muted"><span className="block min-h-4">{label}</span>{children}</label> }
function AlignmentButton({ value, current, label, icon, onChange }: { value: string; current: string; label: string; icon: 'alignLeft' | 'alignCenter' | 'alignRight'; onChange: (value: string) => void }) { return <button type="button" aria-label={label} title={label} onClick={() => onChange(value)} className={`grid size-9 place-items-center rounded border ${current === value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}><Icon name={icon} className="size-4" /></button> }
function ColorControl({ label, value, allowTransparent, onChange }: { label: string; value: string; allowTransparent: boolean; onChange: (value: string) => void }) {
  const transparent = value === 'transparent'
  return <div className="text-xs text-muted"><span className="block min-h-4">{label}</span><div className="mt-1 flex h-9 items-center gap-2"><input type="color" disabled={allowTransparent && transparent} value={transparent ? '#ffffff' : value} onChange={(event) => onChange(event.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-40" />{allowTransparent && <label className="flex items-center gap-1 whitespace-nowrap"><input type="checkbox" checked={transparent} onChange={(event) => onChange(event.target.checked ? 'transparent' : '#ffffff')} className="size-3.5 accent-accent" />{t.tools.edit.preview.transparent}</label>}</div></div>
}
function WidthControl({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <label className="block text-xs text-muted">{t.tools.edit.preview.strokeWidth}<input type="number" min="1" max="24" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block w-20 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink" /></label> }
function ToggleButton({ label, active, onClick, className }: { label: string; active: boolean; onClick: () => void; className: string }) { return <button type="button" onClick={onClick} aria-label={label} className={`rounded border px-2 py-1.5 text-sm ${className} ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}>{label}</button> }

function EditorObject({ item, selected, editing, onSelect, onResize, onDelete, onRotateStart, onEdit, textDraft, onTextChange, onTextCommit }: { item: EditObject; selected: boolean; editing: boolean; onSelect: (event: ReactPointerEvent<Element>) => void; onResize: (event: ReactPointerEvent<Element>, handle: ResizeHandle) => void; onDelete: () => void; onRotateStart: (event: ReactPointerEvent<HTMLButtonElement>) => void; onEdit: () => void; textDraft: string; onTextChange: (value: string) => void; onTextCommit: () => void }) {
  const box = item.type === 'pencil' ? pencilBounds(item.points) : item
  const common = { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${Math.max(box.width, MIN_SIZE) * 100}%`, height: `${Math.max(box.height, MIN_SIZE) * 100}%`, opacity: item.opacity, transform: `rotate(${item.rotation ?? 0}deg)`, transformOrigin: 'center' }
  const border = item.borderWidth ? `solid ${item.borderWidth}px ${item.borderColor}` : 'none'
  if (item.type === 'pencil') return <><svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" style={{ transform: `rotate(${item.rotation ?? 0}deg)`, transformOrigin: 'center' }}><polyline points={(item.points ?? []).map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={item.borderWidth} vectorEffect="non-scaling-stroke" /></svg><div onPointerDown={onSelect} className={`absolute ${selected ? 'ring-2 ring-accent' : ''}`} style={common}>{selected && <><RotateControl rotation={item.rotation ?? 0} onRotateStart={onRotateStart} /><DeleteControl rotation={item.rotation ?? 0} onDelete={onDelete} /></>}</div></>
  if (item.type === 'image' && item.imageData) return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><img src={item.imageData} alt="" className="h-full w-full object-contain" /></SelectableBox>
  if (item.type === 'text') return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><div onDoubleClick={(event) => { event.stopPropagation(); onEdit() }} className="flex size-full overflow-hidden whitespace-pre-wrap p-1" style={{ color: item.color, backgroundColor: item.bgColor, border: 'none', fontFamily: item.font, fontSize: `${item.fontSize * .75}px`, fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? 'italic' : 'normal', textDecoration: item.underline ? 'underline' : 'none', textAlign: item.align as 'left' | 'center' | 'right', justifyContent: item.align === 'center' ? 'center' : item.align === 'right' ? 'flex-end' : 'flex-start' }}>{editing ? <textarea autoFocus value={textDraft} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onTextChange(event.target.value)} onBlur={onTextCommit} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onTextCommit() } if (event.key === 'Escape') { event.preventDefault(); onTextCommit() } }} className="size-full resize-none border-0 bg-transparent p-0 text-inherit outline-none" /> : item.text}</div></SelectableBox>
  if (item.type === 'highlight') return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><div className="size-full" style={{ backgroundColor: item.color }} /></SelectableBox>
  if (item.type === 'underlineText' || item.type === 'strikeText') return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><div className="relative size-full"><span className="absolute inset-x-0 h-0.5" style={{ backgroundColor: item.color, top: item.type === 'strikeText' ? '50%' : 'calc(100% - 2px)' }} /></div></SelectableBox>
  if (item.type === 'triangle') return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible"><polygon points="50,0 100,100 0,100" fill={item.bgColor} stroke={item.borderColor} strokeWidth={item.borderWidth * 2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg></SelectableBox>
  return <SelectableBox rotation={item.rotation ?? 0} common={common} selected={selected} onSelect={onSelect} onResize={onResize} onDelete={onDelete} onRotateStart={onRotateStart}><div className="size-full" style={{ backgroundColor: item.bgColor, borderRadius: item.type === 'ellipse' ? '50%' : 0, border: border }} /></SelectableBox>
}

function SelectableBox({ rotation, common, selected, onSelect, onResize, onDelete, onRotateStart, children }: { rotation: number; common: Record<string, string | number>; selected: boolean; onSelect: (event: ReactPointerEvent<Element>) => void; onResize: (event: ReactPointerEvent<Element>, handle: ResizeHandle) => void; onDelete: () => void; onRotateStart: (event: ReactPointerEvent<HTMLButtonElement>) => void; children: React.ReactNode }) { return <div onPointerDown={onSelect} className={`absolute cursor-move ${selected ? 'ring-2 ring-accent' : ''}`} style={common}>{children}{selected && <><RotateControl rotation={rotation} onRotateStart={onRotateStart} /><DeleteControl rotation={rotation} onDelete={onDelete} /><ResizeHandles onResize={onResize} /></>}</div> }
function DeleteControl({ rotation, onDelete }: { rotation: number; onDelete: () => void }) { return <span className="absolute -right-2 -top-9 z-20 pb-3" style={{ transform: `rotate(${-rotation}deg)` }}><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={onDelete} aria-label={t.tools.edit.preview.delete} title={t.tools.edit.preview.delete} className="grid size-6 place-items-center rounded-full bg-danger text-on-accent shadow"><Icon name="trash" className="size-3.5" /></button></span> }
function RotateControl({ rotation, onRotateStart }: { rotation: number; onRotateStart: (event: ReactPointerEvent<HTMLButtonElement>) => void }) { return <span className="absolute -left-2 -top-9 z-20 pb-3" style={{ transform: `rotate(${-rotation}deg)` }}><button type="button" onPointerDown={onRotateStart} aria-label={t.tools.edit.preview.rotate} title={t.tools.edit.preview.rotate} className="grid size-6 touch-none place-items-center rounded-full border border-line bg-surface text-ink shadow"><Icon name="rotate" className="size-3.5" /></button></span> }
function ResizeHandles({ onResize }: { onResize: (event: ReactPointerEvent<Element>, handle: ResizeHandle) => void }) { return <>{(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as ResizeHandle[]).map((handle) => <button key={handle} type="button" onPointerDown={(event) => onResize(event, handle)} aria-label={t.tools.edit.preview.resize} className={`absolute z-10 size-3 touch-none rounded-sm border border-surface bg-accent ${handle.includes('top') ? '-top-1.5' : '-bottom-1.5'} ${handle.includes('left') ? '-left-1.5 cursor-nwse-resize' : '-right-1.5 cursor-nesw-resize'}`} />)}</> }

import { useEffect, useState } from 'react'
import { t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

type PdfInfo = {
  Title?: string
  Author?: string
  Subject?: string
  Keywords?: string
}

type Status = 'loading' | 'loaded' | 'empty' | 'error'

const FIELDS = ['title', 'author', 'subject', 'keywords'] as const

function infoToValues(info: PdfInfo): Record<string, string> {
  // Keywords en PDF llegan como string separado por espacios; el impl lo
  // reparsea por comas al guardar, así que se entrega tal cual.
  return {
    title: (info.Title ?? '').trim(),
    author: (info.Author ?? '').trim(),
    subject: (info.Subject ?? '').trim(),
    keywords: (info.Keywords ?? '').trim(),
  }
}

export function MetadataPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [status, setStatus] = useState<Status>('loading')

  // Solo reacciona al fichero: la carga inicial dispara el fetch.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null
    setStatus('loading')
    void (async () => {
      let doc: PDFDocumentProxy | null = null
      try {
        const { pdfjs } = await import('@/lib/pdfjs')
        const data = new Uint8Array(await file.arrayBuffer())
        task = pdfjs.getDocument({ data })
        doc = await task.promise
        if (cancelled) {
          // PDFDocumentProxy expone `destroy` en tiempo de ejecución; los tipos
          // de pdfjs-dist no lo declaran.
          await (doc as PDFDocumentProxy & { destroy: () => Promise<void> }).destroy()
          return
        }
        const { info } = await doc.getMetadata()
        if (cancelled) return
        const next = infoToValues(info as PdfInfo)
        const hasAny = Object.values(next).some((value) => value.length > 0)
        onChange({ ...values, ...next })
        setStatus(hasAny ? 'loaded' : 'empty')
      } catch {
        if (!cancelled) setStatus('error')
      } finally {
        const closable = doc as (PDFDocumentProxy & { destroy?: () => Promise<void> }) | null
        await closable?.destroy?.()
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [file])
  /* eslint-enable react-hooks/exhaustive-deps */

  function clearAll() {
    const cleared = Object.fromEntries(FIELDS.map((key) => [key, ''])) as OptionValues
    onChange({ ...values, ...cleared })
  }

  const message = {
    loading: t.tools.metadata.preview.statusLoading,
    loaded: t.tools.metadata.preview.statusLoaded,
    empty: t.tools.metadata.preview.statusEmpty,
    error: t.tools.metadata.preview.statusError,
  }[status]

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm">
      <span className="flex items-center gap-2 text-ink-soft">
        <Icon
          name={status === 'error' ? 'alert' : 'tag'}
          className={status === 'error' ? 'size-4 text-danger' : 'size-4 text-muted'}
        />
        {message}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={clearAll}
        disabled={disabled || status === 'loading'}
        className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:border-line-strong disabled:opacity-40"
      >
        {t.tools.metadata.preview.clearAll}
      </button>
    </section>
  )
}

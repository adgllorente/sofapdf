import { useEffect, useState } from 'react'
import { t } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { OptionValues, ToolPreviewProps } from '@/tools/types'
import { loadMetadataFromFile } from './metadata-loader'

type Status = 'loading' | 'loaded' | 'empty' | 'error'

const FIELDS = ['title', 'author', 'subject', 'keywords'] as const

export function MetadataPreview({ files, values, onChange, disabled }: ToolPreviewProps) {
  const [file] = files
  const [status, setStatus] = useState<Status>('loading')

  // Solo reacciona al fichero: la carga inicial dispara el fetch.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!file) return
    let cancelled = false
    setStatus('loading')
    void (async () => {
      try {
        const next = await loadMetadataFromFile(file)
        if (cancelled) return
        const hasAny = FIELDS.some((key) => String(next[key] ?? '').length > 0)
        onChange({ ...values, ...next })
        setStatus(hasAny ? 'loaded' : 'empty')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
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

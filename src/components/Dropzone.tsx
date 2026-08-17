import { useRef, useState } from 'react'
import clsx from 'clsx'
import { fmt, t } from '@/i18n'
import { formatBytes } from '@/lib/files'
import { Icon } from './Icon'

type Props = {
  accept: string
  acceptLabel: string
  multiple: boolean
  files: File[]
  onChange: (files: File[]) => void
  /** Permite reordenar la lista (solo tiene sentido si el orden importa). */
  sortable?: boolean
}

export function Dropzone({ accept, acceptLabel, multiple, files, onChange, sortable }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function add(incoming: FileList | null) {
    if (!incoming?.length) return
    const list = [...incoming]
    onChange(multiple ? [...files, ...list] : list.slice(0, 1))
  }

  function move(index: number, delta: number) {
    const next = [...files]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          add(event.dataTransfer.files)
        }}
        className={clsx(
          'rounded-card border border-dashed p-8 text-center transition',
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            add(event.target.files)
            event.target.value = ''
          }}
        />
        <Icon name="file" className="mx-auto size-7 text-muted" />
        <p className="mt-3 text-sm text-ink-soft">
          {fmt(multiple ? t.dropzone.dragMany : t.dropzone.dragOne, { accept: acceptLabel })}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90"
        >
          {multiple ? t.dropzone.pickMany : t.dropzone.pickOne}
        </button>
        <div
          role="note"
          className="mx-auto mt-5 max-w-md text-center"
        >
          <p className="text-sm leading-relaxed text-muted">
            <strong className="font-semibold text-ink">{t.dropzone.hintTitle}</strong>
            <span className="mt-0.5 block">{t.dropzone.hint}</span>
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-subtle text-muted">
                <Icon name="file" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{file.name}</span>
                <span className="block text-xs text-muted">{formatBytes(file.size)}</span>
              </span>

              {sortable && files.length > 1 && (
                <span className="flex gap-1">
                  <IconButton label={t.dropzone.up} icon="up" onClick={() => move(index, -1)} />
                  <IconButton label={t.dropzone.down} icon="down" onClick={() => move(index, 1)} />
                </span>
              )}
              <IconButton
                label={fmt(t.dropzone.remove, { name: file.name })}
                icon="trash"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: 'up' | 'down' | 'trash'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-subtle hover:text-ink"
    >
      <Icon name={icon} className="size-4" />
    </button>
  )
}

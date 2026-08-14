import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { fmt, t } from '@/i18n'
import type { BookmarkEntry, ToolPreviewProps } from '@/tools/types'

function newEntry(id: number): BookmarkEntry {
  return { id: `bookmark-${id}`, title: '', page: 1, level: 0 }
}

function readEntries(value: unknown): BookmarkEntry[] {
  if (!Array.isArray(value)) return [newEntry(1)]
  const entries = value.filter(
    (entry): entry is BookmarkEntry =>
      typeof entry === 'object' && entry !== null &&
      typeof entry.id === 'string' && typeof entry.title === 'string' &&
      typeof entry.page === 'number' && typeof entry.level === 'number',
  )
  return entries.length > 0 ? entries : [newEntry(1)]
}

export function BookmarksPreview({ values, onChange, disabled }: ToolPreviewProps) {
  const [entries, setEntries] = useState(() => readEntries(values.entries))
  const text = t.tools.bookmarks.preview

  useEffect(() => {
    if (Array.isArray(values.entries)) {
      setEntries(readEntries(values.entries))
      return
    }
    const initial = [newEntry(1)]
    setEntries(initial)
    onChange({ ...values, entries: initial })
    // La inicialización solo depende de los valores del paso, no de la identidad del callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.entries])

  function update(next: BookmarkEntry[]) {
    setEntries(next)
    onChange({ ...values, entries: next })
  }

  function setEntry(id: string, change: Partial<BookmarkEntry>) {
    update(entries.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)))
  }

  function addEntry() {
    update([...entries, newEntry(entries.length + 1)])
  }

  function removeEntry(id: string) {
    if (entries.length === 1) return
    update(entries.filter((entry) => entry.id !== id))
  }

  return (
    <section className="space-y-4 rounded-card border border-line bg-surface px-4 py-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon name="bookmark" className="size-4 text-accent" />
          {text.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{text.hint}</p>
      </div>

      <div className="space-y-2" aria-label={text.title}>
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="rounded-lg border border-line bg-subtle p-3"
            style={{ marginLeft: `${Math.min(Math.max(0, entry.level), 5) * 1.25}rem` }}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_5rem_auto] sm:items-end">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-muted">{text.entryTitle}</span>
                <input
                  className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent"
                  value={entry.title}
                  disabled={disabled}
                  placeholder={text.entryTitlePlaceholder}
                  onChange={(event) => setEntry(entry.id, { title: event.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-muted">{text.page}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-accent"
                  value={entry.page}
                  disabled={disabled}
                  onChange={(event) => setEntry(entry.id, { page: Number(event.target.value) })}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-muted">{text.level}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-accent"
                  value={entry.level + 1}
                  disabled={disabled}
                  onChange={(event) => setEntry(entry.id, { level: Math.max(0, Number(event.target.value) - 1) })}
                />
              </label>
              <button
                type="button"
                aria-label={fmt(text.remove, { n: index + 1 })}
                title={fmt(text.remove, { n: index + 1 })}
                onClick={() => removeEntry(entry.id)}
                disabled={disabled || entries.length === 1}
                className="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink disabled:opacity-30"
              >
                <Icon name="trash" className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addEntry}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-ink-soft transition hover:border-accent hover:text-ink disabled:opacity-40"
      >
        <Icon name="plus" className="size-4" />
        {text.add}
      </button>
    </section>
  )
}

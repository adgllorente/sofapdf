import { useEffect, useState } from 'react'
import { fmt, t } from '@/i18n'
import { Icon } from './Icon'

type Props = {
  files: File[]
  onUnlock: (passwords: { file: File; password: string }[]) => Promise<void>
  onCancel: () => void
}

export function UnlockModal({ files, onUnlock, onCancel }: Props) {
  const [passwords, setPasswords] = useState<string[]>(() => files.map(() => ''))
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    setPasswords(files.map(() => ''))
    setError('')
  }, [files])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !working) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, working])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await onUnlock(files.map((file, index) => ({ file, password: passwords[index] ?? '' })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.errors.wrongPassword)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={() => {
        if (!working) onCancel()
      }}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon name="unlock" className="size-5" />
          </span>
          <div>
            <h2 id="unlock-title" className="text-lg font-semibold tracking-tight text-ink">
              {t.unlockPrompt.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.unlockPrompt.body}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {files.map((file, index) => (
            <label key={`${file.name}-${index}`} className="block">
              <span className="mb-1.5 block truncate text-sm font-medium text-ink">
                {fmt(t.unlockPrompt.password, { name: file.name })}
              </span>
              <input
                type="password"
                value={passwords[index] ?? ''}
                onChange={(event) => {
                  const next = [...passwords]
                  next[index] = event.target.value
                  setPasswords(next)
                }}
                autoComplete="off"
                disabled={working}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </label>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
          >
            {t.unlockPrompt.cancel}
          </button>
          <button
            type="submit"
            disabled={working}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover disabled:opacity-40"
          >
            {working ? t.unlockPrompt.processing : t.unlockPrompt.submit}
          </button>
        </div>
      </form>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Dropzone } from '@/components/Dropzone'
import { Icon } from '@/components/Icon'
import { OptionsForm } from '@/components/OptionsForm'
import { PreviewModal } from '@/components/PreviewModal'
import { fmt, t } from '@/i18n'
import { toolText } from '@/i18n/tools'
import { formatBytes, saveAllAsZip, saveBlob } from '@/lib/files'
import {
  bumpToolUsage,
  dismissSupportPrompt,
  registerSuccessfulRun,
  shouldShowSupportPrompt,
} from '@/lib/usage'
import { APP } from '@/config'
import { getTool } from '@/tools/registry'
import { defaultValues, type OptionValues, type OutputFile, type Tool } from '@/tools/types'
import { NotFound } from './NotFound'

type Status = 'idle' | 'running' | 'done' | 'error'

export function ToolPage() {
  const { slug } = useParams()
  const tool = getTool(slug)

  if (!tool || tool.status !== 'ready' || !tool.load) return <NotFound />
  // key fuerza un estado limpio al cambiar de herramienta.
  return <ToolRunner key={tool.slug} tool={tool} />
}

function ToolRunner({ tool }: { tool: Tool }) {
  const text = toolText(tool)
  const [files, setFiles] = useState<File[]>([])
  const [values, setValues] = useState<OptionValues>(() => defaultValues(tool))
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ ratio: 0, label: '' })
  const [outputs, setOutputs] = useState<OutputFile[]>([])
  const [error, setError] = useState('')
  const [previewing, setPreviewing] = useState<OutputFile | null>(null)
  const [showSupportPrompt, setShowSupportPrompt] = useState(shouldShowSupportPrompt)

  const running = status === 'running'
  const ready = files.length >= tool.minFiles
  const totalOut = useMemo(
    () => outputs.reduce((sum, output) => sum + output.blob.size, 0),
    [outputs],
  )

  async function execute() {
    setStatus('running')
    setError('')
    setOutputs([])
    setProgress({ ratio: 0, label: '' })

    try {
      const run = await tool.load!()
      const result = await run(files, values, {
        onProgress: (ratio, label = '') => setProgress({ ratio, label }),
      })
      setOutputs(result)
      setStatus('done')
      bumpToolUsage(tool.slug)
      setShowSupportPrompt(registerSuccessfulRun())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.run.failed)
      setStatus('error')
    }
  }

  function reset() {
    setFiles([])
    setOutputs([])
    setStatus('idle')
    setError('')
    setValues(defaultValues(tool))
  }

  function dismissSupport() {
    dismissSupportPrompt()
    setShowSupportPrompt(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-4" />
        {t.run.back}
      </Link>

      <header className="mt-6 flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent">
          <Icon name={tool.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{text.name}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text.description}</p>
        </div>
      </header>

      <Link
        to="/privacy"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent-soft/70"
      >
        <Icon name="cpu" className="size-3.5" strokeWidth={1.8} />
        {t.header.badge}
      </Link>

      {text.note && (
        <p className="mt-5 flex gap-2.5 rounded-card border border-line bg-subtle px-4 py-3 text-sm text-ink-soft">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-muted" />
          {text.note}
        </p>
      )}

      <div className="mt-8 space-y-6">
        {showSupportPrompt && (
          <aside className="rounded-card border border-accent-line bg-accent-soft p-5">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              {t.run.support.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.run.support.body}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={APP.kofiUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismissSupport}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover"
              >
                {t.run.support.donate}
              </a>
              <button
                type="button"
                onClick={dismissSupport}
                className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink"
              >
                {t.run.support.later}
              </button>
            </div>
          </aside>
        )}

        <Dropzone
          accept={tool.accept}
          acceptLabel={t.accept[tool.acceptKey]}
          multiple={tool.multiple}
          files={files}
          onChange={setFiles}
          sortable={tool.multiple}
        />

        {tool.options && files.length > 0 && (
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-tight text-ink">
              {t.options.title}
            </h2>
            <OptionsForm tool={tool} values={values} onChange={setValues} disabled={running} />
          </section>
        )}

        {tool.Preview && files.length > 0 && (
          <tool.Preview files={files} values={values} onChange={setValues} disabled={running} />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={execute}
            disabled={!ready || running}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? t.run.processing : text.action}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={reset}
              disabled={running}
              className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              {t.run.reset}
            </button>
          )}
          {!ready && (
            <span className="text-sm text-muted">
              {tool.minFiles > 1 ? fmt(t.run.needMany, { n: tool.minFiles }) : t.run.needOne}
            </span>
          )}
        </div>

        {running && (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${Math.max(4, Math.round(progress.ratio * 100))}%` }}
              />
            </div>
            <p className="text-xs text-muted">{progress.label || t.run.working}</p>
          </div>
        )}

        {status === 'error' && (
          <p className="flex gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-sm text-danger">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {status === 'done' && outputs.length > 0 && (
          <section className="rounded-card border border-accent-line bg-surface">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="check" className="size-4 text-accent" strokeWidth={2} />
                {outputs.length === 1
                  ? t.run.doneOne
                  : fmt(t.run.doneMany, { n: outputs.length })}{' '}
                <span className="font-normal text-muted">({formatBytes(totalOut)})</span>
              </span>
              {outputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => saveAllAsZip(outputs, `${tool.slug}.zip`)}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90"
                >
                  {t.run.zip}
                </button>
              )}
            </header>

            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {outputs.map((output) => (
                <li key={output.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{output.name}</span>
                    <span className="block text-xs text-muted">{formatBytes(output.blob.size)}</span>
                  </span>
                  {output.blob.type === 'application/pdf' && (
                    <button
                      type="button"
                      onClick={() => setPreviewing(output)}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition hover:border-line-strong"
                    >
                      <Icon name="eye" className="size-4" />
                      {t.run.preview}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => saveBlob(output.blob, output.name)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition hover:border-line-strong"
                  >
                    <Icon name="download" className="size-4" />
                    {t.run.download}
                  </button>
                </li>
              ))}
            </ul>

            {outputs
              .filter((output) => output.blob.type.startsWith('text/plain'))
              .map((output) => (
                <TextOutputPreview key={output.name} output={output} />
              ))}

            <p className="border-t border-line px-5 py-3 text-xs text-muted">{t.run.ephemeral}</p>
          </section>
        )}

      </div>

      {previewing && (
        <PreviewModal
          blob={previewing.blob}
          name={previewing.name}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  )
}

function TextOutputPreview({ output }: { output: OutputFile }) {
  const [content, setContent] = useState('')

  useEffect(() => {
    let active = true
    void output.blob.text().then((value) => {
      if (active) setContent(value)
    })
    return () => {
      active = false
    }
  }, [output])

  return (
    <section className="border-t border-line px-5 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon name="eye" className="size-4 text-accent" />
        {t.run.textPreview}
      </h3>
      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-subtle p-4 font-mono text-xs leading-relaxed text-ink-soft">
        {content}
      </pre>
    </section>
  )
}

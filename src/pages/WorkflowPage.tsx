import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dropzone } from '@/components/Dropzone'
import { Icon } from '@/components/Icon'
import { OptionsForm } from '@/components/OptionsForm'
import { PreviewModal } from '@/components/PreviewModal'
import { fmt, t } from '@/i18n'
import { formatBytes, saveBlob } from '@/lib/files'
import { bumpToolUsage } from '@/lib/usage'
import { loadMetadataFromFile } from '@/tools/metadata-loader'
import { getTool, TOOLS } from '@/tools/registry'
import { defaultValues, type OptionValues, type OutputFile, type Tool } from '@/tools/types'

type Status = 'idle' | 'running' | 'done' | 'error'
type Step = { id: number; tool: Tool; values: OptionValues }

const WORKFLOW_TOOLS = TOOLS.filter((tool) => tool.workflow && tool.load)

export function WorkflowPage() {
  return <WorkflowRunner />
}

function WorkflowRunner() {
  const [files, setFiles] = useState<File[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ ratio: 0, label: '' })
  const [output, setOutput] = useState<OutputFile | null>(null)
  const [error, setError] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [nextId, setNextId] = useState(1)

  const running = status === 'running'
  const ready = files.length === 1 && steps.length > 0
  const totalOut = useMemo(() => output?.blob.size ?? 0, [output])

  // Algunas herramientas saben inicializar sus valores a partir del PDF de
  // entrada (metadata lee la info dict actual). En el resto, caemos al
  // defaultValues del registro.
  async function initialValues(tool: Tool, input: File | undefined): Promise<OptionValues> {
    if (tool.slug === 'metadata' && input) {
      try {
        return await loadMetadataFromFile(input)
      } catch {
        // Si falla la lectura, dejamos los campos vacíos: el usuario puede
        // escribirlos a mano sin que la herramienta entera quede inutilizada.
        return defaultValues(tool)
      }
    }
    return defaultValues(tool)
  }

  function applyInitialValues(id: number, tool: Tool, input: File | undefined) {
    void initialValues(tool, input).then((values) => {
      setSteps((current) =>
        current.map((step) => (step.id === id ? { ...step, values } : step)),
      )
    })
  }

  function addStep(slug: string) {
    const tool = getTool(slug)
    if (!tool || !tool.workflow) return
    const id = nextId
    setNextId((current) => current + 1)
    // Insertamos primero con valores por defecto para que el paso aparezca
    // visible al instante; si la herramienta sabe leer del PDF de entrada,
    // sobreescribimos en cuanto tengamos la respuesta.
    setSteps((current) => [...current, { id, tool, values: defaultValues(tool) }])
    applyInitialValues(id, tool, files[0])
  }

  function changeStepTool(id: number, slug: string) {
    const next = getTool(slug)
    if (!next) return
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, tool: next, values: defaultValues(next) } : step)),
    )
    applyInitialValues(id, next, files[0])
  }

  function updateStep(id: number, values: OptionValues) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, values } : step)))
  }

  function removeStep(id: number) {
    setSteps((current) => current.filter((step) => step.id !== id))
  }

  function moveStep(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    setSteps((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function execute() {
    if (!ready) return
    const protectedIndex = steps.findIndex((step) => step.tool.slug === 'protect')
    const unlockIndex = steps.findIndex((step) => step.tool.slug === 'unlock')
    if (protectedIndex >= 0 && protectedIndex !== steps.length - 1) {
      setError(t.workflow.protectLast)
      setStatus('error')
      return
    }
    if (unlockIndex > 0) {
      setError(t.workflow.unlockFirst)
      setStatus('error')
      return
    }
    setStatus('running')
    setError('')
    setOutput(null)
    setProgress({ ratio: 0, label: '' })

    try {
      let current = files[0]
      for (const [index, step] of steps.entries()) {
        const run = await step.tool.load!()
        const result = await run([current], step.values, {
          onProgress: (ratio, label = '') =>
            setProgress({
              ratio: (index + Math.max(0, Math.min(1, ratio))) / steps.length,
              label: fmt(t.workflow.running, { current: index + 1, total: steps.length }) +
                (label ? ` · ${label}` : ''),
            }),
        })
        if (result.length !== 1 || result[0].blob.type !== 'application/pdf') {
          throw new Error(t.workflow.invalidOutput)
        }
        current = new File([result[0].blob], result[0].name, { type: 'application/pdf' })
      }
      for (const step of steps) bumpToolUsage(step.tool.slug)
      setProgress({ ratio: 1, label: t.progress.done })
      setOutput({ name: current.name, blob: current })
      setStatus('done')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.run.failed)
      setStatus('error')
    }
  }

  function reset() {
    setFiles([])
    setSteps([])
    setOutput(null)
    setStatus('idle')
    setError('')
    setProgress({ ratio: 0, label: '' })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
        <Icon name="arrowLeft" className="size-4" />
        {t.run.back}
      </Link>

      <section className="relative mt-6 overflow-hidden rounded-card border border-accent-line bg-accent-soft px-6 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-surface/70 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
              <Icon name="workflow" className="size-3.5" strokeWidth={2} />
              {t.workflow.badge}
            </span>
            <h1 className="mt-4 max-w-xl text-3xl leading-tight font-semibold tracking-tight text-ink text-balance sm:text-4xl">
              {t.workflow.title}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {t.workflow.description}
            </p>
          </div>

          <div aria-hidden="true" className="hidden items-center gap-2 sm:flex">
            <span className="grid size-14 place-items-center rounded-2xl border border-accent-line bg-surface text-accent shadow-sm">
              <Icon name="file" className="size-6" />
            </span>
            <Icon name="arrowLeft" className="size-5 rotate-180 text-accent/70" />
            <span className="grid size-16 place-items-center rounded-2xl bg-accent text-on-accent shadow-lg shadow-accent/20">
              <Icon name="workflow" className="size-8" strokeWidth={1.5} />
            </span>
            <Icon name="arrowLeft" className="size-5 rotate-180 text-accent/70" />
            <span className="grid size-14 place-items-center rounded-2xl border border-accent-line bg-surface text-accent shadow-sm">
              <Icon name="check" className="size-6" strokeWidth={2} />
            </span>
          </div>
        </div>
      </section>

      <aside className="mt-5 rounded-card border border-line bg-subtle px-4 py-3 text-sm text-ink-soft">
        <p className="font-semibold text-ink">{t.workflow.limitationTitle}</p>
        <p className="mt-1 text-muted">{t.workflow.limitationBody}</p>
      </aside>

      <div className="mt-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{t.workflow.inputTitle}</h2>
          <Dropzone
            accept="application/pdf,.pdf"
            acceptLabel={t.accept.pdf}
            multiple={false}
            files={files}
            onChange={setFiles}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{t.workflow.stepsTitle}</h2>
          {steps.length === 0 && <p className="rounded-card border border-dashed border-line-strong px-4 py-5 text-sm text-muted">{t.workflow.noSteps}</p>}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const slug = step.tool.slug
              return (
                <article key={step.id} className="rounded-card border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{index + 1}</span>
                    <select
                      aria-label={t.workflow.chooseStep}
                      value={slug}
                      disabled={running}
                      onChange={(event) => changeStepTool(step.id, event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                    >
                      {WORKFLOW_TOOLS.map((option) => <option key={option.slug} value={option.slug}>{t.tools[option.slug].name}</option>)}
                    </select>
                    <button type="button" onClick={() => moveStep(index, -1)} disabled={running || index === 0} aria-label={t.workflow.moveUp} className="rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink disabled:opacity-30"><Icon name="up" className="size-4" /></button>
                    <button type="button" onClick={() => moveStep(index, 1)} disabled={running || index === steps.length - 1} aria-label={t.workflow.moveDown} className="rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink disabled:opacity-30"><Icon name="down" className="size-4" /></button>
                    <button type="button" onClick={() => removeStep(step.id)} disabled={running} aria-label={t.workflow.remove} className="rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink disabled:opacity-30"><Icon name="trash" className="size-4" /></button>
                  </div>
                  {step.tool.options && <div className="mt-4 border-t border-line pt-4"><OptionsForm tool={step.tool} values={step.values} onChange={(values) => updateStep(step.id, values)} disabled={running} /></div>}
                </article>
              )
            })}
          </div>
          <select value="" disabled={running} onChange={(event) => { addStep(event.target.value); event.target.value = '' }} className="w-full rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2.5 text-sm text-ink">
            <option value="" disabled>{t.workflow.addStep}</option>
            {WORKFLOW_TOOLS.map((tool) => <option key={tool.slug} value={tool.slug}>{t.tools[tool.slug].name}</option>)}
          </select>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={execute} disabled={!ready || running} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">{running ? t.run.processing : t.workflow.run}</button>
          {(files.length > 0 || steps.length > 0) && <button type="button" onClick={reset} disabled={running} className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40">{t.workflow.reset}</button>}
          {!ready && <span className="text-sm text-muted">{steps.length === 0 ? t.workflow.empty : t.run.needOne}</span>}
        </div>

        {running && <div className="space-y-2"><div className="h-1.5 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(progress.ratio * 100))}%` }} /></div><p className="text-xs text-muted">{progress.label || t.run.working}</p></div>}
        {status === 'error' && <p className="flex gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-sm text-danger"><Icon name="alert" className="mt-0.5 size-4 shrink-0" />{error}</p>}
        {status === 'done' && output && <section className="rounded-card border border-accent-line bg-surface"><header className="flex items-center gap-2 border-b border-line px-5 py-4 text-sm font-semibold text-ink"><Icon name="check" className="size-4 text-accent" strokeWidth={2} />{t.workflow.done}</header><div className="flex items-center gap-3 px-5 py-4"><span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{output.name}</span><span className="block text-xs text-muted">{formatBytes(totalOut)}</span></span><button type="button" onClick={() => setPreviewing(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition hover:border-line-strong"><Icon name="eye" className="size-4" />{t.run.preview}</button><button type="button" onClick={() => saveBlob(output.blob, output.name)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition hover:border-line-strong"><Icon name="download" className="size-4" />{t.run.download}</button></div><p className="border-t border-line px-5 py-3 text-xs text-muted">{t.run.ephemeral}</p></section>}
      </div>

      {previewing && output && <PreviewModal blob={output.blob} name={output.name} onClose={() => setPreviewing(false)} />}
    </div>
  )
}

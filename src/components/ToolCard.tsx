import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { t } from '@/i18n'
import { toolText } from '@/i18n/tools'
import { Icon } from './Icon'
import type { Tool } from '@/tools/types'

export function ToolCard({ tool }: { tool: Tool }) {
  const planned = tool.status === 'planned'
  const text = toolText(tool)

  const content = (
    <>
      <span
        className={clsx(
          'grid size-10 place-items-center rounded-lg border transition',
          planned
            ? 'border-line bg-subtle text-muted'
            : 'border-accent-line bg-accent-soft text-accent group-hover:border-accent',
        )}
      >
        <Icon name={tool.icon} className="size-5" />
      </span>

      <span className="mt-4 flex items-center gap-2">
        <span className="text-[15px] font-semibold tracking-tight text-ink">{text.name}</span>
        {planned && (
          <span className="rounded-full border border-line bg-subtle px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">
            {t.card.soon}
          </span>
        )}
      </span>

      <span className="mt-1.5 block text-sm leading-relaxed text-muted">{text.short}</span>
    </>
  )

  const base =
    'group flex flex-col rounded-card border p-5 text-left transition bg-surface border-line'

  return planned ? (
    <div className={clsx(base, 'opacity-65')}>{content}</div>
  ) : (
    <Link to={`/tools/${tool.slug}`} className={clsx(base, 'hover:border-line-strong hover:shadow-sm')}>
      {content}
    </Link>
  )
}

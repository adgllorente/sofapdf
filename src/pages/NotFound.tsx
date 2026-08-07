import { Link } from 'react-router-dom'
import { t } from '@/i18n'

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-accent uppercase">{t.notFound.kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{t.notFound.title}</h1>
      <p className="mt-3 text-muted">{t.notFound.body}</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:opacity-90"
      >
        {t.notFound.cta}
      </Link>
    </div>
  )
}

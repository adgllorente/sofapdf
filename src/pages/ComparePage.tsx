import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { APP } from '@/config'
import { applyDocumentSeo, fmt, t } from '@/i18n'
import { useLocale } from '@/i18n/react'

type CompetitorSlug = keyof typeof t.compare.competitors

const COMPETITORS: CompetitorSlug[] = ['ilovepdf', 'smallpdf', 'adobe-acrobat']
const CRITERIA: (keyof typeof t.compare.criteria)[] = ['local', 'upload', 'free', 'install', 'privacy']

export function ComparePage() {
  const locale = useLocale()
  const { competitor } = useParams<{ competitor?: string }>()
  const selected = isCompetitor(competitor) ? competitor : undefined
  const page = selected ? t.compare.competitors[selected] : undefined
  const title = page ? fmt(t.compare.pageTitle, { app: APP.name, competitor: page.name }) : t.compare.title
  const description = page ? fmt(page.description, { app: APP.name }) : fmt(t.compare.description, { app: APP.name })
  const path = selected ? `/compare/sofapdf-vs-${selected}/` : '/compare/'

  useEffect(() => {
    applyDocumentSeo({
      title,
      description,
      path,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: `https://${APP.domain}${path}`,
        inLanguage: t.meta.lang,
      },
    })
  }, [description, locale, path, title])

  if (competitor && !selected) return <CompareNotFound />

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
        <Icon name="arrowLeft" className="size-4" />
        {t.run.back}
      </Link>
      <header className="mt-7 max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">{t.compare.badge}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">{page ? title : t.compare.heading}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{page ? page.intro : t.compare.intro}</p>
      </header>

      <section className="mt-10 rounded-card border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.compare.tableTitle}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-line text-ink">
              <th scope="col" className="w-1/4 px-3 py-3 font-medium">{t.compare.criteriaLabel}</th>
              <th scope="col" className="bg-accent-soft px-3 py-3 font-semibold text-accent">{APP.name}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t.compare.competitors.ilovepdf.name}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t.compare.competitors.smallpdf.name}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t.compare.competitors['adobe-acrobat'].name}</th>
            </tr></thead>
            <tbody>{CRITERIA.map((criterion) => <tr key={criterion} className="border-b border-line last:border-0">
              <th scope="row" className="px-3 py-4 font-medium text-ink-soft">{t.compare.criteria[criterion]}</th>
              <td className="bg-accent-soft px-3 py-4 font-medium text-ink">{t.compare.values.sofapdf[criterion]}</td>
              <td className="px-3 py-4 text-muted">{t.compare.values.ilovepdf[criterion]}</td>
              <td className="px-3 py-4 text-muted">{t.compare.values.smallpdf[criterion]}</td>
              <td className="px-3 py-4 text-muted">{t.compare.values['adobe-acrobat'][criterion]}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 rounded-card border border-accent-line bg-accent-soft p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.compare.localTitle}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{t.compare.localBody}</p>
        <Link to="/privacy" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent underline decoration-accent-line underline-offset-4">
          {t.compare.localLink}<Icon name="arrowLeft" className="size-4 rotate-180" />
        </Link>
      </section>

    </div>
  )
}

function isCompetitor(value: string | undefined): value is CompetitorSlug {
  return value !== undefined && COMPETITORS.includes(value as CompetitorSlug)
}

function CompareNotFound() {
  return <div className="mx-auto max-w-3xl px-5 py-24 text-center">
    <p className="text-sm font-medium tracking-wide text-accent uppercase">{t.notFound.kicker}</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{t.compare.notFound}</h1>
    <Link to="/compare/" className="mt-8 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:opacity-90">{t.compare.viewAll}</Link>
  </div>
}

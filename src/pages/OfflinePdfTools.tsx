import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { ToolCard } from '@/components/ToolCard'
import { APP } from '@/config'
import { applyDocumentSeo, t } from '@/i18n'
import { useLocale } from '@/i18n/react'
import { sortTools, TOOLS } from '@/tools/registry'

export function OfflinePdfTools() {
  const locale = useLocale()
  const tools = sortTools(TOOLS, (tool) => t.tools[tool.slug].name)

  useEffect(() => {
    applyDocumentSeo({
      title: t.offlinePage.title,
      description: t.offlinePage.description,
      path: '/tools/offline-pdf-tools/',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: t.offlinePage.title,
        description: t.offlinePage.description,
        url: `https://${APP.domain}/tools/offline-pdf-tools/`,
        inLanguage: t.meta.lang,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: t.tools[tool.slug].name,
            url: `https://${APP.domain}/tools/${tool.slug}`,
          })),
        },
      },
    })
  }, [locale, tools])

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      <header className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
          <Icon name="wifiOff" className="size-3.5" />
          {t.offlinePage.badge}
        </div>
        <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-6xl">
          {t.offlinePage.heading}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{t.offlinePage.intro}</p>
      </header>

      <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label={t.offlinePage.benefitsTitle}>
        {t.offlinePage.benefits.map((benefit) => (
          <div key={benefit.title} className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-ink">{benefit.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{benefit.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-14 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t.offlinePage.toolsTitle}</h2>
          <p className="mt-2 text-muted">{t.offlinePage.toolsBody}</p>
        </div>
        <Link to="/" className="hidden shrink-0 items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover sm:flex">
          <Icon name="arrowLeft" className="size-4" />
          {t.offlinePage.back}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
      </div>
    </div>
  )
}

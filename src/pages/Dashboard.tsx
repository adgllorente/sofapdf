import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { KofiBadge } from '@/components/KofiBadge'
import { ToolCard } from '@/components/ToolCard'
import { t } from '@/i18n'
import { CATEGORY_IDS, TOOLS } from '@/tools/registry'

type PointKey = keyof typeof t.privacyPoints

const POINTS: { key: PointKey; icon: IconName }[] = [
  { key: 'noUpload', icon: 'cpu' },
  { key: 'offline', icon: 'wifiOff' },
  { key: 'noTracking', icon: 'shield' },
]

export function Dashboard() {
  return (
    <>
      <Hero />
      <PrivacyStrip />

      <div className="mx-auto max-w-6xl space-y-14 px-5 pt-20 pb-20">
        {CATEGORY_IDS.map((id) => {
          const tools = TOOLS.filter((tool) => tool.category === id)
          if (!tools.length) return null
          const category = t.categories[id]

          return (
            <section key={id} id={id} className="scroll-mt-24">
              <div className="flex items-baseline gap-3 border-b border-line pb-3">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{category.name}</h2>
                <p className="text-sm text-muted">{category.blurb}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

function Hero() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
          <Icon name="shield" className="size-3.5" strokeWidth={1.8} />
          {t.hero.badge}
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-6xl">
          {t.brand.tagline}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{t.brand.claim}</p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#organizar"
            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:opacity-90"
          >
            {t.hero.tools}
          </a>
          <Link
            to="/privacidad"
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:border-line-strong"
          >
            {t.hero.verify}
          </Link>
          <KofiBadge height="h-11" />
        </div>
      </div>
    </section>
  )
}

function PrivacyStrip() {
  return (
    <section className="border-b border-line bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
        {POINTS.map((point) => (
          <div key={point.key}>
            <span className="flex items-center gap-2.5 text-ink">
              <Icon name={point.icon} className="size-[18px] text-accent" />
              <span className="text-[15px] font-semibold tracking-tight">
                {t.privacyPoints[point.key].title}
              </span>
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t.privacyPoints[point.key].body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

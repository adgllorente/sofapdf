import { Icon, type IconName } from '@/components/Icon'
import { KofiBadge } from '@/components/KofiBadge'
import { SofaMascot } from '@/components/SofaMascot'
import { ToolCard } from '@/components/ToolCard'
import { t } from '@/i18n'
import { renderInline } from '@/i18n/inline'
import { CATEGORY_IDS, TOOLS } from '@/tools/registry'

type PointKey = keyof typeof t.privacyPoints

const POINTS: { key: PointKey; icon: IconName }[] = [
  { key: 'noUpload', icon: 'cpu' },
  { key: 'offline', icon: 'wifiOff' },
  { key: 'noTracking', icon: 'shield' },
  { key: 'private', icon: 'lock' },
]

export function Dashboard() {
  return (
    <>
      <Hero />

      <div className="mx-auto max-w-6xl space-y-14 px-5 pt-2 pb-20 sm:pt-4">
        {CATEGORY_IDS.map((id) => {
          // Las disponibles primero: dentro de cada sección, las `ready` se
          // muestran antes que las `planned`, manteniendo el orden del registro.
          const tools = TOOLS.filter((tool) => tool.category === id).sort((a, b) => {
            if (a.status === b.status) return 0
            return a.status === 'ready' ? -1 : 1
          })
          if (!tools.length) return null
          const category = t.categories[id]

          return (
            <section key={id} id={id} className="scroll-mt-24">
              <div className="flex items-baseline gap-3 border-b border-line pb-3">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{category.name}</h2>
                <p className="text-sm text-muted">{category.blurb}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
    <section>
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:pt-24 sm:pb-12">
        <div className="grid items-center gap-10 sm:grid-cols-[1.3fr_1fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
              <Icon name="shield" className="size-3.5" strokeWidth={1.8} />
              {t.hero.badge}
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-6xl">
              {t.brand.tagline}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {renderInline(t.brand.claim)}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#paginas"
                className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:opacity-90"
              >
                {t.hero.tools}
              </a>
              <KofiBadge height="h-11" />
            </div>
          </div>

          <div className="flex justify-center sm:justify-end">
            <SofaMascot className="w-full max-w-sm sm:max-w-md" />
          </div>
        </div>

        {/* Los compromisos, en una sola línea: iconos + etiqueta corta. */}
        <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted sm:mt-12">
          {POINTS.map((point) => (
            <li key={point.key} className="flex items-center gap-2">
              <Icon name={point.icon} className="size-4 text-accent" strokeWidth={1.8} />
              <span>{t.privacyPoints[point.key].title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

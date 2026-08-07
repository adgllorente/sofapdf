import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'
import { APP } from '@/config'
import { fmt, t } from '@/i18n'

const STEPS: { key: keyof typeof t.privacy.steps; icon: IconName }[] = [
  { key: 'pick', icon: 'file' },
  { key: 'process', icon: 'cpu' },
  { key: 'download', icon: 'download' },
]

const CHECKS: (keyof typeof t.privacy.checks)[] = ['offline', 'devtools', 'source']

const LIMITS: (keyof typeof t.privacy.limits)[] = ['ip', 'theme', 'power']

export function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-4" />
        {t.run.back}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {t.privacy.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {fmt(t.privacy.intro, { app: APP.name })}
      </p>

      <section className="mt-12 space-y-6">
        {STEPS.map((step) => {
          const text = t.privacy.steps[step.key]

          return (
            <article
              key={step.key}
              className="flex gap-4 rounded-card border border-line bg-surface p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent">
                <Icon name={step.icon} className="size-5" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">{text.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text.body}</p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.privacy.verifyTitle}</h2>
        <p className="mt-2 text-muted">{t.privacy.verifyBody}</p>
        <ul className="mt-6 space-y-4">
          {CHECKS.map((key) => (
            <li key={key} className="flex gap-3">
              <Icon
                name="check"
                className="mt-0.5 size-[18px] shrink-0 text-accent"
                strokeWidth={2}
              />
              <div>
                <h3 className="text-[15px] font-medium text-ink">{t.privacy.checks[key].title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t.privacy.checks[key].body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-card border border-line bg-subtle p-6">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.privacy.limitsTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.privacy.limitsIntro}</p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          {LIMITS.map((key) => (
            <li key={key}>
              <strong className="font-medium text-ink-soft">{t.privacy.limits[key].strong}</strong>{' '}
              {t.privacy.limits[key].body}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

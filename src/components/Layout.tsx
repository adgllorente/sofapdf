import { Link, Outlet, useLocation } from 'react-router-dom'
import { APP } from '@/config'
import { fmt, t } from '@/i18n'
import { Icon } from './Icon'
import { KofiBadge } from './KofiBadge'
import { LocaleToggle } from './LocaleToggle'
import { Wordmark } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas font-sans text-ink">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  // En la portada el badge ya está en el hero; repetirlo aquí sería insistir.
  const onHome = useLocation().pathname === '/'

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="rounded-md" aria-label={fmt(t.header.home, { app: APP.name })}>
          <Wordmark />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent sm:flex">
            <Icon name="cpu" className="size-3.5" strokeWidth={1.8} />
            {t.header.badge}
          </span>
          <Link
            to="/privacidad"
            className="hidden rounded-md px-2 py-1 text-sm whitespace-nowrap text-muted transition hover:text-ink sm:block"
          >
            {t.header.howItWorks}
          </Link>
          <LocaleToggle />
          <ThemeToggle />
          {!onHome && <KofiBadge height="h-9" className="hidden md:block" />}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{fmt(t.footer.line, { year: APP.year, name: APP.legalName })}</p>
        <Link to="/privacidad" className="text-muted transition hover:text-ink">
          {t.footer.link}
        </Link>
      </div>
    </footer>
  )
}

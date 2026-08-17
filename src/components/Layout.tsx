import { Link, Outlet } from 'react-router-dom'
import { APP } from '@/config'
import { fmt, t } from '@/i18n'
import kofiBadgeSmall from '@/assets/kofi-badge-small.webp'
import { KofiBadge } from './KofiBadge'
import { Icon } from './Icon'
import { Wordmark } from './Logo'
import { ToolsMenu } from './ToolsMenu'

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
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="rounded-md" aria-label={fmt(t.header.home, { app: APP.name })}>
          <Wordmark />
        </Link>

        <div className="flex items-center gap-3">
          <a
            href={APP.kofiUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.kofi}
            className="shrink-0 rounded-lg transition hover:opacity-85 md:hidden"
          >
            <img src={kofiBadgeSmall} alt="" className="h-9 w-auto" />
          </a>
          <KofiBadge height="h-9" className="hidden md:block" />
          <a
            href={APP.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.header.github}
            title={t.header.github}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
          >
            <Icon name="github" className="size-5" />
          </a>
          <ToolsMenu />
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/tools/offline-pdf-tools/" className="text-muted transition hover:text-ink">
            {t.offlinePage.linkTitle}
          </Link>
          <Link to="/privacy" className="text-muted transition hover:text-ink">
            {t.footer.link}
          </Link>
          <Link to="/compare/" className="text-muted transition hover:text-ink">
            {t.compare.linkTitle}
          </Link>
          <a
            href={APP.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition hover:text-ink"
          >
            {t.footer.contact}
          </a>
        </div>
      </div>
    </footer>
  )
}

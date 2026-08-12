import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LOCALES, setLocale, t, type Locale } from '@/i18n'
import { useLocale } from '@/i18n/react'
import { CATEGORY_IDS, sortTools, TOOLS } from '@/tools/registry'
import { toolText } from '@/i18n/tools'
import { Icon } from './Icon'

type Theme = 'light' | 'dark'
const THEME_KEY = 'theme'

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ToolsMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const locale = useLocale()
  const ref = useRef<HTMLDivElement>(null)

  // Persiste el tema y aplica el atributo en `<html>`. Único dato que se
  // guarda, junto al idioma: una preferencia visual.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Cierra al hacer clic fuera o pulsar Escape. Solo escucha mientras está
  // abierto: evita ruido global cuando el menú está cerrado.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function setLocaleAndClose(next: Locale) {
    setLocale(next)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft transition hover:border-line-strong hover:text-ink"
      >
        <span className="hidden sm:inline">{t.header.tools}</span>
        <Icon name="grid" className="size-4 sm:hidden" />
        <Icon
          name="down"
          className={clsx('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          // En móvil el panel pasa a `fixed` para ignorar el botón: con el
          // botón pegado al borde, cualquier posición relativa se sale por un
          // lado. `inset-x-4` deja 16 px a cada borde del viewport. En `sm+`
          // vuelve a `absolute` alineado a la derecha del botón.
          className="fixed inset-x-4 top-20 z-30 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-card border border-line bg-surface p-3 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[80vh] sm:w-[min(520px,calc(100vw-2rem))]"
        >
          {CATEGORY_IDS.map((categoryId, index) => {
            const tools = sortTools(
              TOOLS.filter((tool) => tool.category === categoryId),
              (tool) => t.tools[tool.slug].name,
            )
            const category = t.categories[categoryId]
            return (
              <div key={categoryId} className={index > 0 ? 'mt-3 border-t border-line pt-3' : ''}>
                <h3 className="px-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  {category.name}
                </h3>
                <ul className="mt-1 grid grid-cols-2 gap-0.5">
                  {tools.map((tool) => {
                    const text = toolText(tool)
                    const planned = tool.status === 'planned'
                    return (
                      <li key={tool.slug}>
                        {planned ? (
                          <div className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-muted opacity-55">
                            <Icon name={tool.icon} className="size-4" />
                            <span className="truncate text-sm">{text.name}</span>
                            <span className="ml-auto text-[10px] tracking-wide uppercase">
                              {t.card.soon}
                            </span>
                          </div>
                        ) : (
                          <Link
                            to={`/tools/${tool.slug}`}
                            onClick={() => setOpen(false)}
                            role="menuitem"
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-soft transition hover:bg-subtle hover:text-ink"
                          >
                            <Icon name={tool.icon} className="size-4 text-accent" />
                            <span className="truncate text-sm">{text.name}</span>
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          <Section title={t.locale.label}>
            {LOCALES.map((option) => (
              <Choice
                key={option}
                icon={<Icon name="languages" className="size-4" />}
                label={t.locale.names[option]}
                active={locale === option}
                onClick={() => setLocaleAndClose(option)}
              />
            ))}
          </Section>

          <Section title={t.theme.label}>
            <Choice
              icon={<Icon name="sun" className="size-4" />}
              label={t.theme.options.light}
              active={theme === 'light'}
              onClick={() => {
                setThemeState('light')
                setOpen(false)
              }}
            />
            <Choice
              icon={<Icon name="moon" className="size-4" />}
              label={t.theme.options.dark}
              active={theme === 'dark'}
              onClick={() => {
                setThemeState('dark')
                setOpen(false)
              }}
            />
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <h3 className="px-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {title}
      </h3>
      <div className="mt-1 grid grid-cols-2 gap-0.5">{children}</div>
    </div>
  )
}

function Choice({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      aria-pressed={active}
      className={clsx(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-ink-soft hover:bg-subtle hover:text-ink',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {active && <Icon name="check" className="ml-auto size-3.5" />}
    </button>
  )
}

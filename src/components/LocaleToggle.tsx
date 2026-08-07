import { fmt, setLocale, t, type Locale } from '@/i18n'
import { useLocale } from '@/i18n/react'

/**
 * Banderas como emoji: cero peticiones y cero SVG que mantener. Una bandera no
 * es un idioma, pero con dos opciones se entiende de un vistazo.
 */
const FLAGS: Record<Locale, string> = { es: '🇪🇸', en: '🇬🇧' }

export function LocaleToggle() {
  const locale = useLocale()
  const next: Locale = locale === 'es' ? 'en' : 'es'
  const label = fmt(t.locale.switchTo, { name: t.locale.names[next] })

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="grid size-9 place-items-center rounded-lg border border-line text-sm leading-none transition hover:border-line-strong"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{FLAGS[next]}</span>
    </button>
  )
}

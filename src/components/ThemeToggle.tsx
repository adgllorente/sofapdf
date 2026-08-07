import { useEffect, useState } from 'react'
import { t } from '@/i18n'
import { Icon } from './Icon'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Único dato que se persiste en el navegador, y es una preferencia visual.
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:border-line-strong hover:text-ink"
      aria-label={theme === 'dark' ? t.theme.toLight : t.theme.toDark}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-4" />
    </button>
  )
}

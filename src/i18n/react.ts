import { useSyncExternalStore } from 'react'
import { getLocale, subscribeLocale, type Locale } from '@/i18n'

/**
 * Suscribe un componente al idioma activo. Va en un módulo aparte para que
 * `@/i18n` siga sirviendo al código que no sabe nada de React (lib, tools).
 */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale)
}

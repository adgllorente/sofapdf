import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Al navegar entre rutas el scroll no debe heredarse de la pantalla anterior. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    globalThis.scrollTo({ top: 0 })
  }, [pathname, hash])

  return null
}

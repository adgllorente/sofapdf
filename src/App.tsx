import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { NotFound } from '@/pages/NotFound'
import { Privacy } from '@/pages/Privacy'
import { ToolPage } from '@/pages/ToolPage'
import { ScrollToTop } from '@/components/ScrollToTop'
import { useLocale } from '@/i18n/react'

export default function App() {
  // Un solo suscriptor en la raíz: cambiar de idioma repinta todo el árbol.
  useLocale()

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="h/:slug" element={<ToolPage />} />
          <Route path="privacidad" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

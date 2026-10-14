import { Route, Routes } from 'react-router'
import { AppHeader } from './components/AppHeader'
import { LevelGate, WELCOME_PATH } from './components/LevelGate'
import { RouteFocus } from './components/RouteFocus'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { WelcomePage } from './pages/WelcomePage'
import { WorkspacePage } from './pages/WorkspacePage'

/** Everything inside the router. Tests render this inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <>
      <RouteFocus />
      <AppHeader />
      <LevelGate>
        <Routes>
          <Route index element={<HomePage />} />
          {/* A static segment, so it wins over the :categoryId pattern below. */}
          <Route path={WELCOME_PATH} element={<WelcomePage />} />
          <Route path=":categoryId" element={<CategoryPage />} />
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </LevelGate>
    </>
  )
}

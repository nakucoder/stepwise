import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'
import { PreferencesProvider } from './preferences/PreferencesProvider'

export default function App() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PreferencesProvider>
  )
}

import { AppHeader } from './components/AppHeader'
import { HomePage } from './pages/HomePage'
import { PreferencesProvider } from './preferences/PreferencesProvider'

export default function App() {
  return (
    <PreferencesProvider>
      <AppHeader />
      <HomePage />
    </PreferencesProvider>
  )
}

import { AppHeader } from './components/AppHeader'
import { LevelGate } from './components/LevelGate'
import { HomePage } from './pages/HomePage'
import { PreferencesProvider } from './preferences/PreferencesProvider'

export default function App() {
  return (
    <PreferencesProvider>
      <AppHeader />
      <LevelGate>
        <HomePage />
      </LevelGate>
    </PreferencesProvider>
  )
}

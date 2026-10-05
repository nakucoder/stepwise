import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts for design D (never loaded from a CDN).
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/400-italic.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource/atkinson-hyperlegible-mono/400.css'
import '@fontsource/atkinson-hyperlegible-mono/700.css'
import App from './App'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

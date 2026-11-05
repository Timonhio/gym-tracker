import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Ask the browser not to evict our IndexedDB when storage is tight.
navigator.storage?.persist?.().catch(() => {})

// Offline support: the service worker caches the app; updates apply silently.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

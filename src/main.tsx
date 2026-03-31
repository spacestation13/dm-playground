import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './app/App'
import { printConsoleWarnings } from './utils/consoleWarnings'
import { registerOfflineServiceWorker } from './services/offlineServiceWorker'

printConsoleWarnings()
void registerOfflineServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

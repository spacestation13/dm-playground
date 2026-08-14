import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './app/App'
import { DiscordActivityProvider } from './discord/DiscordActivityProvider'
import { registerOfflineServiceWorker } from './services/offlineServiceWorker'
import { printConsoleWarnings } from './utils/consoleWarnings'

printConsoleWarnings()
void registerOfflineServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DiscordActivityProvider>
      <App />
    </DiscordActivityProvider>
  </StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { installCrashHandlers, paintCrash } from '@/app/crashScreen'
import '@/styles/index.css'

installCrashHandlers()

// App is imported dynamically, and that ordering is the whole point: static
// imports all run before any statement in this file, so a module that throws
// while loading — the environment validation in lib/firebase/config.ts, say —
// would blow up before there was anything installed to catch it. The result
// is a white screen with no way to find out why.
async function boot() {
  try {
    const { default: App } = await import('@/app/App')

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    )

    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  } catch (e) {
    paintCrash(e, 'boot')
  }
}

void boot()

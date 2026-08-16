// A blank page is the worst possible failure: it says nothing, and on a phone
// there is no console to open. Anything that stops the app from mounting gets
// painted into the DOM instead.
//
// UI copy is in Spanish like the rest of the interface; the technical detail
// underneath is verbatim on purpose — it is meant to be read or screenshotted.

const ROOT_ID = 'root'

function describe(error: unknown): string {
  if (error instanceof Error) {
    return [error.name + ': ' + error.message, error.stack ?? ''].join('\n\n')
  }
  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

function context(): string {
  return [
    `url: ${location.href}`,
    `ua: ${navigator.userAgent}`,
    `standalone: ${window.matchMedia('(display-mode: standalone)').matches}`,
    `online: ${navigator.onLine}`,
    `cookies: ${navigator.cookieEnabled}`,
  ].join('\n')
}

let painted = false

export function paintCrash(error: unknown, origin: string) {
  if (painted) return
  painted = true

  const root = document.getElementById(ROOT_ID)
  if (!root) return

  root.innerHTML = ''

  const wrap = document.createElement('main')
  wrap.style.cssText =
    'padding:24px;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#1c1a17;background:#faf9f7;min-height:100vh'

  const title = document.createElement('h1')
  title.textContent = 'La app no pudo arrancar'
  title.style.cssText = 'font:600 18px/1.3 system-ui,sans-serif;margin:0 0 8px'

  const hint = document.createElement('p')
  hint.textContent = 'Mandale esta pantalla a quien esté desarrollando.'
  hint.style.cssText = 'font:14px/1.5 system-ui,sans-serif;color:#6f6a63;margin:0 0 20px'

  const detail = document.createElement('pre')
  detail.textContent = [`origen: ${origin}`, '', describe(error), '', context()].join('\n')
  detail.style.cssText =
    'white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e4e1db;border-radius:8px;padding:12px;margin:0;user-select:text'

  wrap.append(title, hint, detail)
  root.append(wrap)
}

// Errors thrown after mount — a failed dynamic import, for instance — would
// otherwise only reach a console nobody can open on a phone.
export function installCrashHandlers() {
  window.addEventListener('error', (e) => {
    paintCrash(e.error ?? e.message, 'window.error')
  })
  window.addEventListener('unhandledrejection', (e) => {
    paintCrash(e.reason, 'unhandledrejection')
  })
}

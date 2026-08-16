import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { create } from 'zustand'
import { auth, googleProvider } from '@/lib/firebase/auth'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

// The user closed the popup or opened a second one. Their doing, not an error.
const USER_ABORTED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

// The environment cannot do popups at all. Installed iOS is the case that
// matters: there is no opener for the popup to answer to.
const POPUP_UNSUPPORTED = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

function codeOf(e: unknown): string {
  return (e as { code?: string }).code ?? ''
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  // Popup first, redirect only when the environment refuses.
  //
  // The obvious-looking alternative — redirect whenever we are running
  // standalone — is what broke sign-in in the installed app. On Android,
  // signInWithRedirect navigates the PWA out of its own window and the system
  // hands accounts.google.com to the browser or a Custom Tab. The sign-in then
  // completes over there, in a context the installed app never sees, so
  // reopening it shows the login screen again as if nothing happened.
  signIn: async () => {
    set({ error: null })
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const code = codeOf(e)
      if (USER_ABORTED.has(code)) return

      if (POPUP_UNSUPPORTED.has(code)) {
        // The page goes away here; the result is picked up on the way back.
        // For this to survive Safari on installed iOS, the auth domain has to
        // be the same origin serving the app — see .env.example.
        await signInWithRedirect(auth, googleProvider)
        return
      }

      set({ error: 'No se pudo entrar. Probá de nuevo.' })
      console.error(e)
    }
  },

  signOut: async () => {
    await signOut(auth)
  },
}))

// `loading` must not drop until BOTH of these have settled.
//
// onAuthStateChanged fires with null on a cold load, and it can fire before
// getRedirectResult has finished resolving a sign-in that is still in flight.
// Clearing loading on that first null sends ProtectedRoute to /signin while
// the real user is one tick away.
let authFired = false
let redirectSettled = false

function readyWhenBothSettled() {
  if (authFired && redirectSettled) useAuth.setState({ loading: false })
}

onAuthStateChanged(auth, (user) => {
  authFired = true
  useAuth.setState({ user })
  readyWhenBothSettled()
})

getRedirectResult(auth)
  .catch((e) => {
    // The user is picked up by onAuthStateChanged either way; this only makes
    // a failed redirect visible instead of silent.
    useAuth.setState({ error: 'No se pudo completar el ingreso.' })
    console.error(e)
  })
  .finally(() => {
    redirectSettled = true
    readyWhenBothSettled()
  })

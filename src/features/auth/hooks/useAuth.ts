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

// On installed iOS (standalone) the popup never comes back: there is no opener
// to answer to. Redirect is the only option there, and for the redirect to
// survive Safari, VITE_FIREBASE_AUTH_DOMAIN must be the same origin serving
// the app. See .env.example.
function needsRedirect(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Pre-standard iOS exposes installed mode here and nowhere else.
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async () => {
    set({ error: null })
    try {
      if (needsRedirect()) {
        await signInWithRedirect(auth, googleProvider)
        return // the page goes away; the result is picked up on the way back
      }
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
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

// A single observer for the whole app, mounted when the module is imported.
// onAuthStateChanged already resolves the session persisted from last time.
onAuthStateChanged(auth, (user) => {
  useAuth.setState({ user, loading: false })
})

// Only so a redirect failure does not go unnoticed: the user itself is picked
// up by onAuthStateChanged either way.
getRedirectResult(auth).catch((e) => {
  useAuth.setState({ error: 'No se pudo completar el ingreso.' })
  console.error(e)
})

import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { create } from 'zustand'
import { auth, proveedorGoogle } from '../../data/firebase'

interface EstadoAuth {
  usuario: User | null
  cargando: boolean
  error: string | null
  entrar: () => Promise<void>
  salir: () => Promise<void>
}

// En iOS instalado (standalone) la ventana emergente no vuelve nunca: no hay
// opener al que responderle. Ahi la unica via es el redirect, y para que el
// redirect sobreviva a Safari, VITE_FIREBASE_AUTH_DOMAIN tiene que ser el mismo
// origen que sirve la app. Ver README.
function necesitaRedirect(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS pre-PWA estandar expone el modo instalado aca y en ningun otro lado.
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export const useAuth = create<EstadoAuth>((set) => ({
  usuario: null,
  cargando: true,
  error: null,

  entrar: async () => {
    set({ error: null })
    try {
      if (necesitaRedirect()) {
        await signInWithRedirect(auth, proveedorGoogle)
        return // la pagina se va; el resultado se recoge al volver
      }
      await signInWithPopup(auth, proveedorGoogle)
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') {
        return
      }
      set({ error: 'No se pudo entrar. Probá de nuevo.' })
      console.error(e)
    }
  },

  salir: async () => {
    await signOut(auth)
  },
}))

// Un solo observador para toda la app, montado al importar el modulo.
// onAuthStateChanged ya resuelve la sesion persistida del arranque.
onAuthStateChanged(auth, (usuario) => {
  useAuth.setState({ usuario, cargando: false })
})

// Solo para que un fallo del redirect no quede invisible: el usuario lo
// recoge onAuthStateChanged igual.
getRedirectResult(auth).catch((e) => {
  useAuth.setState({ error: 'No se pudo completar el ingreso.' })
  console.error(e)
})

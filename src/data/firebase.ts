import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import { z } from 'zod'

// Fallar aca, al arrancar, es mucho mas barato que fallar dentro de un
// listener de Firestore con un mensaje que no dice nada.
const entorno = z
  .object({
    VITE_FIREBASE_API_KEY: z.string().min(1),
    VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
    VITE_FIREBASE_PROJECT_ID: z.string().min(1),
    VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
    VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
    VITE_FIREBASE_APP_ID: z.string().min(1),
  })
  .parse(import.meta.env)

const app = initializeApp({
  apiKey: entorno.VITE_FIREBASE_API_KEY,
  authDomain: entorno.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: entorno.VITE_FIREBASE_PROJECT_ID,
  storageBucket: entorno.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: entorno.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: entorno.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const proveedorGoogle = new GoogleAuthProvider()

// Persistencia local: el ropero y las sugerencias tienen que abrir sin red.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const storage = getStorage(app)
export const functions = getFunctions(app)

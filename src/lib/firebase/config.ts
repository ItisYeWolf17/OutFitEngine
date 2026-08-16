import { type FirebaseApp, initializeApp } from 'firebase/app'
import { z } from 'zod'

// Failing here, at startup, is far cheaper than failing inside a Firestore
// listener with a message that tells you nothing.
const env = z
  .object({
    VITE_FIREBASE_API_KEY: z.string().min(1),
    VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
    VITE_FIREBASE_PROJECT_ID: z.string().min(1),
    VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
    VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
    VITE_FIREBASE_APP_ID: z.string().min(1),
  })
  .parse(import.meta.env)

// These values are public by design: they ship in the bundle. What protects
// the data are the Firestore and Storage rules.
export const app: FirebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

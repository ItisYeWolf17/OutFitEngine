import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Phase 0: the cost guard only. `tagGarment` (phase 3) and `renderOutfit`
// (phase 5) get exported from here once they exist.
export { disableBilling } from './disableBilling'
